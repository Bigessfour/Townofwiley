#!/usr/bin/env python3
"""Town of Wiley Community Calendar backend (Function URL + DynamoDB + mail)."""

from __future__ import annotations

import base64
import json
import logging
import os
import re
import smtplib
import ssl
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from email.message import EmailMessage
from email.utils import formataddr, parseaddr
from html import escape
from typing import Any, Protocol
from urllib.parse import parse_qs, urlencode

PENDING = "pending"
APPROVED = "approved"
REJECTED = "rejected"
EXPIRED = "expired"

CATEGORIES = frozenset(
    {
        "yard_sale",
        "bake_sale",
        "car_wash",
        "school",
        "fundraiser",
        "gathering",
        "festival",
        "sports",
        "other",
    }
)
LANGUAGES = frozenset({"en", "es"})
TOKEN_TTL_DAYS = 7
DEFAULT_CLERK_EMAIL = "clerk@townofwiley.gov"
DEFAULT_SENDER_NAME = "Town of Wiley"
PUBLIC_CALENDAR_URL = "https://www.townofwiley.gov/meetings#community"
ADMIN_STATUSES = frozenset({PENDING, APPROVED, REJECTED, EXPIRED})
# Best-effort per-IP throttle for public POST /events (resets on Lambda cold start).
SUBMIT_RATE_LIMIT = int(os.environ.get("SUBMIT_RATE_LIMIT", "10"))
SUBMIT_RATE_WINDOW_SECONDS = int(os.environ.get("SUBMIT_RATE_WINDOW_SECONDS", "900"))

ALLOWED_ORIGINS = frozenset(
    {
        "https://townofwiley.gov",
        "https://www.townofwiley.gov",
        "https://staging.townofwiley.gov",
        "http://localhost:4200",
        "http://localhost:4300",
        "http://127.0.0.1:4200",
        "http://127.0.0.1:4300",
    }
)
CANONICAL_ORIGIN_BY_LOWER = {origin.lower(): origin for origin in ALLOWED_ORIGINS}
DEFAULT_CORS_FALLBACK_ORIGIN = "https://townofwiley.gov"

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_DIGIT_PATTERN = re.compile(r"\D+")

LOGGER = logging.getLogger(__name__)
LOGGER.setLevel(logging.INFO)


@dataclass(frozen=True)
class AppConfig:
    events_table: str
    sender_email: str
    sender_name: str
    clerk_email: str
    public_api_base_url: str


class EventStore(Protocol):
    def put_event(self, item: dict[str, Any]) -> None: ...

    def get_event(self, event_id: str) -> dict[str, Any] | None: ...

    def put_token_lookup(self, token: str, event_id: str, action: str) -> None: ...

    def get_token_lookup(self, token: str) -> dict[str, Any] | None: ...

    def delete_token_lookup(self, token: str) -> None: ...

    def update_event(
        self, event_id: str, updates: dict[str, Any]
    ) -> dict[str, Any] | None: ...

    def delete_event(self, event_id: str) -> bool: ...

    def list_public_events(self, category: str = "") -> list[dict[str, Any]]: ...

    def list_admin_events(self, status: str = "") -> list[dict[str, Any]]: ...


class MailGateway(Protocol):
    def send_email(
        self,
        to_address: str,
        subject: str,
        body_text: str,
        *,
        reply_to: str = "",
        from_name: str = "",
    ) -> None: ...


class StaffAuthenticator(Protocol):
    def is_staff(self, request_event: dict[str, Any]) -> bool: ...


class CognitoStaffAuthenticator:
    """Verify Cognito JWT (JWKS) and require Staff group."""

    def is_staff(self, request_event: dict[str, Any]) -> bool:
        auth = request_header(request_event, "Authorization")
        if not auth.lower().startswith("bearer "):
            return False
        token = auth[7:].strip()
        try:
            from jwt_utils import assert_staff_token
        except ImportError:
            return False
        return assert_staff_token(token)


class AllowBearerStaffAuthenticator:
    """Test double: accepts Authorization: Bearer staff-ok."""

    def is_staff(self, request_event: dict[str, Any]) -> bool:
        auth = request_header(request_event, "Authorization")
        return auth == "Bearer staff-ok"


class InMemoryRateLimiter:
    """Sliding-window counter keyed by string (typically source IP)."""

    def __init__(self, *, max_requests: int, window_seconds: int) -> None:
        self._max = max(1, max_requests)
        self._window = max(1, window_seconds)
        self._hits: dict[str, list[float]] = {}

    def allow(self, key: str) -> bool:
        now = datetime.now(UTC).timestamp()
        cutoff = now - self._window
        bucket = [t for t in self._hits.get(key, []) if t >= cutoff]
        if len(bucket) >= self._max:
            self._hits[key] = bucket
            return False
        bucket.append(now)
        self._hits[key] = bucket
        return True


class MemoryEventStore:
    def __init__(self) -> None:
        self._events: dict[str, dict[str, Any]] = {}
        self._tokens: dict[str, dict[str, Any]] = {}

    def put_event(self, item: dict[str, Any]) -> None:
        self._events[item["eventId"]] = dict(item)

    def get_event(self, event_id: str) -> dict[str, Any] | None:
        item = self._events.get(event_id)
        return dict(item) if item else None

    def put_token_lookup(self, token: str, event_id: str, action: str) -> None:
        self._tokens[token] = {"eventId": event_id, "action": action}

    def get_token_lookup(self, token: str) -> dict[str, Any] | None:
        item = self._tokens.get(token)
        return dict(item) if item else None

    def delete_token_lookup(self, token: str) -> None:
        self._tokens.pop(token, None)

    def update_event(
        self, event_id: str, updates: dict[str, Any]
    ) -> dict[str, Any] | None:
        item = self._events.get(event_id)
        if not item:
            return None
        item.update(updates)
        self._events[event_id] = item
        return dict(item)

    def delete_event(self, event_id: str) -> bool:
        if event_id not in self._events:
            return False
        del self._events[event_id]
        return True

    def list_public_events(self, category: str = "") -> list[dict[str, Any]]:
        now = utc_now_iso()
        results: list[dict[str, Any]] = []
        for item in self._events.values():
            if item.get("status") != APPROVED:
                continue
            if str(item.get("endDateTime") or "") <= now:
                continue
            if category and item.get("category") != category:
                continue
            results.append(public_event_view(item))
        results.sort(key=lambda row: str(row.get("startDateTime") or ""))
        return results

    def list_admin_events(self, status: str = "") -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        for item in self._events.values():
            event_id = str(item.get("eventId") or "")
            if event_id.startswith("TOKEN#"):
                continue
            if status and item.get("status") != status:
                continue
            results.append(admin_event_view(item))
        results.sort(key=lambda row: str(row.get("createdAt") or ""), reverse=True)
        return results


