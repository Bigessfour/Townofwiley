#!/usr/bin/env python3
"""Deploy one-time Monday AppSync old API key deletion (EventBridge Scheduler → Lambda)."""

from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "infrastructure" / "appsync-key-deletion"
DEFAULT_API_ID = "j7b2x3sh7rcezekekkxxiak7hi"
DEFAULT_FUNCTION_NAME = "TownOfWileyAppSyncKeyDeletion"
DEFAULT_ROLE_NAME = "TownOfWileyAppSyncKeyDeletionRole"
DEFAULT_SCHEDULER_ROLE_NAME = "TownOfWileyAppSyncKeyDeletionSchedulerRole"
DEFAULT_SCHEDULE_NAME = "TownOfWileyAppSyncOldKeyDeletion"
DEFAULT_KEY_IDS_TO_DELETE = (
    "da2-o4lt2rj6bvcftagq7trjpkabau,da2-dtpfsmrmtfbqxfwspnp3ep3fcq"
)
DEFAULT_KEY_IDS_TO_KEEP = "da2-24hgs5m5ynbydpfshwbypxxcqm"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Schedule deletion of retired AppSync CMS API keys.",
    )
    parser.add_argument("--function-name", default=DEFAULT_FUNCTION_NAME)
    parser.add_argument("--role-name", default=DEFAULT_ROLE_NAME)
    parser.add_argument("--scheduler-role-name", default=DEFAULT_SCHEDULER_ROLE_NAME)
    parser.add_argument("--schedule-name", default=DEFAULT_SCHEDULE_NAME)
    parser.add_argument(
        "--schedule-at",
        default="2026-06-22T09:00:00",
        help="One-time schedule (ISO local time with --timezone).",
    )
    parser.add_argument("--timezone", default="America/Denver")
    parser.add_argument("--api-id", default=DEFAULT_API_ID)
    parser.add_argument("--key-ids-to-delete", default=DEFAULT_KEY_IDS_TO_DELETE)
    parser.add_argument("--key-ids-to-keep", default=DEFAULT_KEY_IDS_TO_KEEP)
    parser.add_argument("--runtime", default="python3.13")
    parser.add_argument("--region", default="us-east-2")
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
    temp_dir = Path(tempfile.mkdtemp(prefix="townofwiley-appsync-key-deletion-"))
    archive_path = temp_dir / "appsync-key-deletion.zip"
    with ZipFile(archive_path, "w", ZIP_DEFLATED) as archive:
        for path in BACKEND_DIR.rglob("*.py"):
            if path.name == "__init__.py":
                continue
            archive.write(path, path.relative_to(BACKEND_DIR))
    return archive_path


def ensure_lambda_role(role_name: str, *, api_id: str) -> str:
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
                "Action": ["appsync:DeleteApiKey", "appsync:ListApiKeys"],
                "Resource": f"arn:aws:appsync:us-east-2:570912405222:/v1/apis/{api_id}/apikeys",
            }
        ],
    }

    try:
        role = run_aws(
            ["iam", "get-role", "--role-name", role_name], region="us-east-1"
        )
        role_arn = role["Role"]["Arn"]
    except RuntimeError:
        with tempfile.NamedTemporaryFile("w", suffix="-trust.json", delete=False) as fh:
            json.dump(trust_policy, fh)
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
        json.dump(inline_policy, fh)
        policy_path = fh.name
    run_aws(
        [
            "iam",
            "put-role-policy",
            "--role-name",
            role_name,
            "--policy-name",
            "TownOfWileyAppSyncKeyDeletionPolicy",
            "--policy-document",
            f"file://{policy_path}",
        ],
        region="us-east-1",
        expect_json=False,
    )
    return role_arn


