from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = REPO_ROOT / "infrastructure" / "aws-infrastructure.manifest.json"

DEFAULT_APPSYNC_API_ID = "j7b2x3sh7rcezekekkxxiak7hi"
DEFAULT_AMPLIFY_APP_ID = "d331voxr1fhoir"
DEFAULT_OPS_ALERTS_TOPIC = "TownOfWileyOpsAlerts"
DEFAULT_APPSYNC_LOGS_ROLE = "TownOfWileyAppSyncCloudWatchLogsRole"

AMPLIFY_BACKEND_LAMBDAS = [
    "amplify-townofwiley-main--UpdateRolesWithIDPFuncti-1Z2Jfsrc9zLF",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Configure CloudWatch logging, retention, AppSync logs, and Lambda error "
            "alarms for Town of Wiley AWS resources (account 570912405222)."
        )
    )
    parser.add_argument("--primary-region", default="us-east-2")
    parser.add_argument("--log-retention-days", type=int, default=90)
    parser.add_argument(
        "--ops-notification-email",
        default="steve.mckitrick@townofwiley.gov",
        help="Email subscribed to TownOfWileyOpsAlerts and re-confirmed severe-weather topics.",
    )
    parser.add_argument("--appsync-api-id", default=DEFAULT_APPSYNC_API_ID)
    parser.add_argument("--amplify-app-id", default=DEFAULT_AMPLIFY_APP_ID)
    parser.add_argument(
        "--appsync-field-log-level",
        default="ERROR",
        choices=["NONE", "ERROR", "INFO", "DEBUG", "ALL"],
    )
    parser.add_argument("--skip-appsync", action="store_true")
    parser.add_argument("--skip-appsync-cache", action="store_true")
    parser.add_argument("--appsync-cache-only", action="store_true")
    parser.add_argument("--appsync-cache-ttl", type=int, default=300)
    parser.add_argument("--skip-alarms", action="store_true")
    parser.add_argument("--skip-retention", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def load_manifest() -> dict[str, Any]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def run_aws(
    command: list[str],
    *,
    region: str,
    expect_json: bool = True,
    dry_run: bool = False,
) -> Any:
    full_command = ["aws", *command, "--region", region]
    if dry_run:
        print(f"[dry-run] {' '.join(full_command)}")
        return {} if expect_json else ""

    process = subprocess.run(
        full_command,
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


def lambda_log_groups(manifest: dict[str, Any]) -> list[tuple[str, str]]:
    groups: list[tuple[str, str]] = []
    for function in manifest.get("lambdaFunctions", []):
        name = str(function.get("functionName", "")).strip()
        region = str(function.get("region", manifest.get("primaryRegion", "us-east-2")))
        if name:
            groups.append((region, f"/aws/lambda/{name}"))

    primary_region = str(manifest.get("primaryRegion", "us-east-2"))
    for function_name in AMPLIFY_BACKEND_LAMBDAS:
        groups.append((primary_region, f"/aws/lambda/{function_name}"))

    return groups


def ensure_log_group_retention(
    log_group_name: str,
    *,
    region: str,
    retention_days: int,
    dry_run: bool,
) -> None:
    groups = run_aws(
        ["logs", "describe-log-groups", "--log-group-name-prefix", log_group_name],
        region=region,
        dry_run=dry_run,
    )
    exists = any(
        group.get("logGroupName") == log_group_name
        for group in groups.get("logGroups", [])
    )
    if not exists:
        run_aws(
            [
                "logs",
                "create-log-group",
                "--log-group-name",
                log_group_name,
            ],
            region=region,
            expect_json=False,
            dry_run=dry_run,
        )

    run_aws(
        [
            "logs",
            "put-retention-policy",
            "--log-group-name",
            log_group_name,
            "--retention-in-days",
            str(retention_days),
        ],
        region=region,
        expect_json=False,
        dry_run=dry_run,
    )


def ensure_sns_topic(topic_name: str, *, region: str, dry_run: bool) -> str:
    details = run_aws(
        ["sns", "create-topic", "--name", topic_name],
        region=region,
        dry_run=dry_run,
    )
    return str(
        details.get("TopicArn", f"arn:aws:sns:{region}:570912405222:{topic_name}")
    )


def ensure_sns_email_subscription(
    topic_arn: str,
    email: str,
    *,
    region: str,
    dry_run: bool,
) -> None:
    if not email:
        raise RuntimeError("Ops notification email is required for SNS subscriptions.")

    subscriptions = run_aws(
        ["sns", "list-subscriptions-by-topic", "--topic-arn", topic_arn],
        region=region,
        dry_run=dry_run,
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
        dry_run=dry_run,
    )


def ensure_lambda_error_alarm(
    function_name: str,
    *,
    region: str,
    topic_arn: str,
    dry_run: bool,
) -> None:
    alarm_name = f"TownOfWiley-{function_name}-Errors"
    alarm_region = region
    alarm_actions = [topic_arn]
    if not topic_arn.split(":")[3] == alarm_region:
        regional_topic = ensure_sns_topic(
            DEFAULT_OPS_ALERTS_TOPIC,
            region=alarm_region,
            dry_run=dry_run,
        )
        alarm_actions = [regional_topic]

    run_aws(
        [
            "cloudwatch",
            "put-metric-alarm",
            "--alarm-name",
            alarm_name,
            "--alarm-description",
            f"Lambda errors for {function_name}",
            "--namespace",
            "AWS/Lambda",
            "--metric-name",
            "Errors",
            "--dimensions",
            f"Name=FunctionName,Value={function_name}",
            "--statistic",
            "Sum",
            "--period",
            "300",
            "--evaluation-periods",
            "1",
            "--threshold",
            "1",
            "--comparison-operator",
            "GreaterThanOrEqualToThreshold",
            "--treat-missing-data",
            "notBreaching",
            "--alarm-actions",
            *alarm_actions,
        ],
        region=alarm_region,
        expect_json=False,
        dry_run=dry_run,
    )


def ensure_amplify_hosting_alarm(
    *,
    region: str,
    app_id: str,
    topic_arn: str,
    dry_run: bool,
) -> None:
    run_aws(
        [
            "cloudwatch",
            "put-metric-alarm",
            "--alarm-name",
            f"TownOfWiley-AmplifyHosting-{app_id}-5xxErrors",
            "--alarm-description",
            "Amplify Hosting 5xx errors for townofwiley.gov",
            "--namespace",
            "AWS/AmplifyHosting",
            "--metric-name",
            "5xxErrors",
            "--dimensions",
            f"Name=App,Value={app_id}",
            "--statistic",
            "Sum",
            "--period",
            "300",
            "--evaluation-periods",
            "1",
            "--threshold",
            "1",
            "--comparison-operator",
            "GreaterThanOrEqualToThreshold",
            "--treat-missing-data",
            "notBreaching",
            "--alarm-actions",
            topic_arn,
        ],
        region=region,
        expect_json=False,
        dry_run=dry_run,
    )


def ensure_appsync_logs_role(*, region: str, role_name: str, dry_run: bool) -> str:
    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "appsync.amazonaws.com"},
                "Action": "sts:AssumeRole",
            }
        ],
    }
    logs_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents",
                ],
                "Resource": "*",
            }
        ],
    }

    try:
        role = run_aws(["iam", "get-role", "--role-name", role_name], region=region)
        role_arn = role["Role"]["Arn"]
    except RuntimeError:
        role = run_aws(
            [
                "iam",
                "create-role",
                "--role-name",
                role_name,
                "--assume-role-policy-document",
                json.dumps(trust_policy),
            ],
            region=region,
        )
        role_arn = role["Role"]["Arn"]

    run_aws(
        [
            "iam",
            "put-role-policy",
            "--role-name",
            role_name,
            "--policy-name",
            "TownOfWileyAppSyncPushToCloudWatchLogs",
            "--policy-document",
            json.dumps(logs_policy),
        ],
        region=region,
        expect_json=False,
        dry_run=dry_run,
    )
    return role_arn


