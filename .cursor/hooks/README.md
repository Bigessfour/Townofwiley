# Cursor Agent Hooks — Town of Wiley

This directory contains project-level hooks that influence Cursor Composer / Agent behavior.

## Active Hooks

- `pre_tool_use.py` — Controls auto-approval of terminal commands (read-only HTTP diagnostics are auto-allowed; mutating or body-containing commands require confirmation).
- `session_start.py` — Injects the terminal safety policy as context at the start of every agent session.

## How It Works

These hooks are part of the **Cursor Agent Auto-Approval & Execution Policy** defined in:

- [`.cursor/rules/core-workflow.mdc`](../rules/core-workflow.mdc) (the main always-apply rule)

The policy tells the agent:
- When it **may** auto-approve edits and safe commands
- When it **must** ask the user

## Source of Truth

The original implementation lives at:

`scripts/copilot_hook_terminal_policy.py`

Changes should usually be made there and then synced to this directory.

## Enabling in Cursor

Cursor should discover hooks placed in `.cursor/hooks/`. If behavior is not as expected:

1. Reload the Cursor window.
2. Check **Cursor Settings → Chat** for global auto-approve toggles.
3. Reference the policy explicitly in chat: "Follow the Auto-Approval Policy in core-workflow.mdc".