class MemoryMailGateway:
    def __init__(self) -> None:
        self.sent: list[dict[str, str]] = []

    def send_email(
        self,
        to_address: str,
        subject: str,
        body_text: str,
        *,
        reply_to: str = "",
        from_name: str = "",
    ) -> None:
        self.sent.append(
            {
                "to": to_address,
                "subject": subject,
                "body": body_text,
                "reply_to": reply_to.strip(),
                "from_name": from_name.strip(),
            }
        )


class DynamoEventStore:
    def __init__(self, table_name: str, dynamodb_resource: Any | None = None) -> None:
        if dynamodb_resource is None:
            import boto3

            dynamodb_resource = boto3.resource("dynamodb")
        self._table = dynamodb_resource.Table(table_name)

    def put_event(self, item: dict[str, Any]) -> None:
        self._table.put_item(Item=item)

    def get_event(self, event_id: str) -> dict[str, Any] | None:
        response = self._table.get_item(Key={"eventId": event_id})
        item = response.get("Item")
        return dict(item) if item else None

    def put_token_lookup(self, token: str, event_id: str, action: str) -> None:
        self._table.put_item(
            Item={
                "eventId": f"TOKEN#{token}",
                "lookupEventId": event_id,
                "action": action,
                "itemType": "token",
            }
        )

    def get_token_lookup(self, token: str) -> dict[str, Any] | None:
        response = self._table.get_item(Key={"eventId": f"TOKEN#{token}"})
        item = response.get("Item")
        if not item:
            return None
        return {
            "eventId": str(item.get("lookupEventId") or ""),
            "action": str(item.get("action") or ""),
        }

    def delete_token_lookup(self, token: str) -> None:
        self._table.delete_item(Key={"eventId": f"TOKEN#{token}"})

    def update_event(
        self, event_id: str, updates: dict[str, Any]
    ) -> dict[str, Any] | None:
        if not updates:
            return self.get_event(event_id)
        expression_names: dict[str, str] = {}
        expression_values: dict[str, Any] = {}
        set_parts: list[str] = []
        for index, (key, value) in enumerate(updates.items()):
            name_key = f"#k{index}"
            value_key = f":v{index}"
            expression_names[name_key] = key
            expression_values[value_key] = value
            set_parts.append(f"{name_key} = {value_key}")
        response = self._table.update_item(
            Key={"eventId": event_id},
            UpdateExpression="SET " + ", ".join(set_parts),
            ExpressionAttributeNames=expression_names,
            ExpressionAttributeValues=expression_values,
            ReturnValues="ALL_NEW",
        )
        item = response.get("Attributes")
        return dict(item) if item else None

    def delete_event(self, event_id: str) -> bool:
        existing = self.get_event(event_id)
        if not existing:
            return False
        self._table.delete_item(Key={"eventId": event_id})
        return True

    def list_admin_events(self, status: str = "") -> list[dict[str, Any]]:
        response = self._table.scan()
        items = list(response.get("Items") or [])
        while response.get("LastEvaluatedKey"):
            response = self._table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
            items.extend(response.get("Items") or [])
        views: list[dict[str, Any]] = []
        for item in items:
            event_id = str(item.get("eventId") or "")
            if event_id.startswith("TOKEN#"):
                continue
            if item.get("itemType") == "token":
                continue
            if status and item.get("status") != status:
                continue
            views.append(admin_event_view(item))
        views.sort(key=lambda row: str(row.get("createdAt") or ""), reverse=True)
        return views

    def list_public_events(self, category: str = "") -> list[dict[str, Any]]:
        now = utc_now_iso()
        # Prefer GSI when present; fall back to scan for local/dev tables without GSI.
        try:
            kwargs: dict[str, Any] = {
                "IndexName": "statusEndIndex",
                "KeyConditionExpression": "#status = :status AND endDateTime > :now",
                "ExpressionAttributeNames": {"#status": "status"},
                "ExpressionAttributeValues": {":status": APPROVED, ":now": now},
            }
            if category:
                kwargs["FilterExpression"] = "category = :category"
                kwargs["ExpressionAttributeValues"][":category"] = category
            response = self._table.query(**kwargs)
            items = response.get("Items") or []
            while response.get("LastEvaluatedKey"):
                kwargs["ExclusiveStartKey"] = response["LastEvaluatedKey"]
                response = self._table.query(**kwargs)
                items.extend(response.get("Items") or [])
        except Exception:
            LOGGER.exception("statusEndIndex query failed; falling back to scan")
            response = self._table.scan()
            items = [
                item
                for item in (response.get("Items") or [])
                if item.get("status") == APPROVED
                and str(item.get("endDateTime") or "") > now
                and (not category or item.get("category") == category)
                and not str(item.get("eventId") or "").startswith("TOKEN#")
            ]
            while response.get("LastEvaluatedKey"):
                response = self._table.scan(
                    ExclusiveStartKey=response["LastEvaluatedKey"]
                )
                items.extend(
                    [
                        item
                        for item in (response.get("Items") or [])
                        if item.get("status") == APPROVED
                        and str(item.get("endDateTime") or "") > now
                        and (not category or item.get("category") == category)
                        and not str(item.get("eventId") or "").startswith("TOKEN#")
                    ]
                )

        views = [public_event_view(item) for item in items]
        views.sort(key=lambda row: str(row.get("startDateTime") or ""))
        return views


