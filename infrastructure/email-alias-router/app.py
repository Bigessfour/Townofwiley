from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import asdict, dataclass
from email import policy
from email.message import EmailMessage
from email.parser import BytesParser
from email.utils import formataddr, getaddresses, parseaddr
from typing import Any, Iterable, Protocol
from urllib.parse import unquote_plus

logger = logging.getLogger("town.email_alias_router")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

# Runtime + static verify scripts refuse to ship these markers (empty-shell wrap).
# Keep these as bare needle bytes only — do not write filename=... assignments in
# production code paths (see scripts/verify-email-alias-mime-passthrough.py).
FORBIDDEN_WRAP_MARKERS = (
    b"original-message.eml",
    b"The original message is attached as original-message.eml",
)


@dataclass(frozen=True)
class AppConfig:
    alias_table: str
    alias_table_region: str
    forwarder_from: str
    alias_domain: str
    ses_send_region: str
    fallback_alias_address: str = ""


@dataclass(frozen=True)
class EmailAliasRecord:
    alias_address: str
    destination_address: str
    active: bool
    display_name: str = ""
    role_label: str = ""


@dataclass(frozen=True)
class RouteResult:
    forwarded: bool
    alias_address: str | None
    destination_address: str | None
    reason: str
    object_key: str | None = None
    original_bytes: int | None = None
    forward_bytes: int | None = None
    content_type: str | None = None
    attachment_count: int | None = None
    reforward: bool = False


class AliasDirectory(Protocol):
    def find_first_active_alias(
        self, candidate_addresses: Iterable[str]
    ) -> EmailAliasRecord | None: ...


class MailObjectStore(Protocol):
    def get_object_bytes(self, bucket_name: str, object_key: str) -> bytes: ...


class MailForwarder(Protocol):
    def forward(
        self,
        alias: EmailAliasRecord,
        raw_message: bytes,
        parsed_message: EmailMessage,
        *,
        reforward: bool = False,
    ) -> dict[str, Any]: ...


def json_response(status_code: int, body: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {"content-type": "application/json; charset=utf-8"},
        "body": json.dumps(body),
    }


def normalize_email_address(value: str | None) -> str:
    if not value:
        return ""

    return parseaddr(value)[1].strip().lower()


