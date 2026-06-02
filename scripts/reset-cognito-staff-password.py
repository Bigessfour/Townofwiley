#!/usr/bin/env python3
"""
Reset a Gen 2 Cognito staff user password (Town admin /admin/login).

Use when a user is stuck in FORCE_CHANGE_PASSWORD or forgot their temporary password.
Per AWS: ForgotPassword does not deliver codes while status is FORCE_CHANGE_PASSWORD.

Examples:
  python scripts/reset-cognito-staff-password.py --email bigessfour@gmail.com --temporary
  python scripts/reset-cognito-staff-password.py --email clerk@townofwiley.gov --permanent
  python scripts/reset-cognito-staff-password.py --email clerk@townofwiley.gov --admin-reset
"""

from __future__ import annotations

import argparse
import json
import secrets
import string
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BINDINGS_PATH = REPO_ROOT / "infrastructure" / "gen2-production-bindings.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Reset Cognito staff user password.")
    parser.add_argument("--email", required=True, help="Staff email (username)")
    parser.add_argument("--user-pool-id", default="")
    parser.add_argument("--region", default="us-east-2")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--temporary",
        action="store_true",
        help="Set a new temporary password (FORCE_CHANGE_PASSWORD; user signs in at /admin/login)",
    )
    group.add_argument(
        "--permanent",
        action="store_true",
        help="Set a permanent password (CONFIRMED; share securely with the user)",
    )
    group.add_argument(
        "--admin-reset",
        action="store_true",
        help="AdminResetUserPassword (RESET_REQUIRED + email code; requires CONFIRMED user)",
    )
    parser.add_argument(
        "--password",
        default="",
        help="Explicit password (otherwise a random compliant password is generated)",
    )
    parser.add_argument(
        "--print-password", action="store_true", help="Print generated password"
    )
    return parser.parse_args()


def load_pool_id(cli_value: str) -> str:
    if cli_value.strip():
        return cli_value.strip()
    if BINDINGS_PATH.exists():
        bindings = json.loads(BINDINGS_PATH.read_text(encoding="utf-8"))
        return bindings["cognitoGen2"]["userPoolId"]
    raise RuntimeError(
        "Pass --user-pool-id or add infrastructure/gen2-production-bindings.json"
    )


def run_aws(command: list[str]) -> str:
    process = subprocess.run(["aws", *command], capture_output=True, text=True)
    if process.returncode != 0:
        raise RuntimeError(
            process.stderr.strip() or process.stdout.strip() or "AWS CLI failed"
        )
    return process.stdout.strip()


def generate_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(c.islower() for c in password)
            and any(c.isupper() for c in password)
            and any(c.isdigit() for c in password)
            and any(c in "!@#$%^&*" for c in password)
        ):
            return password


def get_user_status(user_pool_id: str, email: str, region: str) -> str:
    output = run_aws(
        [
            "cognito-idp",
            "admin-get-user",
            "--user-pool-id",
            user_pool_id,
            "--username",
            email,
            "--region",
            region,
            "--query",
            "UserStatus",
            "--output",
            "text",
        ]
    )
    return output.strip()


def main() -> None:
    args = parse_args()
    email = args.email.strip()
    user_pool_id = load_pool_id(args.user_pool_id)
    region = args.region

    status = get_user_status(user_pool_id, email, region)
    print(f"User {email} status: {status}")

    if args.admin_reset:
        if status == "FORCE_CHANGE_PASSWORD":
            raise RuntimeError(
                "AdminResetUserPassword is blocked in FORCE_CHANGE_PASSWORD. "
                "Use --temporary or --permanent first."
            )
        run_aws(
            [
                "cognito-idp",
                "admin-reset-user-password",
                "--user-pool-id",
                user_pool_id,
                "--username",
                email,
                "--region",
                region,
            ]
        )
        print(
            "AdminResetUserPassword invoked. User should complete reset via /admin/login forgot password."
        )
        return

    password = args.password.strip() or generate_password()
    run_aws(
        [
            "cognito-idp",
            "admin-set-user-password",
            "--user-pool-id",
            user_pool_id,
            "--username",
            email,
            "--password",
            password,
            "--region",
            region,
            *(["--permanent"] if args.permanent else ["--no-permanent"]),
        ]
    )

    new_status = get_user_status(user_pool_id, email, region)
    print(f"Password updated. New status: {new_status}")
    if args.temporary or not args.permanent:
        print(
            "Instruct the user to sign in at /admin/login with this temporary password "
            "(not Forgot password). They will be prompted to set a new password."
        )
    if args.print_password or args.password:
        print(f"Password: {password}")
    else:
        print(
            "Password generated. Re-run with --print-password to display (share securely)."
        )


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
