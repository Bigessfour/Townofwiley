from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Protocol

DEFAULT_API_ID = "j7b2x3sh7rcezekekkxxiak7hi"
DEFAULT_WARN_DAYS = 30
RUNBOOK_URL = "https://github.com/Bigessfour/Townofwiley/blob/main/docs/appsync-api-key-rotation-runbook.md"

ZERO_DOWNTIME_STEPS = """\
Zero-downtime rotation (keep the old key until the new one is live):

1. Create a new key (do not delete the expiring key yet):
   aws appsync create-api-key --api-id {api_id} --expires $(date -u -v+365d +%s) --region us-east-2

2. Update APPSYNC_CMS_API_KEY in GitHub repository secrets and local user-secrets.

3. Redeploy runtime-config.js:
   npm run deploy:static-site

4. Verify:
   npm run verify:runtime-config-cms
   curl -s https://townofwiley.gov/runtime-config.js | grep apiKey

5. After 24–48 hours bake-in, delete the old key:
   aws appsync delete-api-key --api-id {api_id} --id <old-key-id> --region us-east-2
"""


class AppSyncGateway(Protocol):
    def list_api_keys(self, *, api_id: str) -> list[dict[str, Any]]: ...


class SnsGateway(Protocol):
    def publish(self, *, topic_arn: str, subject: str, message: str) -> None: ...


@dataclass(frozen=True)
class AppConfig:
    api_id: str
    warn_days: int
    sns_topic_arn: str
    site_label: str = "townofwiley-main"


@dataclass(frozen=True)
class ApiKeyExpiry:
    key_id: str
    description: str
    expires_at: datetime
    days_remaining: int


class Boto3AppSyncGateway:
    def __init__(self, client: Any) -> None:
        self._client = client

    def list_api_keys(self, *, api_id: str) -> list[dict[str, Any]]:
        response = self._client.list_api_keys(apiId=api_id)
        return list(response.get("apiKeys", []))


class Boto3SnsGateway:
    def __init__(self, client: Any) -> None:
        self._client = client

    def publish(self, *, topic_arn: str, subject: str, message: str) -> None:
        self._client.publish(TopicArn=topic_arn, Subject=subject, Message=message)


def parse_expires(value: Any) -> datetime | None:
    if value in (None, ""):
        return None
    try:
        seconds = float(value)
    except (TypeError, ValueError):
        return None
    return datetime.fromtimestamp(seconds, tz=UTC)


def find_expiring_keys(
    api_keys: list[dict[str, Any]],
    *,
    warn_days: int,
    now: datetime,
) -> list[ApiKeyExpiry]:
    threshold = now + timedelta(days=warn_days)
    expiring: list[ApiKeyExpiry] = []

    for entry in api_keys:
        expires_at = parse_expires(entry.get("expires"))
        if expires_at is None:
            continue
        if expires_at > threshold:
            continue

        key_id = str(entry.get("id", "")).strip()
        if not key_id:
            continue

        days_remaining = max(0, (expires_at - now).days)
        expiring.append(
            ApiKeyExpiry(
                key_id=key_id,
                description=str(entry.get("description") or "").strip()
                or "(no description)",
                expires_at=expires_at,
                days_remaining=days_remaining,
            ),
        )

    expiring.sort(key=lambda item: item.expires_at)
    return expiring


def build_reminder_subject(config: AppConfig, expiring: list[ApiKeyExpiry]) -> str:
    soonest = expiring[0].days_remaining
    return (
        f"[Town of Wiley] AppSync CMS API key expires in {soonest} day(s) — rotate now"
    )


def build_reminder_message(config: AppConfig, expiring: list[ApiKeyExpiry]) -> str:
    lines = [
        "Town of Wiley — AppSync CMS API key rotation reminder",
        "",
        f"API: {config.site_label} ({config.api_id})",
        f"Warning window: {config.warn_days} days before expiry",
        "",
        "Expiring key(s):",
    ]

    for item in expiring:
        lines.append(
            f"  - id={item.key_id} expires={item.expires_at.date().isoformat()} "
            f"({item.days_remaining} day(s) remaining) description={item.description}",
        )

    lines.extend(
        [
            "",
            ZERO_DOWNTIME_STEPS.format(api_id=config.api_id),
            "",
            f"Full runbook: {RUNBOOK_URL}",
        ],
    )
    return "\n".join(lines)


@dataclass
class ReminderResult:
    checked: int
    expiring: list[ApiKeyExpiry]
    notified: bool


class AppSyncKeyRotationReminder:
    def __init__(
        self,
        config: AppConfig,
        appsync_gateway: AppSyncGateway,
        sns_gateway: SnsGateway,
    ) -> None:
        self._config = config
        self._appsync = appsync_gateway
        self._sns = sns_gateway

    def run(self, *, now: datetime | None = None) -> ReminderResult:
        current = now or datetime.now(tz=UTC)
        api_keys = self._appsync.list_api_keys(api_id=self._config.api_id)
        expiring = find_expiring_keys(
            api_keys,
            warn_days=self._config.warn_days,
            now=current,
        )

        notified = False
        if expiring and self._config.sns_topic_arn.strip():
            self._sns.publish(
                topic_arn=self._config.sns_topic_arn.strip(),
                subject=build_reminder_subject(self._config, expiring),
                message=build_reminder_message(self._config, expiring),
            )
            notified = True

        return ReminderResult(
            checked=len(api_keys), expiring=expiring, notified=notified
        )


def load_config_from_env(environ: dict[str, str] | None = None) -> AppConfig:
    env = environ if environ is not None else os.environ
    warn_days_raw = env.get("WARN_DAYS", str(DEFAULT_WARN_DAYS)).strip()
    try:
        warn_days = int(warn_days_raw)
    except ValueError as error:
        raise ValueError(
            f"WARN_DAYS must be an integer, got {warn_days_raw!r}"
        ) from error

    return AppConfig(
        api_id=env.get("APPSYNC_API_ID", DEFAULT_API_ID).strip() or DEFAULT_API_ID,
        warn_days=max(1, warn_days),
        sns_topic_arn=env.get("SNS_TOPIC_ARN", "").strip(),
        site_label=env.get("APPSYNC_API_NAME", "townofwiley-main").strip()
        or "townofwiley-main",
    )


def handler(event: dict[str, Any] | None, context: Any) -> dict[str, Any]:
    del event, context

    import boto3

    config = load_config_from_env()
    reminder = AppSyncKeyRotationReminder(
        config=config,
        appsync_gateway=Boto3AppSyncGateway(boto3.client("appsync")),
        sns_gateway=Boto3SnsGateway(boto3.client("sns")),
    )
    result = reminder.run()

    return {
        "checked": result.checked,
        "expiringCount": len(result.expiring),
        "notified": result.notified,
        "expiringKeyIds": [item.key_id for item in result.expiring],
    }
