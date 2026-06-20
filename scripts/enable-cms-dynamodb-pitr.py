#!/usr/bin/env python3
"""Enable point-in-time recovery on CMS DynamoDB tables."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
INVENTORY_PATH = REPO_ROOT / "infrastructure" / "cms-inventory.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Enable PITR on CMS DynamoDB tables.")
    parser.add_argument("--region", default="us-east-2")
    parser.add_argument("--dry-run", action="store_true")
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


def cms_table_names() -> list[str]:
    inventory = json.loads(INVENTORY_PATH.read_text(encoding="utf-8"))
    return [
        model["tableName"]
        for model in inventory.get("models", [])
        if model.get("tableName")
    ]


def main() -> int:
    args = parse_args()
    results: list[dict[str, str]] = []
    for table_name in cms_table_names():
        if args.dry_run:
            results.append({"table": table_name, "status": "dry-run"})
            continue
        run_aws(
            [
                "dynamodb",
                "update-continuous-backups",
                "--table-name",
                table_name,
                "--point-in-time-recovery-specification",
                "PointInTimeRecoveryEnabled=true",
            ],
            args.region,
        )
        detail = run_aws(
            [
                "dynamodb",
                "describe-continuous-backups",
                "--table-name",
                table_name,
            ],
            args.region,
        )
        enabled = detail["ContinuousBackupsDescription"][
            "PointInTimeRecoveryDescription"
        ]["PointInTimeRecoveryStatus"]
        results.append({"table": table_name, "status": enabled})
    print(json.dumps({"tables": results}, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
