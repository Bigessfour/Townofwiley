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

sys.path.insert(0, str(REPO_ROOT / "scripts"))
from _deploy_lambda_url import ensure_handler_only_function_url_cors  # noqa: E402


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
    parser.add_argument(
        "--mail-transport",
        default="",
        choices=["", "smtp", "ses"],
        help="smtp (MailPlus) or ses. Default: smtp when SMTP secret/creds exist.",
    )
    parser.add_argument("--smtp-host", default="")
    parser.add_argument("--smtp-port", default="")
    parser.add_argument("--smtp-user", default="")
    parser.add_argument(
        "--smtp-secret-id",
        default="townofwiley/community-calendar/smtp",
        help="Secrets Manager id for MailPlus SMTP JSON (password, optional host/user).",
    )
    parser.add_argument("--runtime", default="python3.13")
    parser.add_argument("--skip-manifest-update", action="store_true")
    return parser.parse_args()


SMTP_SECRET_ID_DEFAULT = "townofwiley/community-calendar/smtp"


def load_local_secrets() -> dict[str, Any]:
    if not SECRETS_PATH.exists():
        return {}
    return json.loads(SECRETS_PATH.read_text(encoding="utf-8"))


def community_calendar_secrets(secrets: dict[str, Any]) -> dict[str, Any]:
    block = secrets.get("communityCalendar")
    return block if isinstance(block, dict) else {}


def resolve_smtp_secret_payload(
    args: argparse.Namespace, secrets: dict[str, Any]
) -> dict[str, Any] | None:
    """Build SMTP secret JSON from CLI / env / local user-secrets (never commit)."""
    calendar = community_calendar_secrets(secrets)
    smtp_block = calendar.get("smtp") if isinstance(calendar.get("smtp"), dict) else {}
    username = (
        (args.smtp_user or "").strip()
        or os.environ.get("SMTP_USER", "").strip()
        or str(smtp_block.get("username") or smtp_block.get("user") or "").strip()
    )
    password = (
        os.environ.get("SMTP_PASSWORD", "").strip()
        or str(smtp_block.get("password") or "").strip()
    )
    if not username or not password:
        return None
    host = (
        (args.smtp_host or "").strip()
        or os.environ.get("SMTP_HOST", "").strip()
        or str(smtp_block.get("host") or "").strip()
        or "mail.townofwiley.gov"
    )
    port_raw = (
        (args.smtp_port or "").strip()
        or os.environ.get("SMTP_PORT", "").strip()
        or str(smtp_block.get("port") or "587")
    )
    try:
        port = int(port_raw)
    except ValueError:
        port = 587
    sender_email = (
        (args.sender_email or "").strip()
        or str(calendar.get("senderEmail") or "").strip()
        or str(smtp_block.get("senderEmail") or "").strip()
        or "noreply@townofwiley.gov"
    )
    return {
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "senderEmail": sender_email,
        "senderName": args.sender_name or "Town of Wiley",
        "useSsl": port == 465,
    }


def ensure_smtp_secret(secret_id: str, payload: dict[str, Any] | None) -> bool:
    """Create/update Secrets Manager secret when payload is provided. Returns True if secret exists."""
    if not secret_id:
        return False
    exists = False
    try:
        run_aws(
            [
                "secretsmanager",
                "describe-secret",
                "--secret-id",
                secret_id,
            ]
        )
        exists = True
    except RuntimeError:
        exists = False

    if payload is None:
        return exists

    secret_string = json.dumps(payload)
    if exists:
        run_aws(
            [
                "secretsmanager",
                "put-secret-value",
                "--secret-id",
                secret_id,
                "--secret-string",
                secret_string,
            ],
            expect_json=False,
        )
        print(f"Updated SMTP secret {secret_id}")
        return True

    run_aws(
        [
            "secretsmanager",
            "create-secret",
            "--name",
            secret_id,
            "--description",
            "MailPlus SMTP credentials for community calendar clerk notifications",
            "--secret-string",
            secret_string,
        ]
    )
    print(f"Created SMTP secret {secret_id}")
    return True


def secret_arn_for_id(secret_id: str) -> str:
    account = run_aws(["sts", "get-caller-identity"])["Account"]
    region = (
        os.environ.get("AWS_REGION")
        or os.environ.get("AWS_DEFAULT_REGION")
        or "us-east-2"
    )
    # Wildcard suffix matches Secrets Manager random suffix on the ARN.
    return f"arn:aws:secretsmanager:{region}:{account}:secret:{secret_id}*"


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