def ensure_appsync_logging(
    *,
    region: str,
    api_id: str,
    role_arn: str,
    field_log_level: str,
    retention_days: int,
    dry_run: bool,
) -> None:
    api_details = run_aws(
        ["appsync", "get-graphql-api", "--api-id", api_id],
        region=region,
        dry_run=dry_run,
    )
    graphql_api = api_details.get("graphqlApi", {})
    command = [
        "appsync",
        "update-graphql-api",
        "--api-id",
        api_id,
        "--name",
        graphql_api.get("name", "townofwiley-main"),
        "--authentication-type",
        graphql_api.get("authenticationType", "API_KEY"),
        "--log-config",
        (
            f"cloudWatchLogsRoleArn={role_arn},"
            f"fieldLogLevel={field_log_level},"
            "excludeVerboseContent=true"
        ),
    ]

    additional_providers = graphql_api.get("additionalAuthenticationProviders", [])
    if additional_providers:
        command.extend(
            [
                "--additional-authentication-providers",
                json.dumps(additional_providers),
            ]
        )

    run_aws(command, region=region, dry_run=dry_run)
    ensure_log_group_retention(
        f"/aws/appsync/apis/{api_id}",
        region=region,
        retention_days=retention_days,
        dry_run=dry_run,
    )


def ensure_appsync_api_cache(
    *,
    region: str,
    api_id: str,
    ttl_seconds: int,
    dry_run: bool,
) -> None:
    try:
        existing = run_aws(
            ["appsync", "get-api-cache", "--api-id", api_id], region=region
        )
        status = str(existing.get("apiCache", {}).get("status", "")).upper()
        if status in {"CREATING", "MODIFYING", "DELETING"}:
            print(f"  appsync cache -> {api_id} is {status}; skipping update")
            return
    except RuntimeError:
        existing = None

    cache_command = [
        "appsync",
        "update-api-cache" if existing else "create-api-cache",
        "--api-id",
        api_id,
        "--ttl",
        str(ttl_seconds),
        "--api-caching-behavior",
        "FULL_REQUEST_CACHING",
        "--type",
        "SMALL",
    ]

    try:
        run_aws(cache_command, region=region, dry_run=dry_run)
    except RuntimeError as error:
        message = str(error)
        if "cache is not yet available" in message.lower():
            print(f"  appsync cache -> {api_id} is still provisioning; retry later")
            return
        if existing is None and "NotFoundException" not in message:
            raise
        if existing is None:
            run_aws(
                [
                    "appsync",
                    "create-api-cache",
                    "--api-id",
                    api_id,
                    "--ttl",
                    str(ttl_seconds),
                    "--api-caching-behavior",
                    "FULL_REQUEST_CACHING",
                    "--type",
                    "SMALL",
                ],
                region=region,
                dry_run=dry_run,
            )
            return
        raise


