#!/usr/bin/env python3
"""
Migrate Town of Wiley CloudFront static-site origin from legacy OAI to prepared OAC.

Reads IDs from infrastructure/aws-infrastructure.manifest.json. Idempotent: exits 0
when the distribution already uses the target OAC.

Usage:
    python scripts/migrate-cloudfront-oac.py --dry-run
    python scripts/migrate-cloudfront-oac.py
    python scripts/migrate-cloudfront-oac.py --rollback-only

Requires AWS credentials for account 570912405222 (townofwiley profile).
"""

from __future__ import annotations

import argparse
import difflib
import json
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from copy import deepcopy
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = REPO_ROOT / "infrastructure" / "aws-infrastructure.manifest.json"
DEFAULT_BACKUP_DIR = REPO_ROOT / "scripts" / ".oac-backup"
EXPECTED_ACCOUNT_ID = "570912405222"
HEALTHCHECK_URLS = (
    "https://townofwiley.gov/",
    "https://townofwiley.gov/runtime-config.js",
)
CONSOLE_FALLBACK = (
    "CloudFront console fallback: distribution {dist_id} → Origins → S3 origin → "
    "Edit → Origin access control settings (recommended) → select OAC {oac_id} → Save → "
    "wait until Status is Deployed."
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Migrate CloudFront S3 origin from OAI to OAC (Town of Wiley static site).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print origin diff and exit without mutating AWS.",
    )
    parser.add_argument(
        "--rollback-only",
        action="store_true",
        help="Restore the most recent backup from --backup-dir and exit.",
    )
    parser.add_argument(
        "--backup-dir",
        type=Path,
        default=DEFAULT_BACKUP_DIR,
        help=f"Directory for distribution config backups (default: {DEFAULT_BACKUP_DIR}).",
    )
    parser.add_argument(
        "--timeout-minutes",
        type=int,
        default=30,
        help="Max minutes to wait for CloudFront deployment (default: 30).",
    )
    return parser.parse_args()


def log(message: str) -> None:
    print(message, flush=True)


def fail(message: str, code: int = 1) -> None:
    print(f"ERROR: {message}", file=sys.stderr, flush=True)
    sys.exit(code)


