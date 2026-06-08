#!/usr/bin/env python3
"""
Ensure the Gen 1 Cognito Staff group exists and maps to the authenticated IAM role.

Environment (optional — defaults from infrastructure/gen1-production-bindings.json):
  COGNITO_USER_POOL_ID
  COGNITO_AUTH_ROLE_ARN
  STAFF_COGNITO_GROUP (default: Staff)

Examples:
  python scripts/setup-cognito-staff-group.py
  python scripts/setup-cognito-staff-group.py --create-user clerk@townofwiley.gov --set-temp-password
"""

from __future__ import annotations

import argparse
import json
import os
import secrets
import string
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BINDINGS_PATH = REPO_ROOT / "infrastructure" / "gen1-production-bindings.json"
DEFAULT_REGION = "us-east-2"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Configure Cognito Staff group for /admin CMS.")
    parser.add_argument("--user-pool-id", default="")
    parser.add_argument("--group-name", default="")
    parser.add_argument("--role-arn", default="")
    parser.add_argument("--region", default=DEFAULT_REGION)
    parser.add_argument("--create-user", default="", help="Create staff user with this email")
    parser.add_argument(
        "--set-temp-password",
        action="store_true",
        help="With --create-user, set a temporary password (FORCE_CHANGE_PASSWORD)",
    )
    parser.add_argument(
        "--print-password",
        action="store_true",
        help="Print generated temporary password",
    )
    return parser.parse_args()


def load_bindings() -> dict:
    if not BINDINGS_PATH.exists():
        raise RuntimeError(f"Missing bindings file: {BINDINGS_PATH}")
    return json.loads(BINDINGS_PATH.read_text(encoding="utf-8"))


def resolve_config(args: argparse.Namespace) -> tuple[str, str, str, str]:
    bindings = load_bindings()
    cognito = bindings.get("cognito", {})
    user_pool_id = (
        args.user_pool_id.strip()
        or os.environ.get("COGNITO_USER_POOL_ID", "").strip()
        or cognito.get("userPoolId", "").strip()
    )
    group_name = (
        args.group_name.strip()
        or os.environ.get("STAFF_COGNITO_GROUP", "").strip()
        or cognito.get("staffGroup", "Staff").strip()
    )
    role_arn = (
        args.role_arn.strip()
        or os.environ.get("COGNITO_AUTH_ROLE_ARN", "").strip()
        or cognito.get("authenticatedRoleArn", "").strip()
    )
    region = args.region.strip() or DEFAULT_REGION
    if not user_pool_id:
        raise RuntimeError("COGNITO_USER_POOL_ID is required")
    if not role_arn:
        raise RuntimeError("COGNITO_AUTH_ROLE_ARN is required")
    return user_pool_id, group_name, role_arn, region


def run_aws(command: list[str]) -> str:
    process = subprocess.run(["aws", *command], capture_output=True, text=True)
    if process.returncode != 0:
        stderr = process.stderr.strip()
        raise RuntimeError(stderr or process.stdout.strip() or "AWS CLI failed")
    return process.stdout.strip()


def group_exists(user_pool_id: str, group_name: str, region: str) -> bool:
    try:
        run_aws(
            [
                "cognito-idp",
                "get-group",
                "--user-pool-id",
                user_pool_id,
                "--group-name",
                group_name,
                "--region",
                region,
            ]
        )
        return True
    except RuntimeError as error:
        if "ResourceNotFoundException" in str(error):
            return False
        raise


def ensure_staff_group(
    user_pool_id: str, group_name: str, role_arn: str, region: str
) -> None:
    if group_exists(user_pool_id, group_name, region):
        print(f"Updating Cognito group {group_name} (precedence 0, role {role_arn})…")
        run_aws(
            [
                "cognito-idp",
                "update-group",
                "--user-pool-id",
                user_pool_id,
                "--group-name",
                group_name,
                "--description",
                "Town of Wiley staff CMS (/admin)",
                "--precedence",
                "0",
                "--role-arn",
                role_arn,
                "--region",
                region,
            ]
        )
        return

    print(f"Creating Cognito group {group_name} with IAM role {role_arn}…")
    run_aws(
        [
            "cognito-idp",
            "create-group",
            "--user-pool-id",
            user_pool_id,
            "--group-name",
            group_name,
            "--description",
            "Town of Wiley staff CMS (/admin)",
            "--precedence",
            "0",
            "--role-arn",
            role_arn,
            "--region",
            region,
        ]
    )


def user_exists(user_pool_id: str, email: str, region: str) -> bool:
    try:
        run_aws(
            [
                "cognito-idp",
                "admin-get-user",
                "--user-pool-id",
                user_pool_id,
                "--username",
                email,
                "--region",
                region,
            ]
        )
        return True
    except RuntimeError as error:
        if "UserNotFoundException" in str(error):
            return False
        raise


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


def ensure_staff_user(
    user_pool_id: str,
    group_name: str,
    email: str,
    region: str,
    set_temp_password: bool,
    print_password: bool,
) -> None:
    trimmed = email.strip()
    if not trimmed:
        return

    if not user_exists(user_pool_id, trimmed, region):
        print(f"Creating Cognito user {trimmed}…")
        run_aws(
            [
                "cognito-idp",
                "admin-create-user",
                "--user-pool-id",
                user_pool_id,
                "--username",
                trimmed,
                "--user-attributes",
                f"Name=email,Value={trimmed}",
                "Name=email_verified,Value=true",
                "--message-action",
                "SUPPRESS",
                "--region",
                region,
            ]
        )
    else:
        print(f"User {trimmed} already exists.")

    if set_temp_password:
        password = generate_password()
        run_aws(
            [
                "cognito-idp",
                "admin-set-user-password",
                "--user-pool-id",
                user_pool_id,
                "--username",
                trimmed,
                "--password",
                password,
                "--no-permanent",
                "--region",
                region,
            ]
        )
        if print_password:
            print(f"Temporary password for {trimmed}: {password}")
        else:
            print(
                f"Temporary password set for {trimmed}. "
                "Re-run with --print-password to display."
            )

    print(f"Adding {trimmed} to group {group_name}…")
    run_aws(
        [
            "cognito-idp",
            "admin-add-user-to-group",
            "--user-pool-id",
            user_pool_id,
            "--username",
            trimmed,
            "--group-name",
            group_name,
            "--region",
            region,
        ]
    )


def main() -> None:
    args = parse_args()
    user_pool_id, group_name, role_arn, region = resolve_config(args)
    ensure_staff_group(user_pool_id, group_name, role_arn, region)
    print(f"Staff group {group_name} is configured in pool {user_pool_id}.")

    if args.create_user.strip():
        ensure_staff_user(
            user_pool_id,
            group_name,
            args.create_user,
            region,
            args.set_temp_password,
            args.print_password,
        )


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)