#!/usr/bin/env python3
"""Deploy CMS change audit stream + staff recent-changes API."""

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
_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))
from _deploy_lambda_url import (  # noqa: E402
    ensure_handler_only_function_url_cors,
    ensure_none_auth_function_url_public_access,
)

BACKEND_DIR = REPO_ROOT / "infrastructure" / "cms-change-notifier"
INVENTORY_PATH = REPO_ROOT / "infrastructure" / "cms-inventory.json"
BINDINGS_PATH = REPO_ROOT / "infrastructure" / "gen1-production-bindings.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy CMS audit change notifier.")
    parser.add_argument("--function-name", default="TownOfWileyCmsChangeNotifier")
    parser.add_argument("--role-name", default="TownOfWileyCmsChangeNotifierRole")
    parser.add_argument("--audit-table", default="TownOfWileyCmsAuditLog")
    parser.add_argument("--region", default="us-east-2")
    parser.add_argument("--runtime", default="python3.13")
    parser.add_argument(
        "--appsync-endpoint",
        default="",
        help="Public CMS GraphQL endpoint (defaults to gen1-production-bindings.json).",
    )
    parser.add_argument(
        "--appsync-api-key",
        default="",
        help="Public CMS API key (defaults to APPSYNC_CMS_API_KEY / APPSYNC_API_KEY env).",
    )
    parser.add_argument(
        "--snapshot-bucket",
        default="",
        help="Static site bucket for cms-snapshot.json (defaults to bindings hosting bucket).",
    )
    return parser.parse_args()


