#!/usr/bin/env python3
"""
Cursor Agent Hook — Session Start (Town of Wiley)

Provides the terminal policy as additional context at the start of every agent session.
"""

import json
import sys


def main():
    # Reuse logic from the main policy script if possible, but keep simple
    output = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": (
                "Workspace terminal policy (enforced by .cursor/hooks/pre_tool_use.py):\n"
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
