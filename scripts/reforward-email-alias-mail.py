#!/usr/bin/env python3
"""Re-invoke the email alias router for historical S3 ingress objects.

Use after deploying a MIME passthrough fix so staff receive full body/attachments
that were previously buried in nested ``.eml`` shells.

Examples:
  # Preview (default)
  python3 scripts/reforward-email-alias-mail.py

  # Execute all real mail objects
  python3 scripts/reforward-email-alias-mail.py --execute

  # Only messages since a date
  python3 scripts/reforward-email-alias-mail.py --execute --since 2026-07-01
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_BUCKET = "townofwiley-email-alias-570912405222-us-east-1"
DEFAULT_FUNCTION = "TownOfWileyEmailAliasRouter"
DEFAULT_REGION = "us-east-1"
DEFAULT_PREFIX = "incoming/"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Reforward historical Town mail from the SES ingress bucket.",
    )
    parser.add_argument("--bucket", default=DEFAULT_BUCKET)
    parser.add_argument("--function-name", default=DEFAULT_FUNCTION)
    parser.add_argument("--region", default=DEFAULT_REGION)
    parser.add_argument("--prefix", default=DEFAULT_PREFIX)
    parser.add_argument(
        "--since",
        default="",
        help="Only objects with LastModified on/after this ISO date (YYYY-MM-DD).",
    )
    parser.add_argument(
        "--until",
        default="",
        help="Only objects with LastModified on/before this ISO date (YYYY-MM-DD).",
    )
    parser.add_argument("--limit", type=int, default=0, help="Max objects to process.")
    parser.add_argument(
        "--sleep-ms",
        type=int,
        default=250,
        help="Pause between Lambda invokes (default 250ms).",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually invoke Lambda. Without this flag, dry-run only.",
    )
    parser.add_argument(
        "--include-ses-setup",
        action="store_true",
        help="Include AMAZON_SES_SETUP_NOTIFICATION objects (normally skipped).",
    )
    return parser.parse_args()


def run_aws(args: list[str], region: str) -> Any:
    process = subprocess.run(
        ["aws", "--region", region, *args],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if process.returncode != 0:
        raise RuntimeError(
            process.stderr.strip()
            or process.stdout.strip()
            or "AWS CLI command failed."
        )
    text = process.stdout.strip()
    return json.loads(text) if text else {}


def parse_date_bound(value: str, *, end_of_day: bool = False) -> datetime | None:
    if not value.strip():
        return None
    day = datetime.strptime(value.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc)
    if end_of_day:
        return day.replace(hour=23, minute=59, second=59)
    return day


def list_objects(bucket: str, prefix: str, region: str) -> list[dict[str, Any]]:
    objects: list[dict[str, Any]] = []
    token: str | None = None

    while True:
        command = [
            "s3api",
            "list-objects-v2",
            "--bucket",
            bucket,
            "--prefix",
            prefix,
        ]
        if token:
            command.extend(["--continuation-token", token])

        page = run_aws(command, region)
        objects.extend(page.get("Contents") or [])
        if not page.get("IsTruncated"):
            break
        token = page.get("NextContinuationToken")

    return objects


def should_skip(key: str, include_ses_setup: bool) -> bool:
    if include_ses_setup:
        return False
    return key.rstrip("/").endswith("AMAZON_SES_SETUP_NOTIFICATION")


def build_event(bucket: str, key: str, size: int) -> dict[str, Any]:
    return {
        "reforward": True,
        "Records": [
            {
                "eventSource": "aws:s3",
                "eventName": "ObjectCreated:Put",
                "s3": {
                    "bucket": {"name": bucket},
                    "object": {"key": key, "size": size},
                },
            }
        ],
    }


def main() -> int:
    args = parse_args()
    since = parse_date_bound(args.since)
    until = parse_date_bound(args.until, end_of_day=True)

    objects = list_objects(args.bucket, args.prefix, args.region)
    selected: list[dict[str, Any]] = []

    for item in sorted(objects, key=lambda row: row.get("LastModified", "")):
        key = str(item.get("Key") or "")
        if not key or should_skip(key, args.include_ses_setup):
            continue

        last_modified = datetime.fromisoformat(
            str(item["LastModified"]).replace("Z", "+00:00")
        )
        if since and last_modified < since:
            continue
        if until and last_modified > until:
            continue

        selected.append(item)
        if args.limit and len(selected) >= args.limit:
            break

    print(
        json.dumps(
            {
                "mode": "execute" if args.execute else "dry-run",
                "bucket": args.bucket,
                "function": args.function_name,
                "region": args.region,
                "candidateCount": len(selected),
                "since": args.since or None,
                "until": args.until or None,
            },
            indent=2,
        )
    )

    if not selected:
        print("No matching objects.")
        return 0

    for item in selected:
        key = item["Key"]
        size = int(item.get("Size") or 0)
        print(f"- {item.get('LastModified')}  {size:8d}  {key}")

    if not args.execute:
        print(
            "\nDry-run only. Re-run with --execute to invoke Lambda and re-send mail."
        )
        return 0

    forwarded = 0
    failed = 0
    skipped = 0

    for index, item in enumerate(selected, start=1):
        key = item["Key"]
        size = int(item.get("Size") or 0)
        event = build_event(args.bucket, key, size)
        payload_path = Path(f"/tmp/tow-reforward-{index}.json")
        payload_path.write_text(json.dumps(event), encoding="utf-8")

        try:
            response = run_aws(
                [
                    "lambda",
                    "invoke",
                    "--function-name",
                    args.function_name,
                    "--cli-binary-format",
                    "raw-in-base64-out",
                    "--payload",
                    f"file://{payload_path}",
                    f"/tmp/tow-reforward-out-{index}.json",
                ],
                args.region,
            )
            out_body = Path(f"/tmp/tow-reforward-out-{index}.json").read_text(
                encoding="utf-8"
            )
            body = json.loads(out_body) if out_body.strip() else {}
            if response.get("FunctionError"):
                failed += 1
                err = body.get("errorMessage") or body.get("errorType") or out_body[:200]
                print(
                    f"[{index}/{len(selected)}] {key} -> FUNCTION_ERROR {err} "
                    f"(StatusCode={response.get('StatusCode')})",
                    file=sys.stderr,
                )
            else:
                result_list = body.get("results") or []
                reason = result_list[0].get("reason") if result_list else "unknown"
                ok = bool(body.get("forwarded"))
                if ok:
                    forwarded += 1
                elif str(reason).startswith("skipped"):
                    skipped += 1
                else:
                    failed += 1
                print(
                    f"[{index}/{len(selected)}] {key} -> {reason} "
                    f"(StatusCode={response.get('StatusCode')})"
                )
        except Exception as error:  # noqa: BLE001
            failed += 1
            print(f"[{index}/{len(selected)}] {key} -> ERROR {error}", file=sys.stderr)

        if args.sleep_ms > 0 and index < len(selected):
            time.sleep(args.sleep_ms / 1000.0)

    summary = {
        "forwarded": forwarded,
        "skipped": skipped,
        "failed": failed,
        "total": len(selected),
    }
    print(json.dumps(summary, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
