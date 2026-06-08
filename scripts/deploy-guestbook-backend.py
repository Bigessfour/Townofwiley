"""
Deploy the Town of Wiley hello-from guestbook Lambda + DynamoDB table.

Usage:
    python scripts/deploy-guestbook-backend.py

Secrets block (optional) in secrets/local/user-secrets.json:

    {
      "guestbook": {
        "functionName": "TownOfWileyGuestbook",
        "roleName": "TownOfWileyGuestbookRole",
        "tableName": "TownOfWileyGuestbook",
        "allowedOrigin": "https://www.townofwiley.gov",
        "cognitoUserPoolId": "us-east-2_DmY7BCBIp",
        "cognitoClientId": "qss58u25b1kl9ih902o5i6cui"
      }
    }
"""

from __future__ import annotations

import argparse
import json
import os
import secrets as py_secrets
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

REPO_ROOT = Path(__file__).resolve().parent.parent
_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))
from _deploy_lambda_url import (  # noqa: E402
    ensure_none_auth_function_url_public_access,
    town_site_cors_origins,
)
from _deploy_npm import npm_install_cmd  # noqa: E402

SECRETS_PATH = REPO_ROOT / "secrets" / "local" / "user-secrets.json"
BACKEND_DIR = REPO_ROOT / "infrastructure" / "guestbook-lambda"

DEFAULT_USER_POOL_ID = "us-east-2_DmY7BCBIp"
DEFAULT_CLIENT_ID = "qss58u25b1kl9ih902o5i6cui"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy hello-from guestbook Lambda.")
    parser.add_argument("--function-name", default="")
    parser.add_argument("--role-name", default="")
    parser.add_argument("--table-name", default="")
    parser.add_argument("--allowed-origin", default="")
    parser.add_argument("--region", default="")
    parser.add_argument("--runtime", default="nodejs20.x")
    return parser.parse_args()


def load_local_secrets() -> dict[str, Any]:
    if not SECRETS_PATH.exists():
        return {}
    try:
        return json.loads(SECRETS_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"Warning: could not parse local secrets: {exc}", file=sys.stderr)
        return {}


def resolve_value(cli_value: str, secret_value: Any, fallback: str = "") -> str:
    if isinstance(cli_value, str) and cli_value.strip():
        return cli_value.strip()
    if isinstance(secret_value, str) and secret_value.strip():
        return secret_value.strip()
    return fallback.strip()


def run_aws(command: list[str], expect_json: bool = True, region: str = "") -> Any:
    process = subprocess.run(
        ["aws", *(["--region", region] if region else []), *command],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if process.returncode != 0:
        raise RuntimeError(
            process.stderr.strip()
            or process.stdout.strip()
            or "AWS CLI command failed."
        )
    output = process.stdout.strip()
    if not expect_json:
        return output
    return json.loads(output) if output else {}


def ensure_dynamo_table(table_name: str, region: str) -> str:
    try:
        result = run_aws(
            ["dynamodb", "describe-table", "--table-name", table_name], region=region
        )
        print(f"DynamoDB table already exists: {table_name}")
        return result["Table"]["TableArn"]
    except RuntimeError:
        pass

    print(f"Creating DynamoDB table: {table_name}")
    run_aws(
        [
            "dynamodb",
            "create-table",
            "--table-name",
            table_name,
            "--attribute-definitions",
            "AttributeName=id,AttributeType=S",
            "--key-schema",
            "AttributeName=id,KeyType=HASH",
            "--billing-mode",
            "PAY_PER_REQUEST",
        ],
        expect_json=False,
        region=region,
    )
    run_aws(
        ["dynamodb", "wait", "table-exists", "--table-name", table_name],
        expect_json=False,
        region=region,
    )
    result = run_aws(
        ["dynamodb", "describe-table", "--table-name", table_name], region=region
    )
    return result["Table"]["TableArn"]


def ensure_role(role_name: str, table_arn: str) -> str:
    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole",
            }
        ],
    }
    inline_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": ["dynamodb:PutItem", "dynamodb:Scan"],
                "Resource": [table_arn],
            },
            {
                "Effect": "Allow",
                "Action": [
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents",
                ],
                "Resource": "arn:aws:logs:*:*:*",
            },
        ],
    }

    try:
        role = run_aws(["iam", "get-role", "--role-name", role_name])
        role_arn: str = role["Role"]["Arn"]
        print(f"IAM role already exists: {role_arn}")
    except RuntimeError:
        with tempfile.NamedTemporaryFile(
            "w", suffix="-trust.json", delete=False, encoding="utf-8"
        ) as fh:
            json.dump(trust_policy, fh)
            trust_path = fh.name
        print(f"Creating IAM role: {role_name}")
        role = run_aws(
            [
                "iam",
                "create-role",
                "--role-name",
                role_name,
                "--assume-role-policy-document",
                f"file://{trust_path}",
            ]
        )
        role_arn = role["Role"]["Arn"]
        time.sleep(10)

    with tempfile.NamedTemporaryFile(
        "w", suffix="-policy.json", delete=False, encoding="utf-8"
    ) as fh:
        json.dump(inline_policy, fh)
        policy_path = fh.name

    run_aws(
        [
            "iam",
            "put-role-policy",
            "--role-name",
            role_name,
            "--policy-name",
            "TownOfWileyGuestbookPolicy",
            "--policy-document",
            f"file://{policy_path}",
        ],
        expect_json=False,
    )
    return role_arn


