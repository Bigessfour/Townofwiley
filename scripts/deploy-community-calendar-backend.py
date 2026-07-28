#!/usr/bin/env python3
"""Deploy Town of Wiley Community Calendar backend (Lambda + DynamoDB + Function URL)."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

REPO_ROOT = Path(__file__).resolve().parent.parent
SECRETS_PATH = REPO_ROOT / "secrets" / "local" / "user-secrets.json"
BACKEND_DIR = REPO_ROOT / "infrastructure" / "community-calendar"
MANIFEST_PATH = REPO_ROOT / "infrastructure" / "aws-infrastructure.manifest.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Deploy the Town of Wiley community calendar backend."
    )
    parser.add_argument("--function-name", default="TownOfWileyCommunityCalendar")
    parser.add_argument("--role-name", default="TownOfWileyCommunityCalendarRole")
    parser.add_argument("--events-table", default="TownOfWileyCommunityEvents")
    parser.add_argument("--sender-email", default="")
    parser.add_argument("--sender-name", default="Town of Wiley")
    parser.add_argument("--clerk-email", default="clerk@townofwiley.gov")
    parser.add_argument("--runtime", default="python3.13")
    parser.add_argument("--skip-manifest-update", action="store_true")
    return parser.parse_args()


def load_local_secrets() -> dict[str, Any]:
    if not SECRETS_PATH.exists():
        return {}
    return json.loads(SECRETS_PATH.read_text(encoding="utf-8"))


def ensure_env_from_secrets(secrets: dict[str, Any]) -> None:
    aws_secrets = secrets.get("aws", {})
    if os.environ.get("AWS_PROFILE") or os.environ.get("AWS_DEFAULT_PROFILE"):
        if not os.environ.get("AWS_REGION") and aws_secrets.get("region"):
            os.environ["AWS_REGION"] = aws_secrets["region"]
        return
    if not os.environ.get("AWS_ACCESS_KEY_ID") and aws_secrets.get("accessKeyId"):
        os.environ["AWS_ACCESS_KEY_ID"] = aws_secrets["accessKeyId"]
    if not os.environ.get("AWS_SECRET_ACCESS_KEY") and aws_secrets.get(
        "secretAccessKey"
    ):
        os.environ["AWS_SECRET_ACCESS_KEY"] = aws_secrets["secretAccessKey"]
    if not os.environ.get("AWS_SESSION_TOKEN") and aws_secrets.get("sessionToken"):
        os.environ["AWS_SESSION_TOKEN"] = aws_secrets["sessionToken"]
    if not os.environ.get("AWS_REGION") and aws_secrets.get("region"):
        os.environ["AWS_REGION"] = aws_secrets["region"]


def run_aws(command: list[str], expect_json: bool = True) -> Any:
    process = subprocess.run(
        ["aws", *command],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if process.returncode != 0:
        raise RuntimeError(process.stderr.strip() or "AWS CLI command failed.")
    output = process.stdout.strip()
    if not expect_json:
        return output
    return json.loads(output) if output else {}


def package_backend() -> Path:
    temp_dir = Path(tempfile.mkdtemp(prefix="townofwiley-community-calendar-"))
    deps_dir = temp_dir / "deps"
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "-r",
            str(BACKEND_DIR / "requirements.txt"),
            "-t",
            str(deps_dir),
            "--quiet",
        ],
        check=True,
    )
    archive_path = temp_dir / "community-calendar.zip"
    with ZipFile(archive_path, "w", ZIP_DEFLATED) as archive:
        for path in BACKEND_DIR.rglob("*.py"):
            if "tests" in path.parts:
                continue
            archive.write(path, path.relative_to(BACKEND_DIR))
        for path in deps_dir.rglob("*"):
            if path.is_file():
                archive.write(path, path.relative_to(deps_dir))
    return archive_path


def ensure_table(table_name: str) -> str:
    try:
        table = run_aws(["dynamodb", "describe-table", "--table-name", table_name])
        return table["Table"]["TableArn"]
    except RuntimeError:
        run_aws(
            [
                "dynamodb",
                "create-table",
                "--table-name",
                table_name,
                "--attribute-definitions",
                "AttributeName=eventId,AttributeType=S",
                "AttributeName=status,AttributeType=S",
                "AttributeName=endDateTime,AttributeType=S",
                "--key-schema",
                "AttributeName=eventId,KeyType=HASH",
                "--global-secondary-indexes",
                json.dumps(
                    [
                        {
                            "IndexName": "statusEndIndex",
                            "KeySchema": [
                                {"AttributeName": "status", "KeyType": "HASH"},
                                {"AttributeName": "endDateTime", "KeyType": "RANGE"},
                            ],
                            "Projection": {"ProjectionType": "ALL"},
                        }
                    ]
                ),
                "--billing-mode",
                "PAY_PER_REQUEST",
            ]
        )
        run_aws(
            ["dynamodb", "wait", "table-exists", "--table-name", table_name],
            expect_json=False,
        )
        table = run_aws(["dynamodb", "describe-table", "--table-name", table_name])
        return table["Table"]["TableArn"]


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
                "Action": [
                    "dynamodb:GetItem",
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem",
                    "dynamodb:Query",
                    "dynamodb:Scan",
                ],
                "Resource": [table_arn, f"{table_arn}/index/*"],
            },
            {
                "Effect": "Allow",
                "Action": ["ses:SendEmail", "ses:SendRawEmail", "sesv2:SendEmail"],
                "Resource": "*",
            },
        ],
    }

    try:
        role = run_aws(["iam", "get-role", "--role-name", role_name])
        role_arn = role["Role"]["Arn"]
    except RuntimeError:
        with tempfile.NamedTemporaryFile(
            "w", suffix="-trust.json", delete=False, encoding="utf-8"
        ) as file_handle:
            json.dump(trust_policy, file_handle)
            trust_path = file_handle.name
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
        run_aws(
            [
                "iam",
                "attach-role-policy",
                "--role-name",
                role_name,
                "--policy-arn",
                "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            ],
            expect_json=False,
        )
        time.sleep(10)

    with tempfile.NamedTemporaryFile(
        "w", suffix="-policy.json", delete=False, encoding="utf-8"
    ) as file_handle:
        json.dump(inline_policy, file_handle)
        policy_path = file_handle.name

    run_aws(
        [
            "iam",
            "put-role-policy",
            "--role-name",
            role_name,
            "--policy-name",
            "TownOfWileyCommunityCalendarPolicy",
            "--policy-document",
            f"file://{policy_path}",
        ],
        expect_json=False,
    )
    return role_arn


def ensure_lambda_function(
    function_name: str,
    role_arn: str,
    runtime: str,
    archive_path: Path,
    environment: dict[str, str],
) -> str:
    env_payload = {"Variables": environment}
    try:
        run_aws(["lambda", "get-function", "--function-name", function_name])
        run_aws(
            [
                "lambda",
                "update-function-code",
                "--function-name",
                function_name,
                "--zip-file",
                f"fileb://{archive_path}",
            ]
        )
        time.sleep(2)
        run_aws(
            [
                "lambda",
                "update-function-configuration",
                "--function-name",
                function_name,
                "--runtime",
                runtime,
                "--handler",
                "index.handler",
                "--timeout",
                "30",
                "--memory-size",
                "256",
                "--environment",
                json.dumps(env_payload),
            ]
        )
    except RuntimeError:
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
                "30",
                "--memory-size",
                "256",
                "--zip-file",
                f"fileb://{archive_path}",
                "--environment",
                json.dumps(env_payload),
            ]
        )
    details = run_aws(["lambda", "get-function", "--function-name", function_name])
    return details["Configuration"]["FunctionArn"]


def ensure_function_url(function_name: str) -> str:
    cors = {
        "AllowCredentials": False,
        "AllowHeaders": ["content-type", "authorization"],
        "AllowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "AllowOrigins": [
            "https://townofwiley.gov",
            "https://www.townofwiley.gov",
            "https://staging.townofwiley.gov",
            "http://localhost:4200",
            "http://localhost:4300",
            "http://127.0.0.1:4200",
            "http://127.0.0.1:4300",
        ],
        "MaxAge": 86400,
    }
    try:
        existing = run_aws(
            [
                "lambda",
                "list-function-url-configs",
                "--function-name",
                function_name,
            ]
        )
        configs = existing.get("FunctionUrlConfigs") or []
        if configs:
            run_aws(
                [
                    "lambda",
                    "update-function-url-config",
                    "--function-name",
                    function_name,
                    "--auth-type",
                    "NONE",
                    "--cors",
                    json.dumps(cors),
                ]
            )
            return str(configs[0]["FunctionUrl"]).rstrip("/")
    except RuntimeError:
        pass

    created = run_aws(
        [
            "lambda",
            "create-function-url-config",
            "--function-name",
            function_name,
            "--auth-type",
            "NONE",
            "--cors",
            json.dumps(cors),
        ]
    )
    # Public invoke permission
    try:
        run_aws(
            [
                "lambda",
                "add-permission",
                "--function-name",
                function_name,
                "--statement-id",
                "FunctionURLAllowPublicInvoke",
                "--action",
                "lambda:InvokeFunctionUrl",
                "--principal",
                "*",
                "--function-url-auth-type",
                "NONE",
            ],
            expect_json=False,
        )
    except RuntimeError:
        pass
    try:
        run_aws(
            [
                "lambda",
                "add-permission",
                "--function-name",
                function_name,
                "--statement-id",
                "FunctionURLAllowPublicInvokeFunction",
                "--action",
                "lambda:InvokeFunction",
                "--principal",
                "*",
            ],
            expect_json=False,
        )
    except RuntimeError:
        pass
    return str(created["FunctionUrl"]).rstrip("/")


def update_manifest(function_name: str, function_url: str) -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    functions = manifest.setdefault("lambdaFunctions", [])
    entry = {
        "functionName": function_name,
        "region": "us-east-2",
        "runtime": "python",
        "codePath": "infrastructure/community-calendar",
        "functionUrl": {"authType": "NONE", "required": True},
        "functionUrlEndpoint": f"{function_url}/",
        "deployScript": "scripts/deploy-community-calendar-backend.py",
        "required": False,
        "notes": "Community calendar submissions + clerk email approve/reject",
    }
    replaced = False
    for index, existing in enumerate(functions):
        if existing.get("functionName") == function_name:
            functions[index] = {**existing, **entry}
            replaced = True
            break
    if not replaced:
        functions.append(entry)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    secrets = load_local_secrets()
    ensure_env_from_secrets(secrets)

    if not os.environ.get("AWS_REGION"):
        raise RuntimeError("AWS_REGION is required before deployment can continue.")

    sender_email = (
        args.sender_email
        or secrets.get("communityCalendar", {}).get("senderEmail", "")
        or secrets.get("weather", {}).get("alertSignup", {}).get("senderEmail", "")
        or "noreply@townofwiley.gov"
    )

    archive_path = package_backend()
    table_arn = ensure_table(args.events_table)
    role_arn = ensure_role(args.role_name, table_arn)

    bindings_path = REPO_ROOT / "infrastructure" / "gen1-production-bindings.json"
    cognito = {}
    if bindings_path.exists():
        cognito = json.loads(bindings_path.read_text(encoding="utf-8")).get(
            "cognito", {}
        )

    environment = {
        "EVENTS_TABLE": args.events_table,
        "SENDER_EMAIL": sender_email,
        "SENDER_NAME": args.sender_name,
        "CLERK_EMAIL": args.clerk_email,
        "PUBLIC_API_BASE_URL": "",
        "COGNITO_USER_POOL_ID": str(cognito.get("userPoolId") or ""),
        "COGNITO_CLIENT_ID": str(cognito.get("userPoolClientId") or ""),
        "STAFF_GROUP": str(cognito.get("staffGroup") or "Staff"),
    }
    ensure_lambda_function(
        args.function_name, role_arn, args.runtime, archive_path, environment
    )
    function_url = ensure_function_url(args.function_name)
    # Persist Function URL into Lambda env for token links
    environment["PUBLIC_API_BASE_URL"] = function_url
    ensure_lambda_function(
        args.function_name, role_arn, args.runtime, archive_path, environment
    )

    if not args.skip_manifest_update:
        update_manifest(args.function_name, function_url)

    print(f"Deployed {args.function_name}")
    print(f"Function URL: {function_url}")
    print("Set COMMUNITY_CALENDAR_ENDPOINT to this URL for runtime-config.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # noqa: BLE001
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1) from error