class AwsSesMailGateway:
    def __init__(
        self, sender_email: str, sender_name: str, ses_client: Any | None = None
    ) -> None:
        self._sender_email = sender_email.strip()
        self._sender_name = sender_name.strip() or DEFAULT_SENDER_NAME
        self._ses_client = ses_client

    def send_email(
        self,
        to_address: str,
        subject: str,
        body_text: str,
        *,
        reply_to: str = "",
        from_name: str = "",
    ) -> None:
        if not self._sender_email:
            LOGGER.warning("SENDER_EMAIL unset; skipping email to %s", to_address)
            return
        if self._ses_client is None:
            import boto3

            self._ses_client = boto3.client("ses")
        display = sanitize_from_display_name(
            from_name or self._sender_name, fallback=DEFAULT_SENDER_NAME
        )
        source = formataddr((display, self._sender_email))
        try:
            kwargs: dict[str, Any] = {
                "Source": source,
                "Destination": {"ToAddresses": [to_address]},
                "Message": {
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": {"Text": {"Data": body_text, "Charset": "UTF-8"}},
                },
            }
            reply = reply_to.strip()
            if reply and EMAIL_PATTERN.match(reply):
                kwargs["ReplyToAddresses"] = [reply]
            self._ses_client.send_email(**kwargs)
        except Exception as error:
            # Never fail the resident/admin mutation because SES is misconfigured.
            # Submissions still land in DynamoDB for clerk review in /admin.
            LOGGER.warning(
                "SES send failed (to=%s subject=%s): %s",
                to_address,
                subject,
                error,
            )


def sanitize_from_display_name(name: str, *, fallback: str = DEFAULT_SENDER_NAME) -> str:
    """Normalize resident-supplied display names for RFC5322 From headers."""
    cleaned = " ".join(str(name or "").replace("\r", " ").replace("\n", " ").split())
    cleaned = cleaned.replace("<", "").replace(">", "").replace('"', "")
    cleaned = cleaned.strip()[:120]
    return cleaned or fallback


@dataclass(frozen=True)
class SmtpSettings:
    host: str
    port: int
    username: str
    password: str
    sender_email: str
    sender_name: str
    use_ssl: bool = False


class SmtpMailGateway:
    """Send mail via Synology MailPlus (or any SMTP AUTH server)."""

    def __init__(self, settings: SmtpSettings) -> None:
        self._settings = settings

    def send_email(
        self,
        to_address: str,
        subject: str,
        body_text: str,
        *,
        reply_to: str = "",
        from_name: str = "",
    ) -> None:
        settings = self._settings
        if not settings.sender_email:
            LOGGER.warning("SENDER_EMAIL unset; skipping email to %s", to_address)
            return
        if not settings.host:
            LOGGER.warning("SMTP_HOST unset; skipping email to %s", to_address)
            return
        if not settings.username or not settings.password:
            LOGGER.warning("SMTP credentials unset; skipping email to %s", to_address)
            return

        display = sanitize_from_display_name(
            from_name or settings.sender_name, fallback=DEFAULT_SENDER_NAME
        )
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = formataddr((display, settings.sender_email))
        message["To"] = to_address
        reply = reply_to.strip()
        if reply and EMAIL_PATTERN.match(reply):
            message["Reply-To"] = reply
        message.set_content(body_text)

        try:
            context = ssl.create_default_context()
            if settings.use_ssl or settings.port == 465:
                with smtplib.SMTP_SSL(
                    settings.host, settings.port, timeout=30, context=context
                ) as smtp:
                    smtp.login(settings.username, settings.password)
                    smtp.send_message(message)
            else:
                with smtplib.SMTP(settings.host, settings.port, timeout=30) as smtp:
                    smtp.ehlo()
                    smtp.starttls(context=context)
                    smtp.ehlo()
                    smtp.login(settings.username, settings.password)
                    smtp.send_message(message)
        except Exception as error:
            # Never fail the resident/admin mutation because SMTP is misconfigured.
            LOGGER.warning(
                "SMTP send failed (host=%s to=%s subject=%s): %s",
                settings.host,
                to_address,
                subject,
                error,
            )


