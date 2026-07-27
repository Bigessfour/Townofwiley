#!/usr/bin/env python3
"""Static guard: refuse the empty-shell MIME wrap pattern in the email router.

The previous forwarder attached originals as ``original-message.eml``
(``message/rfc822``). Outlook often shows an empty body for that design.
This script fails CI/deploy if those markers reappear in source.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
APP_PATH = REPO_ROOT / "infrastructure" / "email-alias-router" / "app.py"

# Patterns that indicate the old wrap-shell design is back.
FORBIDDEN_PATTERNS = (
    r"original-message\.eml",
    r"The original message is attached",
    r'subtype\s*=\s*["\']rfc822["\']',
    r'maintype\s*=\s*["\']message["\'].*subtype\s*=\s*["\']rfc822["\']',
)

REQUIRED_SYMBOLS = (
    "assert_mime_passthrough_integrity",
    "FORBIDDEN_WRAP_MARKERS",
    "build_forward_email",
)


def main() -> int:
    if not APP_PATH.is_file():
        print(f"ERROR: missing {APP_PATH}", file=sys.stderr)
        return 1

    source = APP_PATH.read_text(encoding="utf-8")
    failures: list[str] = []

    for symbol in REQUIRED_SYMBOLS:
        if symbol not in source:
            failures.append(f"missing required symbol: {symbol}")

    # Only flag forbidden patterns when they appear as active code, not docs.
    # Comments that say "do not reintroduce original-message.eml" are allowed
    # if they appear only in comment/string contexts that also mention regression.
    # Fail hard on add_attachment of message/rfc822 or set_content wrap preambles.
    if re.search(r"add_attachment\s*\([\s\S]{0,200}rfc822", source):
        failures.append(
            "add_attachment(... rfc822 ...) found — empty-shell wrap is forbidden"
        )

    if re.search(r'set_content\s*\(\s*[\s\S]{0,300}original message is attached', source):
        failures.append(
            "set_content wrap preamble found — empty-shell wrap is forbidden"
        )

    # Bare filename constant used as attachment name is forbidden.
    if re.search(r'filename\s*=\s*["\']original-message\.eml["\']', source):
        failures.append('filename="original-message.eml" assignment is forbidden')

    # Ensure passthrough still strips then rewrites headers (not a no-op stub).
    if "HEADERS_TO_STRIP" not in source or "_set_single_header" not in source:
        failures.append("header rewrite helpers missing from passthrough implementation")

    if failures:
        print("MIME passthrough verify FAILED:", file=sys.stderr)
        for item in failures:
            print(f"  - {item}", file=sys.stderr)
        return 1

    print(f"OK: MIME passthrough guards present in {APP_PATH.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
