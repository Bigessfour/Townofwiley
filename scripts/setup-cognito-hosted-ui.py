#!/usr/bin/env python3
"""Configure Cognito Hosted UI domain + OAuth on the Gen 1 staff user pool app client."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BINDINGS_PATH = REPO_ROOT / "infrastructure" / "gen1-production-bindings.json"
DEFAULT_DOMAIN_PREFIX = "townofwiley-staff"
DEFAULT_REGION = "us-east-2"

CALLBACK_URLS = [
    "https://townofwiley.gov/admin/login",
    "https://www.townofwiley.gov/admin/login",
    "http://localhost:4200/admin/login",
]

LOGOUT_URLS = [
    "https://townofwiley.gov/admin",
    "https://www.townofwiley.gov/admin",
    "http://localhost:4200/admin",
]


def aws_json(command: list[str]) -> dict | None:
    process = subprocess.run(
        ["aws", *command, "--output", "json"],
        capture_output=True,
        text=True,
    )
    if process.returncode != 0:
        stderr = process.stderr.strip()
        raise RuntimeError(stderr or process.stdout.strip() or "AWS CLI failed")
    text = process.stdout.strip()
    return json.loads(text) if text else None


def aws_run(command: list[str]) -> None:
    process = subprocess.run(["aws", *command], capture_output=True, text=True)
    if process.returncode != 0:
        stderr = process.stderr.strip()
        if (
            "ResourceConflictException" in stderr
            and "create-user-pool-domain" in " ".join(command)
        ):
            return
        raise RuntimeError(stderr or process.stdout.strip() or "AWS CLI failed")


def load_bindings() -> dict:
    if not BINDINGS_PATH.exists():
        raise RuntimeError(f"Missing bindings file: {BINDINGS_PATH}")
    return json.loads(BINDINGS_PATH.read_text(encoding="utf-8"))


def ensure_hosted_ui_domain(user_pool_id: str, domain_prefix: str, region: str) -> str:
    try:
        existing = aws_json(
            [
                "cognito-idp",
                "describe-user-pool-domain",
                "--domain",
                domain_prefix,
                "--region",
                region,
            ]
        )
        if (
            existing
            and existing.get("DomainDescription", {}).get("UserPoolId") == user_pool_id
        ):
            print(
                f"Hosted UI domain already exists: {domain_prefix}.auth.{region}.amazoncognito.com"
            )
            return domain_prefix
    except RuntimeError:
        pass

    print(f"Creating Hosted UI domain prefix {domain_prefix}…")
    aws_run(
        [
            "cognito-idp",
            "create-user-pool-domain",
            "--domain",
            domain_prefix,
            "--user-pool-id",
            user_pool_id,
            "--region",
            region,
        ]
    )
    return domain_prefix


def merge_unique(existing: list[str] | None, required: list[str]) -> list[str]:
    seen: set[str] = set()
    merged: list[str] = []
    for value in (existing or []) + required:
        trimmed = value.strip()
        if trimmed and trimmed not in seen:
            seen.add(trimmed)
            merged.append(trimmed)
    return merged


def describe_app_client(user_pool_id: str, client_id: str, region: str) -> dict | None:
    try:
        described = aws_json(
            [
                "cognito-idp",
                "describe-user-pool-client",
                "--user-pool-id",
                user_pool_id,
                "--client-id",
                client_id,
                "--region",
                region,
            ]
        )
        return described["UserPoolClient"]
    except RuntimeError as error:
        if "ResourceNotFoundException" not in str(error):
            raise
        return None


def list_app_client_ids(user_pool_id: str, region: str) -> list[str]:
    described = aws_json(
        [
            "cognito-idp",
            "list-user-pool-clients",
            "--user-pool-id",
            user_pool_id,
            "--max-results",
            "60",
            "--region",
            region,
        ]
    )
    return [entry["ClientId"] for entry in described.get("UserPoolClients", [])]


def create_staff_app_client(user_pool_id: str, region: str) -> str:
    print("No app client found — creating townofwiley-staff-web client…")
    created = aws_json(
        [
            "cognito-idp",
            "create-user-pool-client",
            "--user-pool-id",
            user_pool_id,
            "--client-name",
            "townofwiley-staff-web",
            "--no-generate-secret",
            "--explicit-auth-flows",
            "ALLOW_USER_SRP_AUTH",
            "ALLOW_REFRESH_TOKEN_AUTH",
            "ALLOW_USER_PASSWORD_AUTH",
            "--supported-identity-providers",
            "COGNITO",
            "--callback-urls",
            *CALLBACK_URLS,
            "--logout-urls",
            *LOGOUT_URLS,
            "--allowed-o-auth-flows",
            "code",
            "--allowed-o-auth-scopes",
            "openid",
            "email",
            "profile",
            "--allowed-o-auth-flows-user-pool-client",
            "--region",
            region,
        ]
    )
    client_id = created["UserPoolClient"]["ClientId"]
    print(f"Created app client {client_id}")
    return client_id


def resolve_app_client_id(
    user_pool_id: str, preferred_client_id: str, region: str
) -> str:
    client = describe_app_client(user_pool_id, preferred_client_id, region)
    if client:
        return preferred_client_id

    existing_ids = list_app_client_ids(user_pool_id, region)
    if existing_ids:
        print(
            f"Bindings client {preferred_client_id} not found; using existing pool client {existing_ids[0]}"
        )
        return existing_ids[0]

    return create_staff_app_client(user_pool_id, region)


def update_bindings_client_id(client_id: str) -> None:
    bindings = load_bindings()
    cognito = bindings.setdefault("cognito", {})
    if cognito.get("userPoolClientId") == client_id:
        return
    cognito["userPoolClientId"] = client_id
    BINDINGS_PATH.write_text(json.dumps(bindings, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {BINDINGS_PATH} with userPoolClientId={client_id}")


def configure_app_client_oauth(
    user_pool_id: str,
    client_id: str,
    region: str,
) -> None:
    client = describe_app_client(user_pool_id, client_id, region)
    if not client:
        raise RuntimeError(
            f"App client {client_id} does not exist in pool {user_pool_id}"
        )

    update_args = [
        "cognito-idp",
        "update-user-pool-client",
        "--user-pool-id",
        user_pool_id,
        "--client-id",
        client_id,
        "--region",
        region,
        "--callback-urls",
        *merge_unique(client.get("CallbackURLs"), CALLBACK_URLS),
        "--logout-urls",
        *merge_unique(client.get("LogoutURLs"), LOGOUT_URLS),
        "--allowed-o-auth-flows",
        "code",
        "--allowed-o-auth-scopes",
        "openid",
        "email",
        "profile",
        "--allowed-o-auth-flows-user-pool-client",
        "--supported-identity-providers",
        *merge_unique(client.get("SupportedIdentityProviders"), ["COGNITO"]),
    ]

    if client.get("ClientName"):
        update_args.extend(["--client-name", client["ClientName"]])

    refresh_token_validity = client.get("RefreshTokenValidity")
    if refresh_token_validity is not None:
        update_args.extend(["--refresh-token-validity", str(refresh_token_validity)])

    print("Updating app client OAuth settings (Hosted UI / authorization code grant)…")
    aws_run(update_args)


def update_bindings_hosted_ui_domain(domain_prefix: str, region: str) -> None:
    bindings = load_bindings()
    hosted_domain = f"{domain_prefix}.auth.{region}.amazoncognito.com"
    cognito = bindings.setdefault("cognito", {})
    if cognito.get("hostedUiDomain") == hosted_domain:
        print(f"Bindings already record hostedUiDomain={hosted_domain}")
        return
    cognito["hostedUiDomain"] = hosted_domain
    BINDINGS_PATH.write_text(json.dumps(bindings, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {BINDINGS_PATH} with hostedUiDomain")


def main() -> None:
    domain_prefix = DEFAULT_DOMAIN_PREFIX
    if len(sys.argv) > 1:
        domain_prefix = sys.argv[1].strip()

    bindings = load_bindings()
    cognito = bindings["cognito"]
    user_pool_id = cognito["userPoolId"]
    preferred_client_id = cognito["userPoolClientId"]
    region = DEFAULT_REGION

    prefix = ensure_hosted_ui_domain(user_pool_id, domain_prefix, region)
    client_id = resolve_app_client_id(user_pool_id, preferred_client_id, region)
    update_bindings_client_id(client_id)
    configure_app_client_oauth(user_pool_id, client_id, region)
    update_bindings_hosted_ui_domain(prefix, region)
    print("Cognito Hosted UI configuration complete.")


if __name__ == "__main__":
    main()