def _truthy_env(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _load_secret_payload(secret_id: str) -> dict[str, Any]:
    import boto3

    client = boto3.client("secretsmanager")
    response = client.get_secret_value(SecretId=secret_id)
    secret_string = response.get("SecretString") or ""
    if not secret_string:
        return {}
    try:
        payload = json.loads(secret_string)
    except json.JSONDecodeError:
        return {"password": secret_string}
    return payload if isinstance(payload, dict) else {"password": secret_string}


def read_smtp_settings(config: AppConfig) -> SmtpSettings | None:
    """Build SMTP settings from env + optional Secrets Manager JSON."""
    secret_id = os.environ.get("SMTP_SECRET_ID", "").strip()
    secret: dict[str, Any] = {}
    if secret_id:
        try:
            secret = _load_secret_payload(secret_id)
        except Exception as error:
            LOGGER.warning("Failed to load SMTP secret %s: %s", secret_id, error)

    host = (
        os.environ.get("SMTP_HOST", "").strip()
        or str(secret.get("host") or secret.get("Host") or "").strip()
        or "mail.townofwiley.gov"
    )
    port_raw = os.environ.get("SMTP_PORT", "").strip() or str(
        secret.get("port") or secret.get("Port") or "587"
    )
    try:
        port = int(port_raw)
    except ValueError:
        port = 587
    username = (
        os.environ.get("SMTP_USER", "").strip()
        or str(secret.get("username") or secret.get("user") or "").strip()
    )
    password = (
        os.environ.get("SMTP_PASSWORD", "").strip()
        or str(secret.get("password") or secret.get("Password") or "").strip()
    )
    sender_email = (
        str(secret.get("senderEmail") or secret.get("sender_email") or "").strip()
        or config.sender_email
    )
    sender_name = (
        str(secret.get("senderName") or secret.get("sender_name") or "").strip()
        or config.sender_name
    )
    use_ssl = _truthy_env("SMTP_USE_SSL", default=port == 465)
    if secret.get("useSsl") is True or str(secret.get("useSsl") or "").lower() in {
        "1",
        "true",
        "yes",
    }:
        use_ssl = True

    if not username or not password:
        return None
    return SmtpSettings(
        host=host,
        port=port,
        username=username,
        password=password,
        sender_email=sender_email,
        sender_name=sender_name,
        use_ssl=use_ssl,
    )


def resolve_mail_transport() -> str:
    """Return 'smtp' or 'ses'. Defaults to smtp when SMTP_HOST / SMTP_SECRET_ID set."""
    explicit = os.environ.get("MAIL_TRANSPORT", "").strip().lower()
    if explicit in {"smtp", "ses"}:
        return explicit
    if (
        os.environ.get("SMTP_HOST", "").strip()
        or os.environ.get("SMTP_SECRET_ID", "").strip()
    ):
        return "smtp"
    return "ses"


def build_mail_gateway(config: AppConfig) -> MailGateway:
    transport = resolve_mail_transport()
    if transport == "smtp":
        settings = read_smtp_settings(config)
        if settings is None:
            LOGGER.warning(
                "MAIL_TRANSPORT=smtp but SMTP credentials missing; "
                "emails will be skipped until SMTP_SECRET_ID / SMTP_USER+PASSWORD set"
            )
            try:
                fallback_port = int(os.environ.get("SMTP_PORT", "587"))
            except ValueError:
                fallback_port = 587
            return SmtpMailGateway(
                SmtpSettings(
                    host=os.environ.get("SMTP_HOST", "mail.townofwiley.gov").strip()
                    or "mail.townofwiley.gov",
                    port=fallback_port,
                    username="",
                    password="",
                    sender_email=config.sender_email,
                    sender_name=config.sender_name,
                )
            )
        return SmtpMailGateway(settings)
    return AwsSesMailGateway(config.sender_email, config.sender_name)


class CommunityCalendarBackend:
    def __init__(
        self,
        config: AppConfig,
        store: EventStore,
        mail: MailGateway,
        authenticator: StaffAuthenticator | None = None,
        submit_rate_limiter: InMemoryRateLimiter | None = None,
    ) -> None:
        self._config = config
        self._store = store
        self._mail = mail
        self._auth = authenticator or CognitoStaffAuthenticator()
        self._submit_rate_limiter = submit_rate_limiter or InMemoryRateLimiter(
            max_requests=SUBMIT_RATE_LIMIT,
            window_seconds=SUBMIT_RATE_WINDOW_SECONDS,
        )

    def handle(self, event: dict[str, Any]) -> dict[str, Any]:
        method = request_method(event)
        path = request_path(event)

        if method == "OPTIONS":
            return {
                "statusCode": 204,
                "headers": build_cors_headers(event),
                "body": "",
            }

        if method == "GET" and path.endswith("/health"):
            return json_response(
                200,
                {
                    "service": "townofwiley-community-calendar",
                    "categories": sorted(CATEGORIES),
                },
                request_event=event,
            )

        if path.endswith("/admin/events") or "/admin/events/" in path:
            return self._handle_admin(event, method=method, path=path)

        if method == "POST" and path.endswith("/events"):
            return self._create_event(event)

        if method == "GET" and path.endswith("/events"):
            return self._list_events(event)

        # Email links: GET shows a confirm page (no side effects); POST applies the decision.
        if path.endswith("/approve"):
            if method == "GET":
                return self._confirm_decide(event, action="approve")
            if method == "POST":
                return self._decide(event, action="approve")
        if path.endswith("/reject"):
            if method == "GET":
                return self._confirm_decide(event, action="reject")
            if method == "POST":
                return self._decide(event, action="reject")

        return json_response(404, {"error": "Route not found."}, request_event=event)

    def _require_staff(self, event: dict[str, Any]) -> dict[str, Any] | None:
        if self._auth.is_staff(event):
            return None
        return json_response(
            401, {"error": "Staff authentication required."}, request_event=event
        )

    def _handle_admin(
        self, event: dict[str, Any], *, method: str, path: str
    ) -> dict[str, Any]:
        unauthorized = self._require_staff(event)
        if unauthorized:
            return unauthorized

        event_id, action = parse_admin_path(path)
        if (
            event_id is None
            and action is None
            and path.rstrip("/").endswith("/admin/events")
        ):
            if method == "GET":
                return self._admin_list_events(event)
            if method == "POST":
                return self._admin_create_event(event)
            return json_response(
                405, {"error": "Method not allowed."}, request_event=event
            )

        if event_id and action == "approve" and method == "POST":
            return self._admin_set_status(event, event_id, APPROVED)
        if event_id and action == "reject" and method == "POST":
            return self._admin_set_status(event, event_id, REJECTED)
        if event_id and action is None and method == "PUT":
            return self._admin_update_event(event, event_id)
        if event_id and action is None and method == "DELETE":
            return self._admin_delete_event(event, event_id)

        return json_response(404, {"error": "Route not found."}, request_event=event)

    def _admin_list_events(self, event: dict[str, Any]) -> dict[str, Any]:
        status = query_param(event, "status")
        if status and status not in ADMIN_STATUSES:
            return json_response(
                400, {"error": "Invalid status filter."}, request_event=event
            )
        events = self._store.list_admin_events(status=status)
        return json_response(200, {"events": events}, request_event=event)

    def _admin_create_event(self, event: dict[str, Any]) -> dict[str, Any]:
        try:
            payload = parse_json_body(event)
        except ValueError as error:
            return json_response(400, {"error": str(error)}, request_event=event)

        try:
            item = validate_submission(payload)
        except ValueError as error:
            return json_response(400, {"error": str(error)}, request_event=event)

        status = str(payload.get("status") or PENDING).strip().lower()
        if status not in ADMIN_STATUSES:
            return json_response(400, {"error": "Invalid status."}, request_event=event)

        now = utc_now_iso()
        item.update(
            {
                "eventId": str(uuid.uuid4()),
                "status": status,
                "approveToken": "",
                "rejectToken": "",
                "tokenExpiresAt": "",
                "createdAt": now,
                "updatedAt": now,
            }
        )
        if status == APPROVED:
            item["approvedAt"] = now
        if status == REJECTED:
            item["rejectedAt"] = now

        self._store.put_event(item)
        return json_response(
            200, {"ok": True, "event": admin_event_view(item)}, request_event=event
        )

    def _admin_update_event(
        self, event: dict[str, Any], event_id: str
    ) -> dict[str, Any]:
        existing = self._store.get_event(event_id)
        if not existing or str(existing.get("eventId") or "").startswith("TOKEN#"):
            return json_response(
                404, {"error": "Event not found."}, request_event=event
            )

        try:
            payload = parse_json_body(event)
        except ValueError as error:
            return json_response(400, {"error": str(error)}, request_event=event)

        merged = {**existing, **payload, "eventId": event_id}
        try:
            validated = validate_submission(merged)
        except ValueError as error:
            return json_response(400, {"error": str(error)}, request_event=event)

        updates: dict[str, Any] = {**validated, "updatedAt": utc_now_iso()}
        previous_status = str(existing.get("status") or "")
        if "status" in payload:
            status = str(payload.get("status") or "").strip().lower()
            if status not in ADMIN_STATUSES:
                return json_response(
                    400, {"error": "Invalid status."}, request_event=event
                )
            updates["status"] = status
            if status == APPROVED and not existing.get("approvedAt"):
                updates["approvedAt"] = utc_now_iso()
            if status == REJECTED and not existing.get("rejectedAt"):
                updates["rejectedAt"] = utc_now_iso()

        updated = self._store.update_event(event_id, updates)
        merged_view = updated or {**existing, **updates}
        if updates.get("status") == APPROVED and previous_status != APPROVED:
            self._notify_submitter_approved(merged_view)
        return json_response(
            200,
            {"ok": True, "event": admin_event_view(merged_view)},
            request_event=event,
        )

    def _admin_delete_event(
        self, event: dict[str, Any], event_id: str
    ) -> dict[str, Any]:
        existing = self._store.get_event(event_id)
        if not existing or str(existing.get("eventId") or "").startswith("TOKEN#"):
            return json_response(
                404, {"error": "Event not found."}, request_event=event
            )
        self._invalidate_tokens(existing)
        deleted = self._store.delete_event(event_id)
        if not deleted:
            return json_response(
                404, {"error": "Event not found."}, request_event=event
            )
        return json_response(
            200, {"ok": True, "eventId": event_id}, request_event=event
        )

    def _admin_set_status(
        self, event: dict[str, Any], event_id: str, status: str
    ) -> dict[str, Any]:
        existing = self._store.get_event(event_id)
        if not existing or str(existing.get("eventId") or "").startswith("TOKEN#"):
            return json_response(
                404, {"error": "Event not found."}, request_event=event
            )

        now = utc_now_iso()
        updates: dict[str, Any] = {
            "status": status,
            "updatedAt": now,
            "approveToken": "",
            "rejectToken": "",
        }
        if status == APPROVED:
            updates["approvedAt"] = now
        if status == REJECTED:
            updates["rejectedAt"] = now

        updated = self._store.update_event(event_id, updates)
        self._invalidate_tokens(existing)

        if status == APPROVED:
            self._notify_submitter_approved(updated or existing)

        return json_response(
            200,
            {"ok": True, "event": admin_event_view(updated or {**existing, **updates})},
            request_event=event,
        )

    def _notify_submitter_approved(self, item: dict[str, Any]) -> None:
        submitter = str(item.get("submitterEmail") or "")
        title = str(item.get("title") or "your event")
        if submitter:
            self._mail.send_email(
                submitter,
                "Your Wiley community event is live",
                build_submitter_approved_email(title),
            )

    def _create_event(self, event: dict[str, Any]) -> dict[str, Any]:
        source_ip = request_source_ip(event)
        if not self._submit_rate_limiter.allow(source_ip):
            return json_response(
                429,
                {
                    "error": "Too many submissions from this network. Please try again later.",
                },
                request_event=event,
            )

        try:
            payload = parse_json_body(event)
        except ValueError as error:
            return json_response(400, {"error": str(error)}, request_event=event)

        # Honeypot — bots fill hidden fields; humans leave blank.
        if str(payload.get("website") or payload.get("companyUrl") or "").strip():
            return json_response(
                200,
                {
                    "ok": True,
                    "message": "Thank you. The Town Clerk will review your event.",
                },
                request_event=event,
            )

        try:
            item = validate_submission(payload)
        except ValueError as error:
            return json_response(400, {"error": str(error)}, request_event=event)

        approve_token = secrets_token()
        reject_token = secrets_token()
        now = utc_now_iso()
        token_expires = (
            (datetime.now(UTC) + timedelta(days=TOKEN_TTL_DAYS))
            .replace(microsecond=0)
            .isoformat()
        )

        item.update(
            {
                "eventId": str(uuid.uuid4()),
                "status": PENDING,
                "approveToken": approve_token,
                "rejectToken": reject_token,
                "tokenExpiresAt": token_expires,
                "createdAt": now,
                "updatedAt": now,
            }
        )

        self._store.put_event(item)
        self._store.put_token_lookup(approve_token, item["eventId"], "approve")
        self._store.put_token_lookup(reject_token, item["eventId"], "reject")

        base_url = build_request_base_url(event, self._config.public_api_base_url)
        approve_url = build_token_url(base_url, "/approve", approve_token)
        reject_url = build_token_url(base_url, "/reject", reject_token)

        self._mail.send_email(
            self._config.clerk_email,
            f"Community calendar submission: {item['title']}",
            build_clerk_email_body(item, approve_url, reject_url),
            # Resident → town: Reply goes to the submitter; MailPlus still
            # authenticates as the town SMTP mailbox for delivery.
            reply_to=str(item.get("submitterEmail") or ""),
            from_name=str(item.get("submitterName") or ""),
        )

        return json_response(
            200,
            {
                "ok": True,
                "eventId": item["eventId"],
                "message": "Thank you. The Town Clerk will review your event.",
            },
            request_event=event,
        )

    def _list_events(self, event: dict[str, Any]) -> dict[str, Any]:
        category = query_param(event, "category")
        if category and category not in CATEGORIES:
            return json_response(
                400, {"error": "Invalid category filter."}, request_event=event
            )
        events = self._store.list_public_events(category=category)
        return json_response(200, {"events": events}, request_event=event)

    def _resolve_token_decision(
        self, event: dict[str, Any], *, action: str
    ) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
        """Return (error_html_response, context) where context has token/item/lookup."""
        token = extract_action_token(event)
        if not token:
            return (
                html_response(
                    400,
                    render_status_page(
                        "Missing token", "This approval link is incomplete."
                    ),
                    request_event=event,
                ),
                None,
            )

        lookup = self._store.get_token_lookup(token)
        if not lookup or lookup.get("action") != action:
            return (
                html_response(
                    404,
                    render_status_page(
                        "Link not valid",
                        "This link is invalid, already used, or expired.",
                    ),
                    request_event=event,
                ),
                None,
            )

        event_id = lookup["eventId"]
        item = self._store.get_event(event_id)
        if not item:
            return (
                html_response(
                    404,
                    render_status_page("Not found", "That event could not be found."),
                    request_event=event,
                ),
                None,
            )

        expires_at = str(item.get("tokenExpiresAt") or "")
        if expires_at and expires_at < utc_now_iso():
            return (
                html_response(
                    410,
                    render_status_page(
                        "Link expired",
                        "This approval link has expired. Ask the resident to resubmit.",
                    ),
                    request_event=event,
                ),
                None,
            )

        if item.get("status") != PENDING:
            return (
                html_response(
                    200,
                    render_status_page(
                        "Already processed",
                        f"This event is already marked as {item.get('status')}.",
                    ),
                    request_event=event,
                ),
                None,
            )

        return None, {"token": token, "item": item}

    def _confirm_decide(self, event: dict[str, Any], *, action: str) -> dict[str, Any]:
        error, context = self._resolve_token_decision(event, action=action)
        if error:
            return error
        assert context is not None
        item = context["item"]
        token = context["token"]
        title = str(item.get("title") or "this event")
        if action == "approve":
            return html_response(
                200,
                render_confirm_page(
                    title="Confirm approval",
                    message=f'Publish "{title}" on the Community Calendar?',
                    action_label="Yes, approve and publish",
                    form_action="/approve",
                    token=token,
                ),
                request_event=event,
            )
        return html_response(
            200,
            render_confirm_page(
                title="Confirm rejection",
                message=f'Reject "{title}" and keep it off the calendar?',
                action_label="Yes, reject this submission",
                form_action="/reject",
                token=token,
            ),
            request_event=event,
        )

    def _decide(self, event: dict[str, Any], *, action: str) -> dict[str, Any]:
        error, context = self._resolve_token_decision(event, action=action)
        if error:
            return error
        assert context is not None
        item = context["item"]
        event_id = str(item.get("eventId") or "")
        now = utc_now_iso()
        if action == "approve":
            updates = {
                "status": APPROVED,
                "approvedAt": now,
                "updatedAt": now,
                "approveToken": "",
                "rejectToken": "",
            }
            updated = self._store.update_event(event_id, updates)
            self._invalidate_tokens(item)
            self._notify_submitter_approved(updated or item)
            title = str((updated or item).get("title") or "your event")
            return html_response(
                200,
                render_status_page(
                    "Event approved",
                    f'"{title}" is now published on the Community Calendar.',
                ),
                request_event=event,
            )

        updates = {
            "status": REJECTED,
            "rejectedAt": now,
            "updatedAt": now,
            "approveToken": "",
            "rejectToken": "",
        }
        updated = self._store.update_event(event_id, updates)
        self._invalidate_tokens(item)
        title = str((updated or item).get("title") or "the event")
        return html_response(
            200,
            render_status_page(
                "Event rejected",
                f'"{title}" was not published. No further action is required.',
            ),
            request_event=event,
        )

    def _invalidate_tokens(self, item: dict[str, Any]) -> None:
        for key in ("approveToken", "rejectToken"):
            token = str(item.get(key) or "").strip()
            if token:
                self._store.delete_token_lookup(token)


def public_event_view(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "eventId": item.get("eventId"),
        "title": item.get("title"),
        "description": item.get("description"),
        "category": item.get("category"),
        "location": item.get("location"),
        "startDateTime": item.get("startDateTime"),
        "endDateTime": item.get("endDateTime"),
        "organizerName": item.get("organizerName") or "",
        "socialLink": item.get("socialLink") or "",
        "audience": item.get("audience") or "",
        "cost": item.get("cost") or "",
        "accessibilityNotes": item.get("accessibilityNotes") or "",
    }


def admin_event_view(item: dict[str, Any]) -> dict[str, Any]:
    return {
        **public_event_view(item),
        "status": item.get("status"),
        "submitterName": item.get("submitterName") or "",
        "submitterPhone": item.get("submitterPhone") or "",
        "submitterEmail": item.get("submitterEmail") or "",
        "language": item.get("language") or "en",
        "createdAt": item.get("createdAt") or "",
        "updatedAt": item.get("updatedAt") or "",
        "approvedAt": item.get("approvedAt") or "",
        "rejectedAt": item.get("rejectedAt") or "",
        "tokenExpiresAt": item.get("tokenExpiresAt") or "",
    }


def build_submitter_approved_email(title: str) -> str:
    return (
        f"Hello,\n\n"
        f'Your community event "{title}" was approved and is now listed on '
        f"the Town of Wiley calendar:\n"
        f"{PUBLIC_CALENDAR_URL}\n\n"
        f"Thank you,\nTown of Wiley\n"
    )


def parse_admin_path(path: str) -> tuple[str | None, str | None]:
    """Parse /admin/events/{id}[/approve|/reject] → (eventId, action)."""
    marker = "/admin/events"
    if marker not in path:
        return None, None
    remainder = path.split(marker, 1)[1].strip("/")
    if not remainder:
        return None, None
    parts = remainder.split("/")
    event_id = parts[0] if parts else None
    action = parts[1] if len(parts) > 1 else None
    if action and action not in {"approve", "reject"}:
        return event_id, None
    return event_id or None, action


def validate_submission(payload: dict[str, Any]) -> dict[str, Any]:
    title = clean_required(payload.get("title"), "Event title")
    description = clean_required(payload.get("description"), "Description")
    location = clean_required(payload.get("location"), "Location")
    category = str(payload.get("category") or "").strip()
    if category not in CATEGORIES:
        raise ValueError("A valid category is required.")

    submitter_name = clean_required(payload.get("submitterName"), "Full name")
    submitter_phone = normalize_phone(str(payload.get("submitterPhone") or ""))
    submitter_email = normalize_email(str(payload.get("submitterEmail") or ""))

    start = parse_iso_datetime(
        str(payload.get("startDateTime") or ""), "Start date/time"
    )
    end_raw = str(payload.get("endDateTime") or "").strip()
    if end_raw:
        end = parse_iso_datetime(end_raw, "End date/time")
    else:
        end = start + timedelta(hours=2)
    if end <= start:
        raise ValueError("End date/time must be after the start.")

    language = str(payload.get("language") or "en").strip().lower()
    if language not in LANGUAGES:
        language = "en"

    social = str(payload.get("socialLink") or "").strip()
    if social and not (social.startswith("https://") or social.startswith("http://")):
        raise ValueError("Social link must start with http:// or https://.")

    return {
        "title": title,
        "description": description,
        "location": location,
        "category": category,
        "submitterName": submitter_name,
        "submitterPhone": submitter_phone,
        "submitterEmail": submitter_email,
        "startDateTime": start.replace(microsecond=0).isoformat(),
        "endDateTime": end.replace(microsecond=0).isoformat(),
        "organizerName": clean_optional(payload.get("organizerName")),
        "socialLink": social,
        "audience": clean_optional(payload.get("audience")),
        "cost": clean_optional(payload.get("cost")),
        "accessibilityNotes": clean_optional(payload.get("accessibilityNotes")),
        "language": language,
    }


def build_clerk_email_body(
    item: dict[str, Any], approve_url: str, reject_url: str
) -> str:
    lines = [
        "A resident requested that an event be posted to the community calendar.",
        "",
        "Review and approve in the clerk admin:",
        "https://www.townofwiley.gov/admin",
        "(Sign in → Manage community calendar → Approve)",
        "",
        f"Title: {item.get('title')}",
        f"Category: {item.get('category')}",
        f"When: {item.get('startDateTime')} – {item.get('endDateTime')}",
        f"Location: {item.get('location')}",
        f"Description: {item.get('description')}",
        "",
        f"Submitter: {item.get('submitterName')}",
        f"Phone: {item.get('submitterPhone')}",
        f"Email: {item.get('submitterEmail')}",
        f"Organizer: {item.get('organizerName') or '(same as submitter)'}",
        f"Audience: {item.get('audience') or '—'}",
        f"Cost: {item.get('cost') or '—'}",
        f"Accessibility: {item.get('accessibilityNotes') or '—'}",
        f"Social link: {item.get('socialLink') or '—'}",
        f"Language: {item.get('language')}",
        "",
        "Optional one-click links (open, then Confirm — opening alone does nothing):",
        f"Approve: {approve_url}",
        f"Reject: {reject_url}",
        "",
        "These links expire in 7 days.",
    ]
    return "\n".join(lines)


def clean_required(value: Any, label: str) -> str:
    text = clean_optional(value)
    if not text:
        raise ValueError(f"{label} is required.")
    if len(text) > 2000:
        raise ValueError(f"{label} is too long.")
    return text


def clean_optional(value: Any) -> str:
    return " ".join(str(value or "").split()).strip()


def normalize_email(value: str) -> str:
    _name, addr = parseaddr(value.strip())
    addr = addr.strip().lower()
    if not addr or not EMAIL_PATTERN.match(addr):
        raise ValueError("A valid email address is required.")
    return addr


def normalize_phone(value: str) -> str:
    digits = PHONE_DIGIT_PATTERN.sub("", value)
    if len(digits) < 10:
        raise ValueError("A valid phone number is required.")
    return digits


def parse_iso_datetime(value: str, label: str) -> datetime:
    raw = value.strip()
    if not raw:
        raise ValueError(f"{label} is required.")
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError(f"{label} must be a valid ISO date/time.") from error
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def secrets_token() -> str:
    return uuid.uuid4().hex + uuid.uuid4().hex


def request_method(event: dict[str, Any]) -> str:
    return str(
        event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or ""
    ).upper()


def request_path(event: dict[str, Any]) -> str:
    return str(event.get("rawPath") or event.get("path") or "/").rstrip("/") or "/"


def request_header(event: dict[str, Any] | None, name: str) -> str:
    if not event:
        return ""
    headers = event.get("headers") or {}
    for key, value in headers.items():
        if str(key).lower() == name.lower():
            return str(value or "").strip()
    return ""


def query_param(event: dict[str, Any], name: str) -> str:
    query = event.get("queryStringParameters") or {}
    value = query.get(name)
    return str(value).strip() if value else ""


def request_source_ip(event: dict[str, Any]) -> str:
    ctx = event.get("requestContext") or {}
    http = ctx.get("http") or {}
    if isinstance(http, dict) and http.get("sourceIp"):
        return str(http["sourceIp"]).strip() or "unknown"
    identity = ctx.get("identity") or {}
    if isinstance(identity, dict) and identity.get("sourceIp"):
        return str(identity["sourceIp"]).strip() or "unknown"
    return "unknown"


def extract_action_token(event: dict[str, Any]) -> str:
    token = query_param(event, "token")
    if token:
        return token
    content_type = request_header(event, "content-type").lower()
    if "application/x-www-form-urlencoded" in content_type:
        raw = event.get("body") or ""
        if event.get("isBase64Encoded"):
            raw = base64.b64decode(raw).decode("utf-8")
        parsed = parse_qs(str(raw), keep_blank_values=False)
        values = parsed.get("token") or []
        if values:
            return str(values[0]).strip()
    try:
        payload = parse_json_body(event)
    except ValueError:
        return ""
    return str(payload.get("token") or "").strip()


def parse_json_body(event: dict[str, Any]) -> dict[str, Any]:
    body = event.get("body")
    if body is None:
        raise ValueError("Missing JSON request body.")
    if event.get("isBase64Encoded"):
        body = base64.b64decode(body).decode("utf-8")
    try:
        payload = json.loads(body)
    except json.JSONDecodeError as error:
        raise ValueError("Request body must be valid JSON.") from error
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object.")
    return payload


def build_cors_headers(event: dict[str, Any] | None) -> dict[str, str]:
    """
    CORS for this API is configured on the Lambda Function URL.

    Do not also emit Access-Control-* here — duplicate
    access-control-allow-origin headers break browsers (fetch fails even when
    the Lambda returns 200).
    """
    del event  # request origin is applied by Function URL CORS
    return {}


def json_response(
    status_code: int,
    body: dict[str, Any],
    *,
    request_event: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {
            **build_cors_headers(request_event),
            "content-type": "application/json; charset=utf-8",
        },
        "body": json.dumps(body),
    }


def html_response(
    status_code: int,
    body: str,
    *,
    request_event: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {
            **build_cors_headers(request_event),
            "content-type": "text/html; charset=utf-8",
        },
        "body": body,
    }


def _page_shell(title: str, inner: str) -> str:
    return (
        "<!doctype html>"
        '<html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f"<title>{escape(title)}</title>"
        "<style>body{font-family:Georgia,serif;background:#f4efe4;color:#1f2a2e;margin:0;padding:2rem}"
        ".card{max-width:42rem;margin:0 auto;background:#fff;border-radius:18px;padding:2rem;"
        "box-shadow:0 20px 50px rgba(31,42,46,.12)}h1{margin-top:0;font-size:2rem}p{line-height:1.6}"
        "button{font:inherit;background:#1f4b3f;color:#fff;border:0;border-radius:999px;"
        "padding:.75rem 1.25rem;cursor:pointer}button:hover{background:#16382f}</style>"
        "</head><body>"
        f'<main class="card"><p>Town of Wiley Community Calendar</p>{inner}</main>'
        "</body></html>"
    )


def render_status_page(title: str, message: str) -> str:
    return _page_shell(
        title,
        f"<h1>{escape(title)}</h1><p>{escape(message)}</p>",
    )


def render_confirm_page(
    *,
    title: str,
    message: str,
    action_label: str,
    form_action: str,
    token: str,
) -> str:
    action = escape(form_action if form_action.startswith("/") else f"/{form_action}")
    return _page_shell(
        title,
        (
            f"<h1>{escape(title)}</h1>"
            f"<p>{escape(message)}</p>"
            f'<form method="post" action="{action}">'
            f'<input type="hidden" name="token" value="{escape(token)}">'
            f'<p><button type="submit">{escape(action_label)}</button></p>'
            "</form>"
            "<p>If you did not mean to open this email link, close this page — "
            "nothing has changed yet.</p>"
        ),
    )


def build_request_base_url(event: dict[str, Any], configured_base_url: str) -> str:
    if configured_base_url:
        return configured_base_url.rstrip("/")
    headers = event.get("headers") or {}
    host = headers.get("host") or headers.get("Host")
    protocol = (
        headers.get("x-forwarded-proto") or headers.get("X-Forwarded-Proto") or "https"
    )
    if host:
        return f"{protocol}://{host}".rstrip("/")
    return ""


def build_token_url(base_url: str, path: str, token: str) -> str:
    normalized_base = base_url.rstrip("/")
    normalized_path = path if path.startswith("/") else f"/{path}"
    if not normalized_base:
        return ""
    return f"{normalized_base}{normalized_path}?{urlencode({'token': token})}"


def read_config() -> AppConfig:
    return AppConfig(
        events_table=os.environ.get("EVENTS_TABLE", "TownOfWileyCommunityEvents"),
        sender_email=os.environ.get("SENDER_EMAIL", "").strip(),
        sender_name=os.environ.get("SENDER_NAME", DEFAULT_SENDER_NAME).strip()
        or DEFAULT_SENDER_NAME,
        clerk_email=os.environ.get("CLERK_EMAIL", DEFAULT_CLERK_EMAIL).strip()
        or DEFAULT_CLERK_EMAIL,
        public_api_base_url=os.environ.get("PUBLIC_API_BASE_URL", "").strip(),
    )


def build_default_backend() -> CommunityCalendarBackend:
    config = read_config()
    return CommunityCalendarBackend(
        config,
        DynamoEventStore(config.events_table),
        build_mail_gateway(config),
    )


_BACKEND: CommunityCalendarBackend | None = None


def handler(event: dict[str, Any], context: Any | None = None) -> dict[str, Any]:
    del context
    global _BACKEND
    if _BACKEND is None:
        _BACKEND = build_default_backend()
    return _BACKEND.handle(event)