def unique_addresses(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []

    for value in values:
        if not value or value in seen:
            continue

        seen.add(value)
        ordered.append(value)

    return ordered


def extract_candidate_recipients(message: EmailMessage, alias_domain: str) -> list[str]:
    candidate_headers = [
        "X-Original-To",
        "Delivered-To",
        "Envelope-To",
        "To",
        "Cc",
        "Resent-To",
        "Resent-Cc",
    ]
    addresses: list[str] = []
    normalized_domain = alias_domain.lower().lstrip("@")

    for header_name in candidate_headers:
        header_values = message.get_all(header_name, [])
        for _, address in getaddresses(header_values):
            normalized_address = normalize_email_address(address)
            if normalized_address.endswith(f"@{normalized_domain}"):
                addresses.append(normalized_address)

    return unique_addresses(addresses)


# Headers that must not be forwarded as-is. Transport/auth headers break SES
# send or confuse clients; envelope headers are rewritten for the alias hop.
HEADERS_TO_STRIP = (
    "Return-Path",
    "Sender",
    "DKIM-Signature",
    "DomainKey-Signature",
    "Authentication-Results",
    "ARC-Authentication-Results",
    "ARC-Message-Signature",
    "ARC-Seal",
    "Received",
    "Received-SPF",
    "X-SES-Spam-Verdict",
    "X-SES-Virus-Verdict",
    "X-SES-RECEIPT",
    "X-SES-DKIM-SIGNATURE",
    "X-Amzn-Trace-Id",
    "X-Town-Alias",
    "X-Town-Role",
    "X-Town-Original-From",
    "X-Town-Original-To",
    # Avoid leaking original distribution lists / double delivery via Cc
    "Cc",
    "Bcc",
    "Resent-From",
    "Resent-To",
    "Resent-Cc",
    "Resent-Bcc",
    "Resent-Sender",
    "Resent-Date",
    "Resent-Message-ID",
)


def _set_single_header(message: EmailMessage, name: str, value: str) -> None:
    if message.get(name) is not None:
        message.replace_header(name, value)
    else:
        message[name] = value


def _strip_headers(message: EmailMessage, header_names: Iterable[str]) -> None:
    for header_name in header_names:
        while message.get(header_name) is not None:
            del message[header_name]


# Unquoted filename/name params with whitespace (illegal for SES on re-send).
_UNQUOTED_FILENAME_RAW_RE = re.compile(
    rb"(?im)^((?:Content-Disposition|Content-Type):[^\r\n]*\b(?:filename|name)=)"
    rb'(?!")([^"\r\n;]*[ \t][^"\r\n;]*)'
)


def quote_unquoted_filenames_in_raw(raw_message: bytes) -> bytes:
    """Quote unquoted ``filename=Name with spaces`` params in MIME headers.

    Must run on raw bytes before parsing: the email parser otherwise truncates
    unquoted filenames at the first space (``Diver logo...`` → ``Diver``).
    """

    def _repl(match: re.Match[bytes]) -> bytes:
        prefix = match.group(1)
        value = match.group(2).strip()
        value = value.replace(b"\\", b"\\\\").replace(b'"', b'\\"')
        return prefix + b'"' + value + b'"'

    return _UNQUOTED_FILENAME_RAW_RE.sub(_repl, raw_message)


def sanitize_mime_filenames(message: EmailMessage) -> None:
    """Normalize already-parsed disposition headers for SES SendRawEmail."""
    for part in message.walk():
        if part.get_content_maintype() == "multipart":
            continue
        filename = part.get_filename()
        if not filename:
            continue
        disposition = part.get_content_disposition() or "attachment"
        while part.get("Content-Disposition") is not None:
            del part["Content-Disposition"]
        part.add_header("Content-Disposition", disposition, filename=filename)


def assert_mime_passthrough_integrity(
    raw_message: bytes, forward_message: EmailMessage
) -> dict[str, Any]:
    """Fail closed if a future change reintroduces the empty-shell wrap pattern.

    Also verifies that attachment filenames and a sample of the original plain
    body still appear in the outbound MIME (Outlook-visible content).
    """
    forward_bytes = forward_message.as_bytes(policy=policy.SMTP)

    for marker in FORBIDDEN_WRAP_MARKERS:
        if marker in forward_bytes:
            raise RuntimeError(
                "MIME passthrough regression: forbidden wrap marker present "
                f"({marker!r}). Do not reintroduce original-message.eml shells."
            )

    original = BytesParser(policy=policy.default).parsebytes(raw_message)
    attachment_filenames: list[str] = []

    for part in original.iter_attachments():
        filename = part.get_filename()
        if not filename:
            continue
        attachment_filenames.append(filename)
        if filename.encode("utf-8", errors="ignore") not in forward_bytes:
            raise RuntimeError(
                f"MIME passthrough regression: attachment filename missing: {filename}"
            )

    plain_part = original.get_body(preferencelist=("plain",))
    if plain_part is not None:
        try:
            plain_text = plain_part.get_content()
        except Exception:  # noqa: BLE001 — integrity probe only
            plain_text = ""
        if isinstance(plain_text, str):
            tokens = [
                token
                for token in "".join(
                    ch if ch.isalnum() or ch.isspace() else " " for ch in plain_text
                ).split()
                if len(token) >= 8
            ][:4]
            if tokens and not any(
                token.encode("utf-8", errors="ignore") in forward_bytes
                for token in tokens
            ):
                raise RuntimeError(
                    "MIME passthrough regression: original plain body sample missing "
                    "from forwarded message."
                )

    # Empty-shell wrap notices are tiny. Transport-header stripping legitimately
    # shrinks SES/Gmail messages a lot, so do not compare full raw sizes.
    if len(raw_message) >= 1_500 and len(forward_bytes) < 280:
        raise RuntimeError(
            "MIME passthrough regression: forwarded message is unreasonably small "
            f"({len(forward_bytes)} bytes from {len(raw_message)}-byte original)."
        )

    return {
        "original_bytes": len(raw_message),
        "forward_bytes": len(forward_bytes),
        "content_type": forward_message.get_content_type(),
        "attachment_count": len(attachment_filenames),
        "attachment_filenames": attachment_filenames,
    }


def build_forward_email(
    alias: EmailAliasRecord,
    raw_message: bytes,
    parsed_message: EmailMessage,
    forwarder_from: str,
    *,
    reforward: bool = False,
) -> EmailMessage:
    """Rewrite envelope headers while preserving the original MIME body.

    Earlier versions wrapped the original as a nested ``message/rfc822``
    ``.eml`` attachment. Many clients (notably Outlook / new Outlook) show an
    empty body and hide or fail to open that nested message, so residents'
    text and file attachments appeared missing even though delivery succeeded.

    We re-parse the raw bytes and only rewrite delivery headers so the original
    multipart structure, HTML/text parts, and attachments stay intact.
    """
    del parsed_message  # kept in signature for callers; raw_message is authoritative

    # Quote illegal unquoted filenames before parse so names with spaces survive.
    raw_message = quote_unquoted_filenames_in_raw(raw_message)

    # SMTP policy keeps a faithful MIME tree for SES SendRawEmail.
    forward_message = BytesParser(policy=policy.SMTP).parsebytes(raw_message)

    original_subject = (
        str(forward_message.get("Subject", "")).strip() or alias.alias_address
    )
    original_sender = str(forward_message.get("From", "")).strip() or "unknown sender"
    original_to = str(forward_message.get("To", "")).strip()
    reply_to_address = normalize_email_address(
        forward_message.get("Reply-To")
    ) or normalize_email_address(
        original_sender,
    )

    _strip_headers(forward_message, HEADERS_TO_STRIP)
    _strip_headers(forward_message, ("X-Town-Reforward",))

    subject = f"Fwd: {original_subject}"
    if reforward:
        subject = f"[Town reforward] {subject}"

    _set_single_header(
        forward_message,
        "From",
        formataddr((alias.display_name or "Town of Wiley Mail", forwarder_from)),
    )
    _set_single_header(forward_message, "To", alias.destination_address)
    _set_single_header(forward_message, "Subject", subject)
    _set_single_header(forward_message, "X-Town-Alias", alias.alias_address)
    _set_single_header(forward_message, "X-Town-Original-From", original_sender)
    if original_to:
        _set_single_header(forward_message, "X-Town-Original-To", original_to)

    if alias.role_label:
        _set_single_header(forward_message, "X-Town-Role", alias.role_label)

    if reforward:
        _set_single_header(forward_message, "X-Town-Reforward", "true")

    if reply_to_address:
        _set_single_header(forward_message, "Reply-To", reply_to_address)
    else:
        _strip_headers(forward_message, ("Reply-To",))

    sanitize_mime_filenames(forward_message)
    assert_mime_passthrough_integrity(raw_message, forward_message)
    return forward_message


class DynamoDbAliasDirectory:
    def __init__(self, table_name: str, dynamodb_client: Any) -> None:
        self._table_name = table_name
        self._dynamodb_client = dynamodb_client

    def find_first_active_alias(
        self, candidate_addresses: Iterable[str]
    ) -> EmailAliasRecord | None:
        for candidate_address in candidate_addresses:
            response = self._dynamodb_client.scan(
                TableName=self._table_name,
                FilterExpression="aliasAddress = :aliasAddress",
                ExpressionAttributeValues={":aliasAddress": {"S": candidate_address}},
            )
            items = response.get("Items") or []

            for item in items:
                record = self._map_item(item)
                if record.active:
                    return record

        return None

    def _map_item(self, item: dict[str, Any]) -> EmailAliasRecord:
        return EmailAliasRecord(
            alias_address=item.get("aliasAddress", {}).get("S", "").strip().lower(),
            destination_address=item.get("destinationAddress", {})
            .get("S", "")
            .strip()
            .lower(),
            active=bool(item.get("active", {}).get("BOOL", False)),
            display_name=item.get("displayName", {}).get("S", "").strip(),
            role_label=item.get("roleLabel", {}).get("S", "").strip(),
        )


class S3MailObjectStore:
    def __init__(self, s3_client: Any) -> None:
        self._s3_client = s3_client

    def get_object_bytes(self, bucket_name: str, object_key: str) -> bytes:
        response = self._s3_client.get_object(Bucket=bucket_name, Key=object_key)
        return response["Body"].read()


class SesMailForwarder:
    def __init__(self, forwarder_from: str, ses_client: Any) -> None:
        self._forwarder_from = forwarder_from
        self._ses_client = ses_client

    def forward(
        self,
        alias: EmailAliasRecord,
        raw_message: bytes,
        parsed_message: EmailMessage,
        *,
        reforward: bool = False,
    ) -> dict[str, Any]:
        forward_message = build_forward_email(
            alias,
            raw_message,
            parsed_message,
            self._forwarder_from,
            reforward=reforward,
        )
        metrics = assert_mime_passthrough_integrity(raw_message, forward_message)
        self._ses_client.send_raw_email(
            Source=self._forwarder_from,
            Destinations=[alias.destination_address],
            RawMessage={"Data": forward_message.as_bytes(policy=policy.SMTP)},
        )
        return metrics


class EmailAliasRouter:
    def __init__(
        self,
        config: AppConfig,
        alias_directory: AliasDirectory,
        object_store: MailObjectStore,
        mail_forwarder: MailForwarder,
    ) -> None:
        self._config = config
        self._alias_directory = alias_directory
        self._object_store = object_store
        self._mail_forwarder = mail_forwarder

    def handle(self, event: dict[str, Any]) -> dict[str, Any]:
        if event.get("requestContext", {}).get("http", {}).get("method") == "GET":
            return json_response(
                200,
                {
                    "ok": True,
                    "service": "town-email-alias-router",
                    "aliasDomain": self._config.alias_domain,
                    "mimeMode": "passthrough",
                },
            )

        reforward = bool(event.get("reforward"))
        results: list[RouteResult] = []

        for record in event.get("Records", []):
            if record.get("eventSource") != "aws:s3":
                continue

            bucket_name = record["s3"]["bucket"]["name"]
            object_key = unquote_plus(record["s3"]["object"]["key"])

            if object_key.rstrip("/").endswith("AMAZON_SES_SETUP_NOTIFICATION"):
                results.append(
                    RouteResult(
                        forwarded=False,
                        alias_address=None,
                        destination_address=None,
                        reason="skipped_ses_setup_notification",
                        object_key=object_key,
                        reforward=reforward,
                    )
                )
                continue

            raw_message = self._object_store.get_object_bytes(bucket_name, object_key)
            results.append(
                self.route_raw_message(
                    raw_message, object_key=object_key, reforward=reforward
                )
            )

        response = {
            "processed": len(results),
            "forwarded": sum(1 for result in results if result.forwarded),
            "reforward": reforward,
            "results": [asdict(result) for result in results],
        }
        logger.info("email_alias_router.batch %s", json.dumps(response, default=str))
        return response

    def route_raw_message(
        self,
        raw_message: bytes,
        *,
        object_key: str | None = None,
        reforward: bool = False,
    ) -> RouteResult:
        parsed_message = BytesParser(policy=policy.default).parsebytes(raw_message)
        candidate_recipients = extract_candidate_recipients(
            parsed_message, self._config.alias_domain
        )
        alias_record = self._resolve_active_alias(candidate_recipients)

        if not alias_record:
            result = RouteResult(
                forwarded=False,
                alias_address=None,
                destination_address=None,
                reason="no_active_alias_match",
                object_key=object_key,
                original_bytes=len(raw_message),
                reforward=reforward,
            )
            logger.warning("email_alias_router.skip %s", json.dumps(asdict(result)))
            return result

        metrics = self._mail_forwarder.forward(
            alias_record, raw_message, parsed_message, reforward=reforward
        )

        result = RouteResult(
            forwarded=True,
            alias_address=alias_record.alias_address,
            destination_address=alias_record.destination_address,
            reason="reforwarded" if reforward else "forwarded",
            object_key=object_key,
            original_bytes=int(metrics.get("original_bytes") or len(raw_message)),
            forward_bytes=metrics.get("forward_bytes"),
            content_type=metrics.get("content_type"),
            attachment_count=metrics.get("attachment_count"),
            reforward=reforward,
        )
        logger.info("email_alias_router.forward %s", json.dumps(asdict(result)))
        return result

    def _resolve_active_alias(
        self, candidate_recipients: list[str]
    ) -> EmailAliasRecord | None:
        alias_record = self._alias_directory.find_first_active_alias(
            candidate_recipients
        )
        if alias_record:
            return alias_record

        fallback_address = normalize_email_address(self._config.fallback_alias_address)
        if not fallback_address:
            return None

        return self._alias_directory.find_first_active_alias([fallback_address])


def build_runtime_router() -> EmailAliasRouter:
    config = AppConfig(
        alias_table=read_required_env("EMAIL_ALIAS_TABLE"),
        alias_table_region=os.environ.get("EMAIL_ALIAS_TABLE_REGION", "").strip(),
        forwarder_from=read_required_env("FORWARDER_FROM"),
        alias_domain=os.environ.get("ALIAS_DOMAIN", "townofwiley.gov").strip().lower()
        or "townofwiley.gov",
        ses_send_region=os.environ.get("SES_SEND_REGION", "").strip(),
        fallback_alias_address=os.environ.get("FALLBACK_ALIAS_ADDRESS", "").strip(),
    )

    boto3 = __import__("boto3")

    dynamodb_kwargs: dict[str, str] = {}
    ses_kwargs: dict[str, str] = {}

    if config.alias_table_region:
        dynamodb_kwargs["region_name"] = config.alias_table_region

    if config.ses_send_region:
        ses_kwargs["region_name"] = config.ses_send_region

    return EmailAliasRouter(
        config=config,
        alias_directory=DynamoDbAliasDirectory(
            table_name=config.alias_table,
            dynamodb_client=boto3.client("dynamodb", **dynamodb_kwargs),
        ),
        object_store=S3MailObjectStore(boto3.client("s3")),
        mail_forwarder=SesMailForwarder(
            config.forwarder_from, boto3.client("ses", **ses_kwargs)
        ),
    )


def read_required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if value:
        return value

    raise RuntimeError(f"Missing required environment variable: {name}")


def handler(event: dict[str, Any], _context: Any = None) -> dict[str, Any]:
    return build_runtime_router().handle(event)
