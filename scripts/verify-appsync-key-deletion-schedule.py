#!/usr/bin/env python3
"""Verify AppSync key rotation bake-in schedule and active keys (run after Mon deletion)."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_API_ID = "j7b2x3sh7rcezekekkxxiak7hi"
DEFAULT_SCHEDULE = "TownOfWileyAppSyncOldKeyDeletion"
DEFAULT_KEEP_KEY_PREFIX = "da2-24hg"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify AppSync CMS key deletion schedule."
    )
    parser.add_argument("--api-id", default=DEFAULT_API_ID)
    parser.add_argument("--schedule-name", default=DEFAULT_SCHEDULE)
    parser.add_argument("--region", default="us-east-2")
    parser.add_argument("--keep-key-prefix", default=DEFAULT_KEEP_KEY_PREFIX)
    return parser.parse_args()


def run_aws(command: list[str], region: str) -> Any:
    process = subprocess.run(
        ["aws", *command, "--region", region],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if process.returncode != 0:
        raise RuntimeError(
            process.stderr.strip() or process.stdout.strip() or "AWS CLI failed"
        )
    output = process.stdout.strip()
    return json.loads(output) if output else {}


def main() -> int:
    args = parse_args()
    keys = run_aws(
        ["appsync", "list-api-keys", "--api-id", args.api_id], args.region
    ).get("apiKeys", [])
    schedule = run_aws(
        ["scheduler", "get-schedule", "--name", args.schedule_name],
        args.region,
    )
    active_keys = [
        {
            "id": key.get("id"),
            "expires": key.get("expires"),
            "description": key.get("description"),
        }
        for key in keys
    ]
    keep_matches = [
        key
        for key in active_keys
        if str(key.get("id", "")).startswith(args.keep_key_prefix)
    ]
    report = {
        "checkedAt": datetime.now(tz=UTC).isoformat(),
        "activeKeyCount": len(active_keys),
        "activeKeys": active_keys,
        "scheduleState": schedule.get("State"),
        "scheduleExpression": schedule.get("ScheduleExpression"),
        "scheduleTarget": schedule.get("Target", {}).get("Arn"),
        "keepKeyPrefixMatches": len(keep_matches),
        "ok": len(keep_matches) >= 1,
    }
    print(json.dumps(report, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
