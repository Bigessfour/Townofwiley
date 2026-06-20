#!/usr/bin/env python3
"""Ensure an active Mayor row exists in LeadershipRosterEntry (mayor-council group).

Idempotent: skips when any active mayor-council line already looks like Mayor.
Triggers DynamoDB stream → CMS snapshot republish on insert.

Usage:
  source scripts/agent-aws-env.sh
  python3 scripts/ensure-mayor-roster-row.py
  python3 scripts/ensure-mayor-roster-row.py --dry-run
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

TABLE = "LeadershipRosterEntry-j7b2x3sh7rcezekekkxxiak7hi-main"
MAYOR_ROW_ID = "roster-mayor-council-0"
MAYOR_LINE_EN = "Mayor: Steve McKitrick"
MAYOR_LINE_ES = "Alcalde: Steve McKitrick"
REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-2")
PROFILE = os.environ.get("AWS_PROFILE", "townofwiley")
DRY_RUN = "--dry-run" in sys.argv
ENV = {**os.environ, "AWS_PROFILE": PROFILE, "AWS_DEFAULT_REGION": REGION}


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def aws_json(*args: str) -> dict:
    cmd = ["aws", *args, "--region", REGION, "--output", "json"]
    if DRY_RUN and args[0] != "dynamodb":
        print("DRY", " ".join(cmd))
        return {}
    result = subprocess.run(cmd, env=ENV, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return json.loads(result.stdout or "{}")


def aws_put(*args: str) -> None:
    cmd = ["aws", *args, "--region", REGION]
    if DRY_RUN:
        print("DRY", " ".join(cmd))
        return
    subprocess.run(cmd, env=ENV, check=True)


def scan_active_mayor_council() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    exclusive_start_key = None
    while True:
        cmd = ["dynamodb", "scan", "--table-name", TABLE]
        if exclusive_start_key:
            cmd.extend(["--exclusive-start-key", json.dumps(exclusive_start_key)])
        response = aws_json(*cmd)
        for item in response.get("Items", []):
            if item.get("active", {}).get("BOOL") is not True:
                continue
            if item.get("groupId", {}).get("S") != "mayor-council":
                continue
            rows.append(
                {
                    "id": item.get("id", {}).get("S", ""),
                    "lineEn": item.get("lineEn", {}).get("S", ""),
                    "lineEs": item.get("lineEs", {}).get("S", ""),
                }
            )
        exclusive_start_key = response.get("LastEvaluatedKey")
        if not exclusive_start_key:
            break
    return rows


def line_looks_like_mayor(line: str) -> bool:
    trimmed = line.strip()
    if not trimmed:
        return False
    lower = trimmed.lower()
    if lower.startswith("mayor:") or lower.startswith("alcalde:"):
        return True
    colon = trimmed.find(":")
    if colon > 0:
        role = trimmed[:colon].strip().lower()
        if role in {"mayor", "alcalde"}:
            return True
    return bool(
        re.match(r"^mayor\s[-–—]", trimmed, re.I)
        or re.match(r"^alcalde\s[-–—]", trimmed, re.I)
    )


def mayor_line_present(rows: list[dict[str, str]]) -> bool:
    return any(
        line_looks_like_mayor(row.get("lineEn", ""))
        or line_looks_like_mayor(row.get("lineEs", ""))
        for row in rows
    )


def put_mayor_row() -> None:
    ts = now_iso()
    item = {
        "id": {"S": MAYOR_ROW_ID},
        "groupId": {"S": "mayor-council"},
        "lineEn": {"S": MAYOR_LINE_EN},
        "lineEs": {"S": MAYOR_LINE_ES},
        "displayOrder": {"N": "0"},
        "active": {"BOOL": True},
        "__typename": {"S": "LeadershipRosterEntry"},
        "createdAt": {"S": ts},
        "updatedAt": {"S": ts},
    }
    aws_put("dynamodb", "put-item", "--table-name", TABLE, "--item", json.dumps(item))
    print(f"Upserted LeadershipRosterEntry id={MAYOR_ROW_ID} ({MAYOR_LINE_EN})")


def main() -> int:
    rows = scan_active_mayor_council()
    print(f"Active mayor-council rows: {len(rows)}")
    if mayor_line_present(rows):
        print("Mayor line already present — nothing to do.")
        return 0

    put_mayor_row()
    print("DynamoDB stream should republish cms-snapshot.json within ~1 minute.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as error:
        print(f"ensure-mayor-roster-row: {error}", file=sys.stderr)
        raise SystemExit(1) from error