def run_aws(command: list[str], *, region: str, expect_json: bool = True) -> Any:
    process = subprocess.run(
        ["aws", *command, "--region", region],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if process.returncode != 0:
        raise RuntimeError(
            process.stderr.strip() or process.stdout.strip() or "AWS CLI failed."
        )
    output = process.stdout.strip()
    if not expect_json:
        return output
    return json.loads(output) if output else {}


def package_backend() -> Path:
    temp_dir = Path(tempfile.mkdtemp(prefix="townofwiley-cms-change-notifier-"))
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
    archive_path = temp_dir / "cms-change-notifier.zip"
    with ZipFile(archive_path, "w", ZIP_DEFLATED) as archive:
        for path in BACKEND_DIR.rglob("*.py"):
            if path.parts[-2] == "tests":
                continue
            archive.write(path, path.relative_to(BACKEND_DIR))
        for path in deps_dir.rglob("*"):
            if path.is_file():
                archive.write(path, path.relative_to(deps_dir))
    return archive_path


def ensure_audit_table(table_name: str, region: str) -> str:
    try:
        table = run_aws(
            ["dynamodb", "describe-table", "--table-name", table_name], region=region
        )
        return table["Table"]["TableArn"]
    except RuntimeError:
        run_aws(
            [
                "dynamodb",
                "create-table",
                "--table-name",
                table_name,
                "--attribute-definitions",
                json.dumps(
                    [
                        {"AttributeName": "pk", "AttributeType": "S"},
                        {"AttributeName": "sk", "AttributeType": "S"},
                    ],
                ),
                "--key-schema",
                json.dumps(
                    [
                        {"AttributeName": "pk", "KeyType": "HASH"},
                        {"AttributeName": "sk", "KeyType": "RANGE"},
                    ],
                ),
                "--billing-mode",
                "PAY_PER_REQUEST",
            ],
            region=region,
        )
        run_aws(
            ["dynamodb", "wait", "table-exists", "--table-name", table_name],
            region=region,
            expect_json=False,
        )
        table = run_aws(
            ["dynamodb", "describe-table", "--table-name", table_name], region=region
        )
        return table["Table"]["TableArn"]


def cms_source_tables() -> list[str]:
    inventory = json.loads(INVENTORY_PATH.read_text(encoding="utf-8"))
    return [
        model["tableName"]
        for model in inventory.get("models", [])
        if model.get("clerkEditorModel") and model.get("model") != "EmailAlias"
    ]


def ensure_stream_enabled(table_name: str, region: str) -> str:
    table = run_aws(
        ["dynamodb", "describe-table", "--table-name", table_name], region=region
    )
    stream = table["Table"].get("LatestStreamArn")
    if stream:
        return stream
    run_aws(
        [
            "dynamodb",
            "update-table",
            "--table-name",
            table_name,
            "--stream-specification",
            "StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES",
        ],
        region=region,
    )
    time.sleep(5)
    table = run_aws(
        ["dynamodb", "describe-table", "--table-name", table_name], region=region
    )
    stream = table["Table"].get("LatestStreamArn")
    if not stream:
        raise RuntimeError(f"Failed to enable stream on {table_name}")
    return stream


def ensure_role(
    role_name: str,
    *,
    audit_table_arn: str,
    source_tables: list[str],
    snapshot_bucket: str,
) -> str:
    account = "570912405222"
    trust = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole",
            }
        ],
    }
    stream_resources = [
        f"arn:aws:dynamodb:us-east-2:{account}:table/{name}/stream/*"
        for name in source_tables
    ]
    inline = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "dynamodb:GetRecords",
                    "dynamodb:GetShardIterator",
                    "dynamodb:DescribeStream",
                    "dynamodb:ListStreams",
                ],
                "Resource": stream_resources,
            },
            {
                "Effect": "Allow",
                "Action": ["dynamodb:PutItem", "dynamodb:Query"],
                "Resource": [audit_table_arn, f"{audit_table_arn}/index/*"],
            },
            {
                "Effect": "Allow",
                "Action": ["s3:PutObject"],
                "Resource": [
                    f"arn:aws:s3:::{snapshot_bucket}/cms-snapshot.json",
                    f"arn:aws:s3:::{snapshot_bucket}/cms-revision.json",
                ],
            },
        ],
    }
    try:
        role = run_aws(
            ["iam", "get-role", "--role-name", role_name], region="us-east-1"
        )
        role_arn = role["Role"]["Arn"]
    except RuntimeError:
        with tempfile.NamedTemporaryFile("w", suffix="-trust.json", delete=False) as fh:
            json.dump(trust, fh)
            trust_path = fh.name
        role = run_aws(
            [
                "iam",
                "create-role",
                "--role-name",
                role_name,
                "--assume-role-policy-document",
                f"file://{trust_path}",
            ],
            region="us-east-1",
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
            region="us-east-1",
            expect_json=False,
        )
        time.sleep(10)
    with tempfile.NamedTemporaryFile("w", suffix="-policy.json", delete=False) as fh:
        json.dump(inline, fh)
        policy_path = fh.name
    run_aws(
        [
            "iam",
            "put-role-policy",
            "--role-name",
            role_name,
            "--policy-name",
            "TownOfWileyCmsChangeNotifierPolicy",
            "--policy-document",
            f"file://{policy_path}",
        ],
        region="us-east-1",
        expect_json=False,
    )
    return role_arn


def ensure_lambda(
    function_name: str,
    role_arn: str,
    runtime: str,
    archive_path: Path,
    environment: dict[str, str],
    region: str,
) -> str:
    env_json = json.dumps({"Variables": environment})
    try:
        details = run_aws(
            ["lambda", "get-function", "--function-name", function_name], region=region
        )
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
            ["lambda", "wait", "function-updated-v2", "--function-name", function_name],
            region=region,
            expect_json=False,
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
                "60",
                "--memory-size",
                "256",
                "--role",
                role_arn,
                "--environment",
                env_json,
            ],
            region=region,
        )
        return details["Configuration"]["FunctionArn"]
    except RuntimeError:
        details = run_aws(
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
                "60",
                "--memory-size",
                "256",
                "--zip-file",
                f"fileb://{archive_path}",
                "--environment",
                env_json,
            ],
            region=region,
        )
        return details["FunctionArn"]


