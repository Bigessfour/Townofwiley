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
BACKEND_DIR = REPO_ROOT / "infrastructure" / "appsync-key-rotation-reminder"
DEFAULT_API_ID = "j7b2x3sh7rcezekekkxxiak7hi"
DEFAULT_TOPIC_NAME = "TownOfWileyAppSyncKeyReminder"
DEFAULT_FUNCTION_NAME = "TownOfWileyAppSyncKeyReminder"
DEFAULT_ROLE_NAME = "TownOfWileyAppSyncKeyReminderRole"
DEFAULT_RULE_NAME = "TownOfWileyAppSyncKeyReminderSchedule"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Deploy weekly AppSync CMS API key expiry reminder (EventBridge + Lambda + SNS)."
        ),
    )
    parser.add_argument("--function-name", default=DEFAULT_FUNCTION_NAME)
    parser.add_argument("--role-name", default=DEFAULT_ROLE_NAME)
    parser.add_argument("--rule-name", default=DEFAULT_RULE_NAME)
    parser.add_argument("--topic-name", default=DEFAULT_TOPIC_NAME)
    parser.add_argument(
        "--schedule-expression",
        default="rate(7 days)",
        help="EventBridge schedule (default: weekly).",
    )
    parser.add_argument("--api-id", default=DEFAULT_API_ID)
    parser.add_argument("--warn-days", type=int, default=30)
    parser.add_argument(
        "--sns-email",
        default="bigessfour@gmail.com",
        help="Email subscribed to the reminder SNS topic.",
    )
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
        raise RuntimeError(process.stderr.strip() or "AWS CLI command failed.")

    output = process.stdout.strip()
    if not expect_json:
        return output
    return json.loads(output) if output else {}


def package_backend() -> Path:
    temp_dir = Path(tempfile.mkdtemp(prefix="townofwiley-appsync-key-reminder-"))
    archive_path = temp_dir / "appsync-key-reminder.zip"

    with ZipFile(archive_path, "w", ZIP_DEFLATED) as archive:
        for path in BACKEND_DIR.rglob("*.py"):
            if path.name == "__init__.py":
                continue
            archive.write(path, path.relative_to(BACKEND_DIR))

    return archive_path


def ensure_sns_topic(topic_name: str, *, region: str) -> str:
    details = run_aws(["sns", "create-topic", "--name", topic_name], region=region)
    return str(details["TopicArn"])


def ensure_sns_email_subscription(topic_arn: str, email: str, *, region: str) -> None:
    if not email.strip():
        raise RuntimeError("--sns-email is required.")

    subscriptions = run_aws(
        ["sns", "list-subscriptions-by-topic", "--topic-arn", topic_arn],
        region=region,
    )
    for subscription in subscriptions.get("Subscriptions", []):
        if (
            subscription.get("Protocol") == "email"
            and subscription.get("Endpoint") == email
        ):
            return

    run_aws(
        [
            "sns",
            "subscribe",
            "--topic-arn",
            topic_arn,
            "--protocol",
            "email",
            "--notification-endpoint",
            email,
        ],
        region=region,
    )


def ensure_role(role_name: str, *, api_id: str, topic_arn: str) -> str:
    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole",
            },
        ],
    }
    inline_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": ["appsync:ListApiKeys"],
                "Resource": f"arn:aws:appsync:us-east-2:570912405222:/v1/apis/{api_id}/apikeys",
            },
            {
                "Effect": "Allow",
                "Action": ["sns:Publish"],
                "Resource": topic_arn,
            },
        ],
    }

    try:
        role = run_aws(
            ["iam", "get-role", "--role-name", role_name], region="us-east-1"
        )
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
            "TownOfWileyAppSyncKeyReminderPolicy",
            "--policy-document",
            f"file://{policy_path}",
        ],
        region="us-east-1",
        expect_json=False,
    )
    return role_arn


def ensure_lambda_function(
    function_name: str,
    role_arn: str,
    runtime: str,
    archive_path: Path,
    environment: dict[str, str],
    *,
    region: str,
) -> str:
    try:
        details = run_aws(
            ["lambda", "get-function", "--function-name", function_name],
            region=region,
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
                json.dumps({"Variables": environment}),
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
                json.dumps({"Variables": environment}),
            ],
            region=region,
        )
        return details["FunctionArn"]


def ensure_schedule(
    rule_name: str,
    schedule_expression: str,
    function_name: str,
    function_arn: str,
    *,
    region: str,
) -> None:
    rule = run_aws(
        [
            "events",
            "put-rule",
            "--name",
            rule_name,
            "--schedule-expression",
            schedule_expression,
            "--state",
            "ENABLED",
        ],
        region=region,
    )
    rule_arn = rule["RuleArn"]

    try:
        run_aws(
            [
                "lambda",
                "add-permission",
                "--function-name",
                function_name,
                "--statement-id",
                "EventBridgeInvokeAppSyncKeyReminder",
                "--action",
                "lambda:InvokeFunction",
                "--principal",
                "events.amazonaws.com",
                "--source-arn",
                rule_arn,
            ],
            region=region,
        )
    except RuntimeError as error:
        if "already exists" not in str(error):
            raise

    run_aws(
        [
            "events",
            "put-targets",
            "--rule",
            rule_name,
            "--targets",
            json.dumps([{"Id": "AppSyncKeyReminder", "Arn": function_arn}]),
        ],
        region=region,
    )


def main() -> int:
    args = parse_args()
    archive_path = package_backend()
    topic_arn = ensure_sns_topic(args.topic_name, region=args.region)
    ensure_sns_email_subscription(topic_arn, args.sns_email, region=args.region)
    role_arn = ensure_role(args.role_name, api_id=args.api_id, topic_arn=topic_arn)
    function_arn = ensure_lambda_function(
        function_name=args.function_name,
        role_arn=role_arn,
        runtime=args.runtime,
        archive_path=archive_path,
        environment={
            "APPSYNC_API_ID": args.api_id,
            "WARN_DAYS": str(args.warn_days),
            "SNS_TOPIC_ARN": topic_arn,
            "APPSYNC_API_NAME": "townofwiley-main",
        },
        region=args.region,
    )
    ensure_schedule(
        args.rule_name,
        args.schedule_expression,
        args.function_name,
        function_arn,
        region=args.region,
    )

    print(
        json.dumps(
            {
                "functionArn": function_arn,
                "topicArn": topic_arn,
                "snsEmail": args.sns_email,
                "scheduleExpression": args.schedule_expression,
                "warnDays": args.warn_days,
                "apiId": args.api_id,
                "note": "Confirm the SNS email subscription in the inbox, then invoke the Lambda once to test.",
            },
            indent=2,
        ),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
