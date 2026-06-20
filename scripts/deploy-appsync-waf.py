#!/usr/bin/env python3
"""Associate rate-based WAF Web ACL with the public AppSync CMS GraphQL API."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_API_ID = "j7b2x3sh7rcezekekkxxiak7hi"
DEFAULT_ACL_NAME = "TownOfWileyAppSyncCmsRateLimit"
DEFAULT_RATE_LIMIT = 2000
DEFAULT_ACCOUNT = "570912405222"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="WAF rate limit for AppSync CMS API.")
    parser.add_argument("--api-id", default=DEFAULT_API_ID)
    parser.add_argument("--acl-name", default=DEFAULT_ACL_NAME)
    parser.add_argument("--rate-limit", type=int, default=DEFAULT_RATE_LIMIT)
    parser.add_argument("--region", default="us-east-2")
    return parser.parse_args()


def run_aws(command: list[str], region: str, expect_json: bool = True) -> Any:
    process = subprocess.run(
        ["aws", "--region", region, *command],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if process.returncode != 0:
        raise RuntimeError(
            process.stderr.strip() or process.stdout.strip() or "AWS CLI failed"
        )
    output = process.stdout.strip()
    return json.loads(output) if expect_json and output else output


def ensure_web_acl(acl_name: str, rate_limit: int, region: str) -> str:
    scope = "REGIONAL"
    acls = run_aws(["wafv2", "list-web-acls", "--scope", scope], region).get(
        "WebACLs", []
    )
    for acl in acls:
        if acl.get("Name") == acl_name:
            detail = run_aws(
                [
                    "wafv2",
                    "get-web-acl",
                    "--name",
                    acl_name,
                    "--scope",
                    scope,
                    "--id",
                    acl["Id"],
                ],
                region,
            )
            return detail["ARN"]

    result = run_aws(
        [
            "wafv2",
            "create-web-acl",
            "--name",
            acl_name,
            "--scope",
            scope,
            "--default-action",
            "Allow={}",
            "--visibility-config",
            f"SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName={acl_name.replace('-', '')}",
            "--rules",
            json.dumps(
                [
                    {
                        "Name": "RateLimitPerIp",
                        "Priority": 1,
                        "Statement": {
                            "RateBasedStatement": {
                                "Limit": rate_limit,
                                "AggregateKeyType": "IP",
                            }
                        },
                        "Action": {"Block": {}},
                        "VisibilityConfig": {
                            "SampledRequestsEnabled": True,
                            "CloudWatchMetricsEnabled": True,
                            "MetricName": "RateLimitPerIp",
                        },
                    },
                    {
                        "Name": "AWSManagedRulesCommonRuleSet",
                        "Priority": 2,
                        "Statement": {
                            "ManagedRuleGroupStatement": {
                                "VendorName": "AWS",
                                "Name": "AWSManagedRulesCommonRuleSet",
                            }
                        },
                        "OverrideAction": {"None": {}},
                        "VisibilityConfig": {
                            "SampledRequestsEnabled": True,
                            "CloudWatchMetricsEnabled": True,
                            "MetricName": "AWSManagedRulesCommonRuleSet",
                        },
                    },
                ]
            ),
        ],
        region,
    )
    return result["Summary"]["ARN"]


def associate_acl(acl_arn: str, api_arn: str, region: str) -> None:
    run_aws(
        [
            "wafv2",
            "associate-web-acl",
            "--web-acl-arn",
            acl_arn,
            "--resource-arn",
            api_arn,
        ],
        region,
        expect_json=False,
    )


def main() -> int:
    args = parse_args()
    api_arn = f"arn:aws:appsync:{args.region}:{DEFAULT_ACCOUNT}:apis/{args.api_id}"
    acl_arn = ensure_web_acl(args.acl_name, args.rate_limit, args.region)
    associate_acl(acl_arn, api_arn, args.region)
    print(
        json.dumps(
            {
                "webAclArn": acl_arn,
                "appSyncApiArn": api_arn,
                "rateLimitPerIp5Min": args.rate_limit,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