def package_lambda() -> Path:
    install_cmd = npm_install_cmd(BACKEND_DIR)
    print(f"Installing Lambda dependencies ({' '.join(install_cmd)}) …")
    subprocess.run(install_cmd, cwd=BACKEND_DIR, check=True)
    temp_dir = Path(tempfile.mkdtemp(prefix="townofwiley-guestbook-"))
    archive_path = temp_dir / "guestbook-lambda.zip"
    with ZipFile(archive_path, "w", ZIP_DEFLATED) as archive:
        for path in sorted(BACKEND_DIR.rglob("*")):
            if not path.is_file():
                continue
            if path.name.endswith(".test.mjs"):
                continue
            rel = path.relative_to(BACKEND_DIR)
            if rel.parts[0] == "node_modules" and rel.name.startswith("."):
                continue
            archive.write(path, rel)
    return archive_path


def ensure_lambda_function(
    function_name: str,
    role_arn: str,
    runtime: str,
    archive_path: Path,
    environment: dict[str, str],
    region: str,
) -> None:
    env_json = json.dumps({"Variables": environment})
    try:
        run_aws(
            ["lambda", "get-function", "--function-name", function_name], region=region
        )
        print(f"Updating Lambda code: {function_name}")
        run_aws(
            [
                "lambda",
                "update-function-code",
                "--function-name",
                function_name,
                "--zip-file",
                f"fileb://{archive_path}",
            ],
            region=region,
        )
        run_aws(
            ["lambda", "wait", "function-updated", "--function-name", function_name],
            expect_json=False,
            region=region,
        )
        run_aws(
            [
                "lambda",
                "update-function-configuration",
                "--function-name",
                function_name,
                "--handler",
                "index.handler",
                "--runtime",
                runtime,
                "--timeout",
                "15",
                "--memory-size",
                "256",
                "--role",
                role_arn,
                "--environment",
                env_json,
            ],
            region=region,
        )
    except RuntimeError:
        print(f"Creating Lambda function: {function_name}")
        run_aws(
            [
                "lambda",
                "create-function",
                "--function-name",
                function_name,
                "--runtime",
                runtime,
                "--role",
                role_arn,
                "--handler",
                "index.handler",
                "--timeout",
                "15",
                "--memory-size",
                "256",
                "--zip-file",
                f"fileb://{archive_path}",
                "--environment",
                env_json,
            ],
            region=region,
        )


def ensure_function_url(function_name: str, allowed_origin: str, region: str) -> str:
    cors = {
        "AllowOrigins": town_site_cors_origins(allowed_origin),
        "AllowMethods": ["GET", "POST"],
        "AllowHeaders": ["content-type", "authorization"],
        "MaxAge": 300,
    }
    try:
        result = run_aws(
            ["lambda", "get-function-url-config", "--function-name", function_name],
            region=region,
        )
        run_aws(
            [
                "lambda",
                "update-function-url-config",
                "--function-name",
                function_name,
                "--cors",
                json.dumps(cors),
            ],
            region=region,
        )
        url: str = result["FunctionUrl"]
    except RuntimeError:
        result = run_aws(
            [
                "lambda",
                "create-function-url-config",
                "--function-name",
                function_name,
                "--auth-type",
                "NONE",
                "--cors",
                json.dumps(cors),
            ],
            region=region,
        )
        url = result["FunctionUrl"]

    ensure_none_auth_function_url_public_access(function_name, region, run_aws)
    return url.rstrip("/")


def main() -> int:
    args = parse_args()
    secrets = load_local_secrets()
    gb = secrets.get("guestbook", {})
    aws_secrets = secrets.get("aws", {})

    region = resolve_value(
        args.region,
        aws_secrets.get("region"),
        os.environ.get("AWS_REGION", "us-east-2"),
    )
    function_name = resolve_value(
        args.function_name, gb.get("functionName"), "TownOfWileyGuestbook"
    )
    role_name = resolve_value(
        args.role_name, gb.get("roleName"), "TownOfWileyGuestbookRole"
    )
    table_name = resolve_value(
        args.table_name, gb.get("tableName"), "TownOfWileyGuestbook"
    )
    allowed_origin = resolve_value(
        args.allowed_origin, gb.get("allowedOrigin"), "https://www.townofwiley.gov"
    )
    user_pool_id = resolve_value("", gb.get("cognitoUserPoolId"), DEFAULT_USER_POOL_ID)
    client_id = resolve_value("", gb.get("cognitoClientId"), DEFAULT_CLIENT_ID)
    ip_hash_salt = resolve_value("", gb.get("ipHashSalt"), py_secrets.token_hex(16))

    table_arn = ensure_dynamo_table(table_name, region)
    role_arn = ensure_role(role_name, table_arn)
    archive_path = package_lambda()

    ensure_lambda_function(
        function_name=function_name,
        role_arn=role_arn,
        runtime=args.runtime,
        archive_path=archive_path,
        environment={
            "TABLE_NAME": table_name,
            "IP_HASH_SALT": ip_hash_salt,
            "COGNITO_USER_POOL_ID": user_pool_id,
            "COGNITO_CLIENT_ID": client_id,
            "STAFF_GROUP": "Staff",
        },
        region=region,
    )

    base_url = ensure_function_url(function_name, allowed_origin, region)

    print()
    print("=" * 60)
    print("Guestbook deployment complete.")
    print(f"Base URL (no trailing slash): {base_url}")
    print()
    print("Amplify env / secrets:")
    print(
        json.dumps(
            {
                "guestbook": {
                    "apiEndpoint": base_url,
                    "ipHashSalt": ip_hash_salt,
                }
            },
            indent=2,
        )
    )
    print("Then: npm run generate:runtime-config")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
