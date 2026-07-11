#!/usr/bin/env python3
"""
Cursor Agent Hook — Session Start (Town of Wiley)

Provides the terminal policy as additional context at the start of every agent session.
"""

import json
import sys
from pathlib import Path


def load_town_aws_identity() -> str:
    repo_root = Path(__file__).resolve().parents[2]
    path = repo_root / "infrastructure" / "town-aws-account.json"
    if not path.is_file():
        return (
            "AWS identity: Town of Wiley account 570912405222, profile townofwiley, region us-east-2."
        )
    data = json.loads(path.read_text(encoding="utf-8"))
    acct = data.get("accountId", "570912405222")
    profile = data.get("defaultProfile", "townofwiley")
    region = data.get("primaryRegion", "us-east-2")
    agent = (data.get("agentAccess") or {}).get("iamUserName", "copilot")
    return (
        f"AWS identity (this repo only): account {acct}, IAM user {agent}, "
        f"CLI profile {profile}, region {region}. "
        f"Verify before mutating AWS: aws sts get-caller-identity (Arn should end with :user/{agent}). "
        f"See infrastructure/town-aws-account.json and .cursor/rules/aws-account.mdc."
    )


def main():
    # Reuse logic from the main policy script if possible, but keep simple
    output = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": (
                load_town_aws_identity()
                + "\n\nWorkspace terminal policy (enforced by .cursor/hooks/pre_tool_use.py):\n"
                "- Safe read-only HTTP diagnostics (curl / Invoke-WebRequest with no body) are auto-allowed.\n"
                "- Any command that sends a body or uses POST/PUT/PATCH/DELETE must ask the user.\n"
                "See the full Auto-Approval Policy in .cursor/rules/core-workflow.mdc."
            ),
        }
    }
    print(json.dumps(output))
    return 0


if __name__ == "__main__":
    sys.exit(main())