def ensure_scheduler_role(role_name: str, *, lambda_arn: str) -> str:
    account_id = "570912405222"
    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "scheduler.amazonaws.com"},
                "Action": "sts:AssumeRole",
                "Condition": {
                    "StringEquals": {"aws:SourceAccount": account_id},
                },
            }
        ],
    }
    inline_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": ["lambda:InvokeFunction"],
                "Resource": lambda_arn,
            }
        ],
    }

    try:
        role = run_aws(
            ["iam", "get-role", "--role-name", role_name], region="us-east-1"
        )
        role_arn = role["Role"]["Arn"]
    except RuntimeError:
        with tempfile.NamedTemporaryFile("w", suffix="-trust.json", delete=False) as fh:
            json.dump(trust_policy, fh)
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
        time.sleep(5)
    else:
        with tempfile.NamedTemporaryFile("w", suffix="-trust.json", delete=False) as fh:
            json.dump(trust_policy, fh)
            trust_path = fh.name
        run_aws(
            [
                "iam",
                "update-assume-role-policy",
                "--role-name",
                role_name,
                "--policy-document",
                f"file://{trust_path}",
            ],
            region="us-east-1",
            expect_json=False,
        )

    with tempfile.NamedTemporaryFile("w", suffix="-policy.json", delete=False) as fh:
        json.dump(inline_policy, fh)
        policy_path = fh.name
    run_aws(
        [
            "iam",
            "put-role-policy",
            "--role-name",
            role_name,
            "--policy-name",
            "TownOfWileyAppSyncKeyDeletionSchedulerPolicy",
            "--policy-document",
            f"file://{policy_path}",
        ],
        region="us-east-1",
        expect_json=False,
    )
    time.sleep(10)
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
                "30",
                "--memory-size",
                "128",
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
                "30",
                "--memory-size",
                "128",
                "--zip-file",
                f"fileb://{archive_path}",
                "--environment",
                env_json,
            ],
            region=region,
        )
        return details["FunctionArn"]


def ensure_schedule(
    schedule_name: str,
    schedule_at: str,
    timezone: str,
    lambda_arn: str,
    scheduler_role_arn: str,
    region: str,
) -> None:
    expression = f"at({schedule_at})"
    target = json.dumps({"Arn": lambda_arn, "RoleArn": scheduler_role_arn})
    flexible = json.dumps({"Mode": "OFF"})
    schedule_exists = False
    try:
        run_aws(["scheduler", "get-schedule", "--name", schedule_name], region=region)
        schedule_exists = True
    except RuntimeError:
        schedule_exists = False

    command = [
        "scheduler",
        "update-schedule" if schedule_exists else "create-schedule",
        "--name",
        schedule_name,
        "--schedule-expression",
        expression,
        "--schedule-expression-timezone",
        timezone,
        "--flexible-time-window",
        flexible,
        "--target",
        target,
        "--state",
        "ENABLED",
    ]
    run_aws(command, region=region)


def main() -> int:
    args = parse_args()
    archive_path = package_backend()
    lambda_role_arn = ensure_lambda_role(args.role_name, api_id=args.api_id)
    function_arn = ensure_lambda(
        args.function_name,
        lambda_role_arn,
        args.runtime,
        archive_path,
        {
            "APPSYNC_API_ID": args.api_id,
            "APPSYNC_KEY_IDS_TO_DELETE": args.key_ids_to_delete,
            "APPSYNC_KEY_IDS_TO_KEEP": args.key_ids_to_keep,
        },
        args.region,
    )
    scheduler_role_arn = ensure_scheduler_role(
        args.scheduler_role_name,
        lambda_arn=function_arn,
    )
    ensure_schedule(
        args.schedule_name,
        args.schedule_at,
        args.timezone,
        function_arn,
        scheduler_role_arn,
        args.region,
    )
    print(
        json.dumps(
            {
                "functionArn": function_arn,
                "scheduleName": args.schedule_name,
                "scheduleAt": args.schedule_at,
                "timezone": args.timezone,
                "keysToDelete": [
                    item for item in args.key_ids_to_delete.split(",") if item.strip()
                ],
                "keysToKeep": [
                    item for item in args.key_ids_to_keep.split(",") if item.strip()
                ],
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
