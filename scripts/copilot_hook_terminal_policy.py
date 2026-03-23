import argparse
import json
import re
import sys


READ_ONLY_METHODS = {"GET", "HEAD", "OPTIONS"}
HTTP_URL_RE = re.compile(r"https?://", re.IGNORECASE)
TERMINAL_TOOL_NAMES = {"run_in_terminal", "runCommands", "terminal", "terminal_command"}


def load_payload():
    try:
        raw = sys.stdin.read().strip()
        return json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        return {}


def session_start_output():
    return {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": (
                "Workspace terminal policy: read-only HTTP diagnostics using curl.exe or "
                "Invoke-WebRequest are explicitly allowed for HTTPS/HTTP endpoints. "
                "Commands that send bodies or use POST, PUT, PATCH, or DELETE should ask "
                "for confirmation instead of auto-running."
            ),
        }
    }


def extract_command(tool_input):
    if isinstance(tool_input, dict):
        command = tool_input.get("command")
        if isinstance(command, str):
            return command
    return ""


def contains_http_url(command):
    return bool(HTTP_URL_RE.search(command))


def detect_method(command):
    curl_method = re.search(r"(?:^|\s)-X\s+([A-Za-z]+)", command, re.IGNORECASE)
    if curl_method:
        return curl_method.group(1).upper()

    iwr_method = re.search(r"-Method\s+([A-Za-z]+)", command, re.IGNORECASE)
    if iwr_method:
        return iwr_method.group(1).upper()

    return "GET"


def has_request_body(command):
    body_flags = [
        r"(?:^|\s)--data(?:-raw|-binary)?(?:\s|=)",
        r"(?:^|\s)-d(?:\s|=)",
        r"(?:^|\s)--form(?:\s|=)",
        r"(?:^|\s)--upload-file(?:\s|=)",
        r"(?:^|\s)-Body(?:\s|:)",
        r"(?:^|\s)-InFile(?:\s|:)",
    ]
    return any(re.search(pattern, command, re.IGNORECASE) for pattern in body_flags)


def is_http_diagnostic_command(command):
    normalized = command.lower()
    return (
        normalized.startswith("curl ")
        or normalized.startswith("curl.exe ")
        or normalized.startswith("invoke-webrequest ")
        or normalized.startswith("iwr ")
    ) and contains_http_url(command)


def permission_output(decision, reason, context=None):
    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decision,
            "permissionDecisionReason": reason,
        }
    }
    if context:
        output["hookSpecificOutput"]["additionalContext"] = context
    return output


def pre_tool_use_output(payload):
    tool_name = payload.get("tool_name", "")
    if tool_name not in TERMINAL_TOOL_NAMES and "terminal" not in tool_name.lower():
        return {"continue": True}

    command = extract_command(payload.get("tool_input", {}))
    if not command:
        return {"continue": True}

    if not is_http_diagnostic_command(command):
        return {"continue": True}

    method = detect_method(command)
    if method in READ_ONLY_METHODS and not has_request_body(command):
        return permission_output(
            "allow",
            "Workspace policy allows read-only curl.exe and Invoke-WebRequest HTTP diagnostics.",
            "This command matches the workspace HTTP diagnostics allowlist.",
        )

    return permission_output(
        "ask",
        "HTTP requests with bodies or mutating methods require confirmation in this workspace.",
        "Read-only HTTP diagnostics are auto-allowed, but write-style network requests require approval.",
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--event", required=True)
    args = parser.parse_args()

    payload = load_payload()

    if args.event == "session-start":
        print(json.dumps(session_start_output()))
        return 0

    if args.event == "pre-tool-use":
        print(json.dumps(pre_tool_use_output(payload)))
        return 0

    print(json.dumps({"continue": True}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