def main() -> int:
    args = parse_args()
    manifest = load_manifest()
    primary_region = args.primary_region

    print("Town of Wiley CloudWatch logging configuration")
    print(f"  primary region: {primary_region}")
    print(f"  log retention: {args.log_retention_days} days")
    print(f"  ops email: {args.ops_notification_email}")
    if args.dry_run:
        print("  mode: dry-run")

    if args.appsync_cache_only:
        print(
            f"  appsync cache -> {args.appsync_api_id} (TTL {args.appsync_cache_ttl}s)"
        )
        ensure_appsync_api_cache(
            region=primary_region,
            api_id=args.appsync_api_id,
            ttl_seconds=args.appsync_cache_ttl,
            dry_run=args.dry_run,
        )
        print("\nDone.")
        return 0

    if not args.skip_retention:
        for region, log_group in lambda_log_groups(manifest):
            print(f"  retention -> {log_group} ({region})")
            ensure_log_group_retention(
                log_group,
                region=region,
                retention_days=args.log_retention_days,
                dry_run=args.dry_run,
            )

    ops_topic_arn = ensure_sns_topic(
        DEFAULT_OPS_ALERTS_TOPIC,
        region=primary_region,
        dry_run=args.dry_run,
    )
    ensure_sns_email_subscription(
        ops_topic_arn,
        args.ops_notification_email,
        region=primary_region,
        dry_run=args.dry_run,
    )

    alarm_regions = {primary_region}
    for function in manifest.get("lambdaFunctions", []):
        alarm_regions.add(str(function.get("region", primary_region)))
    for alarm_region in sorted(alarm_regions):
        regional_topic_arn = ensure_sns_topic(
            DEFAULT_OPS_ALERTS_TOPIC,
            region=alarm_region,
            dry_run=args.dry_run,
        )
        ensure_sns_email_subscription(
            regional_topic_arn,
            args.ops_notification_email,
            region=alarm_region,
            dry_run=args.dry_run,
        )

    severe_weather_function = "TownOfWileySevereWeatherBackend"
    for suffix in ("AlertTriggeredNotifications", "AlertFailureNotifications"):
        topic_arn = ensure_sns_topic(
            f"{severe_weather_function}{suffix}",
            region=primary_region,
            dry_run=args.dry_run,
        )
        ensure_sns_email_subscription(
            topic_arn,
            args.ops_notification_email,
            region=primary_region,
            dry_run=args.dry_run,
        )

    if not args.skip_alarms:
        for function in manifest.get("lambdaFunctions", []):
            function_name = str(function.get("functionName", "")).strip()
            region = str(function.get("region", primary_region))
            if not function_name:
                continue
            print(f"  alarm -> {function_name} Errors ({region})")
            regional_topic_arn = ensure_sns_topic(
                DEFAULT_OPS_ALERTS_TOPIC,
                region=region,
                dry_run=args.dry_run,
            )
            ensure_lambda_error_alarm(
                function_name,
                region=region,
                topic_arn=regional_topic_arn,
                dry_run=args.dry_run,
            )

        print(f"  alarm -> Amplify Hosting 5xx ({args.amplify_app_id})")
        ensure_amplify_hosting_alarm(
            region=primary_region,
            app_id=args.amplify_app_id,
            topic_arn=ops_topic_arn,
            dry_run=args.dry_run,
        )

    if not args.skip_appsync:
        role_arn = ensure_appsync_logs_role(
            region=primary_region,
            role_name=DEFAULT_APPSYNC_LOGS_ROLE,
            dry_run=args.dry_run,
        )
        print(
            f"  appsync logging -> {args.appsync_api_id} ({args.appsync_field_log_level})"
        )
        ensure_appsync_logging(
            region=primary_region,
            api_id=args.appsync_api_id,
            role_arn=role_arn,
            field_log_level=args.appsync_field_log_level,
            retention_days=args.log_retention_days,
            dry_run=args.dry_run,
        )

    if not args.skip_appsync_cache:
        print(
            f"  appsync cache -> {args.appsync_api_id} (TTL {args.appsync_cache_ttl}s)"
        )
        ensure_appsync_api_cache(
            region=primary_region,
            api_id=args.appsync_api_id,
            ttl_seconds=args.appsync_cache_ttl,
            dry_run=args.dry_run,
        )

    print(
        "\nDone. Confirm pending SNS email subscriptions in the inbox for "
        f"{args.ops_notification_email}."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
