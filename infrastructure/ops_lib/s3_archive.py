"""Upload ops artifacts to S3 with local fallback. Never raises."""

from __future__ import annotations

import logging
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def upload_ops_artifact(
    local_path: str | Path,
    *,
    key_prefix: str = "ops-artifacts",
    bucket: str | None = None,
    s3_client: Any | None = None,
    correlation_id: str | None = None,
    content_type: str = "application/octet-stream",
) -> str | None:
    """
    Upload a file to s3://$TOW_OPS_ARTIFACTS_BUCKET/{prefix}/YYYY/MM/DD/{cid}/name

    Returns s3:// URI on success, None on skip/failure (local file remains).
    """
    path = Path(local_path)
    if not path.is_file():
        logger.error("Ops artifact missing: %s", path)
        return None

    bucket_name = (bucket or os.environ.get("TOW_OPS_ARTIFACTS_BUCKET") or "").strip()
    if not bucket_name:
        logger.debug("S3 archive skipped — TOW_OPS_ARTIFACTS_BUCKET unset")
        return None

    cid = (correlation_id or os.environ.get("CORRELATION_ID") or "local").strip()
    now = datetime.now(tz=UTC)
    key = (
        f"{key_prefix.strip('/')}/{now:%Y/%m/%d}/{cid}/{path.name}"
    )

    try:
        client = s3_client
        if client is None:
            import boto3

            client = boto3.client("s3")

        body = path.read_bytes()
        logger.info("Uploading ops artifact s3://%s/%s (%s bytes)", bucket_name, key, len(body))
        client.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=body,
            ContentType=content_type,
        )
        uri = f"s3://{bucket_name}/{key}"
        logger.info("Upload successful: %s", uri)
        return uri
    except Exception as exc:
        logger.error("S3 ops upload failed (keeping local file): %s", exc)
        return None