def run_aws(args: list[str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        ["aws", *args],
        capture_output=True,
        text=True,
        check=False,
    )
    return result


def aws_json(args: list[str]) -> Any:
    result = run_aws([*args, "--output", "json"])
    if result.returncode != 0:
        stderr = (result.stderr or result.stdout or "").strip()
        fail(f"aws {' '.join(args)} failed: {stderr}")
    if not (result.stdout or "").strip():
        return None
    return json.loads(result.stdout)


def load_manifest() -> dict[str, Any]:
    if not MANIFEST_PATH.exists():
        fail(f"Manifest not found: {MANIFEST_PATH}")
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def hosting_ids(manifest: dict[str, Any]) -> tuple[str, str, str]:
    hosting = manifest.get("hosting") or {}
    dist_id = hosting.get("cloudFrontDistributionId", "").strip()
    oac_id = (hosting.get("oacId") or hosting.get("oacPreparedId") or "").strip()
    bucket = hosting.get("s3Bucket", "").strip()
    if not dist_id or not oac_id or not bucket:
        fail(
            "Manifest hosting.cloudFrontDistributionId, oacId/oacPreparedId, and s3Bucket are required."
        )
    return dist_id, oac_id, bucket


def preflight_sts() -> None:
    identity = aws_json(["sts", "get-caller-identity"])
    account = str(identity.get("Account", ""))
    if account != EXPECTED_ACCOUNT_ID:
        fail(f"Expected AWS account {EXPECTED_ACCOUNT_ID}, got {account or 'unknown'}.")
    log(f"Preflight OK: AWS account {account} ({identity.get('Arn', '')})")


def preflight_oac(oac_id: str) -> None:
    oac = aws_json(["cloudfront", "get-origin-access-control", "--id", oac_id])
    config = (oac.get("OriginAccessControl") or {}).get(
        "OriginAccessControlConfig"
    ) or {}
    origin_type = config.get("OriginAccessControlOriginType")
    if origin_type != "s3":
        fail(
            f"OAC {oac_id} OriginAccessControlOriginType is {origin_type!r}, expected 's3'."
        )
    log(f"Preflight OK: OAC {oac_id} ({config.get('Name', 'unnamed')}) is S3 type")


def preflight_bucket_policy(bucket: str, dist_id: str) -> None:
    try:
        policy_doc = aws_json(["s3api", "get-bucket-policy", "--bucket", bucket])
    except SystemExit:
        fail(f"Static site bucket {bucket} has no readable bucket policy.")
    policy_str = policy_doc.get("Policy") if isinstance(policy_doc, dict) else ""
    if isinstance(policy_str, dict):
        policy_str = json.dumps(policy_str)
    policy_str = str(policy_str)
    dist_arn_fragment = (
        f"arn:aws:cloudfront::{EXPECTED_ACCOUNT_ID}:distribution/{dist_id}"
    )
    if "cloudfront.amazonaws.com" not in policy_str:
        fail(f"Bucket policy for {bucket} does not grant cloudfront.amazonaws.com.")
    if (
        dist_arn_fragment not in policy_str
        and "Origin Access Control" not in policy_str
    ):
        log(
            f"Warning: bucket policy may not include distribution ARN {dist_arn_fragment}; "
            "proceeding if cloudfront.amazonaws.com principal is present.",
        )
    log(f"Preflight OK: bucket {bucket} policy grants CloudFront access")


def get_distribution_config(dist_id: str) -> tuple[dict[str, Any], str]:
    response = aws_json(["cloudfront", "get-distribution-config", "--id", dist_id])
    etag = str(response.get("ETag", "")).strip()
    config = response.get("DistributionConfig")
    if not etag or not isinstance(config, dict):
        fail(f"Could not read distribution config for {dist_id}.")
    return config, etag


def find_s3_origin(config: dict[str, Any], bucket: str) -> dict[str, Any]:
    origins = ((config.get("Origins") or {}).get("Items")) or []
    if not origins:
        fail("Distribution has no origins.")
    for origin in origins:
        domain = str(origin.get("DomainName", ""))
        if bucket in domain:
            return origin
    # Fallback: first S3 origin
    for origin in origins:
        if origin.get("S3OriginConfig") is not None:
            return origin
    fail(f"No S3 origin found for bucket {bucket}.")


def is_on_oac(origin: dict[str, Any], oac_id: str) -> bool:
    current_oac = str(origin.get("OriginAccessControlId") or "").strip()
    oai = str(
        ((origin.get("S3OriginConfig") or {}).get("OriginAccessIdentity")) or ""
    ).strip()
    return current_oac == oac_id and not oai


def patch_origin_for_oac(origin: dict[str, Any], oac_id: str) -> dict[str, Any]:
    patched = deepcopy(origin)
    patched["OriginAccessControlId"] = oac_id
    s3_cfg = dict(patched.get("S3OriginConfig") or {})
    s3_cfg["OriginAccessIdentity"] = ""
    patched["S3OriginConfig"] = s3_cfg
    return patched


def build_patched_config(
    config: dict[str, Any], origin: dict[str, Any], oac_id: str
) -> dict[str, Any]:
    patched_config = deepcopy(config)
    items = list(((patched_config.get("Origins") or {}).get("Items")) or [])
    updated_items: list[dict[str, Any]] = []
    for item in items:
        if item.get("Id") == origin.get("Id"):
            updated_items.append(patch_origin_for_oac(item, oac_id))
        else:
            updated_items.append(item)
    patched_config.setdefault("Origins", {})["Items"] = updated_items
    patched_config["Origins"]["Quantity"] = len(updated_items)
    return patched_config


def write_backup(
    backup_dir: Path, dist_id: str, config: dict[str, Any], etag: str, label: str
) -> Path:
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    path = backup_dir / f"{dist_id}-{label}-{stamp}.json"
    payload = {"ETag": etag, "DistributionConfig": config}
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    log(f"Backup written: {path}")
    return path


def load_latest_backup(backup_dir: Path, dist_id: str) -> tuple[dict[str, Any], str]:
    if not backup_dir.exists():
        fail(f"No backup directory: {backup_dir}")
    candidates = sorted(backup_dir.glob(f"{dist_id}-*.json"), reverse=True)
    if not candidates:
        fail(f"No backup files found in {backup_dir} for distribution {dist_id}.")
    data = json.loads(candidates[0].read_text(encoding="utf-8"))
    config = data.get("DistributionConfig")
    etag = str(data.get("ETag", "")).strip()
    if not isinstance(config, dict) or not etag:
        fail(f"Backup file {candidates[0]} is missing DistributionConfig or ETag.")
    log(f"Loaded backup: {candidates[0]}")
    return config, etag


def print_origin_diff(before: dict[str, Any], after: dict[str, Any]) -> None:
    before_text = json.dumps(before, indent=2, sort_keys=True).splitlines(keepends=True)
    after_text = json.dumps(after, indent=2, sort_keys=True).splitlines(keepends=True)
    diff = difflib.unified_diff(
        before_text, after_text, fromfile="current-origin", tofile="patched-origin"
    )
    log("--- Origin diff ---")
    for line in diff:
        sys.stdout.write(line)
    log("--- End origin diff ---")


def update_distribution(
    dist_id: str, config: dict[str, Any], etag: str, oac_id: str
) -> str:
    tmp_dir = Path(tempfile.mkdtemp(prefix="tow-oac-"))
    tmp_config = tmp_dir / "distribution-config.json"
    tmp_config.write_text(json.dumps(config), encoding="utf-8")
    try:
        result = run_aws(
            [
                "cloudfront",
                "update-distribution",
                "--id",
                dist_id,
                "--if-match",
                etag,
                "--distribution-config",
                f"file://{tmp_config}",
            ],
        )
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    if result.returncode != 0:
        combined = (result.stderr or result.stdout or "").strip()
        if "OriginAccessControl" in combined and "invalid" in combined.lower():
            log(CONSOLE_FALLBACK.format(dist_id=dist_id, oac_id=oac_id))
            fail(
                "CloudFront rejected OAC origin update (InvalidArgument). "
                "Use the console fallback above. Distribution was not changed.",
                code=3,
            )
        fail(f"update-distribution failed: {combined}")
    response = json.loads(result.stdout or "{}")
    new_etag = str(response.get("ETag", "")).strip()
    log(f"update-distribution accepted (ETag {new_etag})")
    return new_etag


def wait_for_deployed(dist_id: str, timeout_minutes: int) -> None:
    deadline = time.time() + timeout_minutes * 60
    while time.time() < deadline:
        dist = aws_json(["cloudfront", "get-distribution", "--id", dist_id])
        status = str(((dist.get("Distribution") or {}).get("Status")) or "")
        log(f"CloudFront status: {status or 'unknown'}")
        if status == "Deployed":
            return
        time.sleep(30)
    raise TimeoutError(
        f"Timed out after {timeout_minutes} minutes waiting for CloudFront deployment."
    )


def healthcheck() -> None:
    for url in HEALTHCHECK_URLS:
        req = urllib.request.Request(url, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                code = response.getcode()
        except urllib.error.HTTPError as exc:
            code = exc.code
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Healthcheck failed for {url}: {exc}") from exc
        if code != 200:
            raise RuntimeError(f"Healthcheck failed for {url}: HTTP {code}")
        log(f"Healthcheck OK: {url} → {code}")


def rollback(
    dist_id: str, backup_config: dict[str, Any], oac_id: str, timeout_minutes: int
) -> None:
    log("Rolling back to pre-migration distribution config…")
    _, current_etag = get_distribution_config(dist_id)
    update_distribution(dist_id, backup_config, current_etag, oac_id)
    wait_for_deployed(dist_id, timeout_minutes)
    healthcheck()
    log("Rollback completed successfully.")


def main() -> None:
    args = parse_args()
    manifest = load_manifest()
    dist_id, oac_id, bucket = hosting_ids(manifest)

    if args.rollback_only:
        backup_config, _backup_etag = load_latest_backup(args.backup_dir, dist_id)
        _, current_etag = get_distribution_config(dist_id)
        update_distribution(dist_id, backup_config, current_etag, oac_id)
        wait_for_deployed(dist_id, args.timeout_minutes)
        healthcheck()
        log("Rollback-only completed.")
        return

    preflight_sts()
    preflight_oac(oac_id)
    preflight_bucket_policy(bucket, dist_id)

    config, etag = get_distribution_config(dist_id)
    origin = find_s3_origin(config, bucket)

    if is_on_oac(origin, oac_id):
        log(f"Already on OAC {oac_id} for origin {origin.get('Id')}. Nothing to do.")
        return

    patched_config = build_patched_config(config, origin, oac_id)
    patched_origin = find_s3_origin(patched_config, bucket)

    backup_path = write_backup(
        args.backup_dir, dist_id, config, etag, "pre-oac-migration"
    )
    log(f"Pre-migration backup: {backup_path}")

    print_origin_diff(origin, patched_origin)

    backup_config = deepcopy(config)

    if args.dry_run:
        dry_run_path = args.backup_dir / f"{dist_id}-dry-run-patched.json"
        dry_run_path.parent.mkdir(parents=True, exist_ok=True)
        dry_run_path.write_text(
            json.dumps(patched_config, indent=2) + "\n", encoding="utf-8"
        )
        log(f"Dry run complete. Patched DistributionConfig written to {dry_run_path}")
        return

    try:
        update_distribution(dist_id, patched_config, etag, oac_id)
        wait_for_deployed(dist_id, args.timeout_minutes)
        healthcheck()
    except SystemExit as exc:
        if exc.code == 3:
            raise
        try:
            rollback(dist_id, backup_config, oac_id, args.timeout_minutes)
        except (SystemExit, TimeoutError, RuntimeError) as rollback_exc:
            fail(f"Migration failed and rollback also failed: {rollback_exc}", code=2)
        fail("Migration failed; rolled back to pre-migration config.", code=2)
    except (TimeoutError, RuntimeError) as exc:
        log(f"Migration post-update check failed: {exc}")
        try:
            rollback(dist_id, backup_config, oac_id, args.timeout_minutes)
        except (SystemExit, TimeoutError, RuntimeError) as rollback_exc:
            fail(f"Migration failed and rollback also failed: {rollback_exc}", code=2)
        fail("Migration failed; rolled back to pre-migration config.", code=2)

    log("")
    log("OAC migration succeeded.")
    log("Next steps (repo):")
    log(
        "  1. Update infrastructure/aws-infrastructure.manifest.json hosting.oacId and note."
    )
    log(
        "  2. Update docs/AWS_INFRASTRUCTURE_SOT.md and .github/instructions/aws-hosting.instructions.md."
    )
    log("  3. Run: npm run verify:aws-infra")


if __name__ == "__main__":
    main()