def ensure_role(
    role_name: str, table_arn: str, smtp_secret_id: str = SMTP_SECRET_ID_DEFAULT
) -> str:
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
            {
                "Effect": "Allow",
                "Action": ["secretsmanager:GetSecretValue"],
                "Resource": [
                    secret_arn_for_id(smtp_secret_id or SMTP_SECRET_ID_DEFAULT),
                ],
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

    def update_existing() -> None:
        wait_lambda_updated(function_name)
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
        wait_lambda_updated(function_name)
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
        wait_lambda_updated(function_name)

    try:
        run_aws(["lambda", "get-function", "--function-name", function_name])
        update_existing()
    except RuntimeError as error:
        if "ResourceNotFoundException" not in str(
            error
        ) and "Function not found" not in str(error):
            # Function may exist but be briefly unreadable; try update path.
            try:
                update_existing()
            except RuntimeError:
                raise error from error
        else:
            try:
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
            except RuntimeError as create_error:
                if "ResourceConflictException" in str(create_error):
                    update_existing()
                else:
                    raise
    details = run_aws(["lambda", "get-function", "--function-name", function_name])
    return details["Configuration"]["FunctionArn"]


def wait_lambda_updated(function_name: str, *, attempts: int = 30) -> None:
    for _ in range(attempts):
        state = run_aws(
            [
                "lambda",
                "get-function-configuration",
                "--function-name",
                function_name,
                "--query",
                "LastUpdateStatus",
                "--output",
                "text",
            ],
            expect_json=False,
        ).strip()
        if state in {"Successful", "None", ""}:
            return
        if state == "Failed":
            raise RuntimeError(f"Lambda {function_name} last update failed.")
        time.sleep(2)
    raise RuntimeError(
        f"Timed out waiting for Lambda {function_name} to finish updating."
    )


def ensure_function_url(function_name: str) -> str:
    """Handler-only CORS — Function URL must not emit a second ACAO header."""
    region = (
        os.environ.get("AWS_REGION")
        or os.environ.get("AWS_DEFAULT_REGION")
        or "us-east-2"
    )

    def run_aws_with_region(
        command: list[str], expect_json: bool = True, region: str | None = None
    ) -> Any:
        if region:
            os.environ.setdefault("AWS_DEFAULT_REGION", region)
            os.environ.setdefault("AWS_REGION", region)
        return run_aws(command, expect_json=expect_json)

    return ensure_handler_only_function_url_cors(
        function_name, region, run_aws_with_region
    ).rstrip("/")


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

    calendar = community_calendar_secrets(secrets)
    sender_email = (
        args.sender_email
        or calendar.get("senderEmail", "")
        or secrets.get("weather", {}).get("alertSignup", {}).get("senderEmail", "")
        or "noreply@townofwiley.gov"
    )

    smtp_secret_id = (args.smtp_secret_id or SMTP_SECRET_ID_DEFAULT).strip()
    smtp_payload = resolve_smtp_secret_payload(args, secrets)

    mail_transport = (args.mail_transport or "").strip().lower()
    if not mail_transport:
        # Default: SES for resident→clerk form notifications (MailPlus keeps inbound MX).
        mail_transport = "ses"

    smtp_ready = False
    if mail_transport == "smtp":
        # Only create/update Secrets Manager when explicitly deploying SMTP.
        # SES deploys must not overwrite production MailPlus credentials.
        smtp_ready = ensure_smtp_secret(smtp_secret_id, smtp_payload)
    elif smtp_payload is not None:
        print(
            "NOTE: Local SMTP credentials were found but MAIL_TRANSPORT=ses; "
            "not writing Secrets Manager secret "
            f"{smtp_secret_id!r}.",
            file=sys.stderr,
        )

    if mail_transport == "smtp" and not smtp_ready:
        print(
            "WARNING: MAIL_TRANSPORT=smtp but Secrets Manager secret "
            f"{smtp_secret_id!r} is missing. Create it with SMTP_USER + SMTP_PASSWORD "
            "(or secrets/local/user-secrets.json communityCalendar.smtp) then redeploy.",
            file=sys.stderr,
        )

    archive_path = package_backend()
    table_arn = ensure_table(args.events_table)
    role_arn = ensure_role(args.role_name, table_arn, smtp_secret_id)

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
        "MAIL_TRANSPORT": mail_transport,
        "COGNITO_USER_POOL_ID": str(cognito.get("userPoolId") or ""),
        "COGNITO_CLIENT_ID": str(cognito.get("userPoolClientId") or ""),
        "STAFF_GROUP": str(cognito.get("staffGroup") or "Staff"),
    }
    if mail_transport == "smtp":
        environment["SMTP_HOST"] = (
            (args.smtp_host or "").strip()
            or os.environ.get("SMTP_HOST", "").strip()
            or "mail.townofwiley.gov"
        )
        environment["SMTP_PORT"] = (
            (args.smtp_port or "").strip()
            or os.environ.get("SMTP_PORT", "").strip()
            or "587"
        )
        if (args.smtp_user or "").strip() or os.environ.get("SMTP_USER", "").strip():
            environment["SMTP_USER"] = (args.smtp_user or "").strip() or os.environ.get(
                "SMTP_USER", ""
            ).strip()
        # Always point at the secret id so a later secret upsert works without redeploy.
        environment["SMTP_SECRET_ID"] = smtp_secret_id

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
    print(f"Mail transport: {mail_transport}")
    if mail_transport == "smtp":
        print(f"SMTP secret: {smtp_secret_id} ({'ready' if smtp_ready else 'MISSING'})")
    print("Set COMMUNITY_CALENDAR_ENDPOINT to this URL for runtime-config.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # noqa: BLE001
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1) from error