def ensure_stream_mapping(
    function_name: str, stream_arn: str, table_name: str, region: str
) -> None:
    table_name.replace("-", "")[:16]
    try:
        run_aws(
            [
                "lambda",
                "create-event-source-mapping",
                "--function-name",
                function_name,
                "--event-source-arn",
                stream_arn,
                "--starting-position",
                "LATEST",
                "--batch-size",
                "10",
            ],
            region=region,
        )
    except RuntimeError as error:
        if "already exists" not in str(error).lower():
            raise


def ensure_function_url(function_name: str, region: str) -> str:
    try:
        result = run_aws(
            ["lambda", "get-function-url-config", "--function-name", function_name],
            region=region,
        )
        url = result["FunctionUrl"]
    except RuntimeError:
        result = run_aws(
            [
                "lambda",
                "create-function-url-config",
                "--function-name",
                function_name,
                "--auth-type",
                "NONE",
            ],
            region=region,
        )
        url = result["FunctionUrl"]
    ensure_none_auth_function_url_public_access(function_name, region, run_aws)
    ensure_handler_only_function_url_cors(function_name, region, run_aws)
    return url.rstrip("/")


def main() -> int:
    args = parse_args()
    bindings = json.loads(BINDINGS_PATH.read_text(encoding="utf-8"))
    source_tables = cms_source_tables()
    audit_arn = ensure_audit_table(args.audit_table, args.region)
    stream_arns = [ensure_stream_enabled(name, args.region) for name in source_tables]
    archive = package_backend()
    snapshot_bucket = (
        args.snapshot_bucket.strip()
        or bindings.get("hosting", {}).get("s3Bucket", "")
        or "townofwiley-static-site"
    )
    appsync_endpoint = (
        args.appsync_endpoint.strip()
        or bindings.get("appSync", {}).get("graphqlEndpoint", "").strip()
        or os.environ.get("APPSYNC_CMS_ENDPOINT", "").strip()
    )
    appsync_api_key = (
        args.appsync_api_key.strip()
        or os.environ.get("APPSYNC_CMS_API_KEY", "").strip()
        or os.environ.get("APPSYNC_API_KEY", "").strip()
    )
    role_arn = ensure_role(
        args.role_name,
        audit_table_arn=audit_arn,
        source_tables=source_tables,
        snapshot_bucket=snapshot_bucket,
    )
    environment = {
        "AUDIT_LOG_TABLE": args.audit_table,
        "COGNITO_USER_POOL_ID": bindings["cognito"]["userPoolId"],
        "COGNITO_CLIENT_ID": bindings["cognito"]["userPoolClientId"],
        "STAFF_GROUP": bindings["cognito"].get("staffGroup", "Staff"),
        "CMS_TABLE_SUFFIX": f"-{bindings['appSync']['apiId']}-main",
        "CMS_AUDIT_IGNORED_MODELS": "EmailAlias",
        "CMS_SNAPSHOT_BUCKET": snapshot_bucket,
        "CMS_SNAPSHOT_PUBLISH_ENABLED": "true",
        "APPSYNC_CMS_ENDPOINT": appsync_endpoint,
        "APPSYNC_CMS_API_KEY": appsync_api_key,
    }
    function_arn = ensure_lambda(
        args.function_name,
        role_arn,
        args.runtime,
        archive,
        environment,
        args.region,
    )
    for table_name, stream_arn in zip(source_tables, stream_arns, strict=True):
        ensure_stream_mapping(args.function_name, stream_arn, table_name, args.region)
    function_url = ensure_function_url(args.function_name, args.region)
    print(
        json.dumps(
            {
                "functionArn": function_arn,
                "functionUrl": function_url,
                "recentEndpoint": f"{function_url}/recent",
                "auditTable": args.audit_table,
                "streamTables": len(source_tables),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
