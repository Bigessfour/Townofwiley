"""SNS ops notifications — never raise (alerts must not break workflows)."""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

VALID_SEVERITIES = frozenset({"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"})


def send_ops_notification(
    subject: str,
    message: str,
    *,
    severity: str = "INFO",
    topic_arn: str | None = None,
    sns_client: Any | None = None,
    region_name: str | None = None,
) -> bool:
    """
    Publish to TOW_OPS_SNS_TOPIC_ARN (or topic_arn).

    Returns True if published, False if skipped/failed. Never raises.
    """
    sev = (severity or "INFO").strip().upper()
    if sev not in VALID_SEVERITIES:
        sev = "INFO"

    arn = (topic_arn or os.environ.get("TOW_OPS_SNS_TOPIC_ARN") or "").strip()
    if not arn:
        logger.debug("SNS notify skipped — TOW_OPS_SNS_TOPIC_ARN unset")
        return False

    full_subject = f"[{sev}] {subject}"
    # SNS subject max 100 chars
    if len(full_subject) > 100:
        full_subject = full_subject[:97] + "..."

    try:
        client = sns_client
        if client is None:
            import boto3

            kwargs: dict[str, str] = {}
            region = (region_name or os.environ.get("AWS_REGION") or "").strip()
            if region:
                kwargs["region_name"] = region
            client = boto3.client("sns", **kwargs)

        logger.info("Sending SNS notification: %s", full_subject)
        client.publish(TopicArn=arn, Subject=full_subject, Message=message)
        logger.info("SNS notification sent")
        return True
    except Exception as exc:
        logger.error("SNS notification failed: %s", exc)
        return False
