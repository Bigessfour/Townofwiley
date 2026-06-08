#!/usr/bin/env python3
"""Apply no-additional-charge AWS security controls for Town of Wiley (account 570912405222).

Free / included (no WAF/Shield Advanced subscription):
  - AWS Shield Standard (automatic on CloudFront/Route 53; informational only)
  - Multi-Region CloudTrail (first management-event trail; S3 storage is pennies)
  - Account + bucket S3 Block Public Access
  - IAM account password policy
  - EBS encryption by default (account setting)
  - IAM Access Analyzer (account)
  - Cognito user pool deletion protection
  - API Gateway HTTP API stage throttling (contact review API)
  - Lambda reserved concurrency caps on public Function URL Lambdas (optional)
  - Route 53: align *.townofwiley.gov with production CloudFront

Paid (skipped unless --enable-amplify-waf):
  - Amplify Hosting WAF / new Web ACLs (~$5+/month per ACL + rules)

See docs/aws-free-tier-security.md.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = REPO_ROOT / "infrastructure" / "aws-infrastructure.manifest.json"
BINDINGS_PATH = REPO_ROOT / "infrastructure" / "gen1-production-bindings.json"

ACCOUNT_ID = "570912405222"
PRIMARY_REGION = "us-east-2"
AMPLIFY_APP_ID = "d331voxr1fhoir"
CONTACT_REVIEW_API_ID = "lmppzxwh3h"

CLOUDTRAIL_NAME = "townofwiley-account-trail"
CLOUDTRAIL_BUCKET = f"townofwiley-cloudtrail-{ACCOUNT_ID}"

# Production CloudFront (S3 static site, June 2026)
PRODUCTION_CF_HOST = "d34qrz3qxoppc5.cloudfront.net"
STALE_WILDCARD_CF_HOST = "d3fmdu29qcwosh.cloudfront.net"

PUBLIC_LAMBDA_CONCURRENCY = {
    "TownOfWileyNWSWeatherProxy": 25,
    "TownOfWileySevereWeatherBackend": 10,
    "TownOfWileyContactUpdate": 5,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--enable-amplify-waf",
        action="store_true",
        help="Enable Amplify-managed WAF on production app (NOT free; ~$5+/mo).",
    )
    parser.add_argument("--skip-dns", action="store_true")
    parser.add_argument("--skip-cloudtrail", action="store_true")
    parser.add_argument(
        "--web-acl-arn",
        default="",
        help="Optional regional WAF Web ACL ARN for AppSync/Cognito (paid; omitted by default).",
    )
    parser.add_argument(
        "--try-lambda-concurrency",
        action="store_true",
        help=(
            "Set reserved concurrency on public Lambdas (may fail when account "
            "unreserved pool is small; requires UnreservedConcurrentExecution >= 10)."
        ),
    )
    return parser.parse_args()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def run_aws(
    command: list[str],
    *,
    region: str | None = None,
    expect_json: bool = True,
    dry_run: bool = False,
    allow_failure: bool = False,
) -> Any:
    full_command = ["aws", *command]
    if region:
        full_command.extend(["--region", region])
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
    if process.returncode != 0 and not allow_failure:
        raise RuntimeError(
            process.stderr.strip() or process.stdout.strip() or "AWS CLI failed"
        )
    output = process.stdout.strip()
    if not expect_json:
        return output
    return json.loads(output) if output else {}


def ensure_account_s3_public_access_block(*, dry_run: bool) -> None:
    print("S3 account Block Public Access …")
    run_aws(
        [
            "s3control",
            "put-public-access-block",
            "--account-id",
            ACCOUNT_ID,
            "--public-access-block-configuration",
            "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true",
        ],
        dry_run=dry_run,
    )


def ensure_bucket_public_access_block(
    bucket: str, region: str, *, dry_run: bool
) -> None:
    print(f"  S3 bucket Block Public Access: {bucket}")
    run_aws(
        [
            "s3api",
            "put-public-access-block",
            "--bucket",
            bucket,
            "--public-access-block-configuration",
            "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true",
        ],
        region=region,
        dry_run=dry_run,
        allow_failure=True,
    )


def ensure_iam_password_policy(*, dry_run: bool) -> None:
    print("IAM account password policy …")
    run_aws(
        [
            "iam",
            "update-account-password-policy",
            "--minimum-password-length",
            "14",
            "--require-uppercase-characters",
            "--require-lowercase-characters",
            "--require-numbers",
            "--require-symbols",
            "--allow-users-to-change-password",
            "--max-password-age",
            "90",
            "--password-reuse-prevention",
            "5",
        ],
        dry_run=dry_run,
    )


def ensure_ebs_encryption_by_default(*, dry_run: bool) -> None:
    for region in (PRIMARY_REGION, "us-east-1"):
        print(f"EBS encryption by default ({region}) …")
        run_aws(
            ["ec2", "enable-ebs-encryption-by-default"],
            region=region,
            dry_run=dry_run,
            allow_failure=True,
        )


def ensure_access_analyzer(*, dry_run: bool) -> None:
    print("IAM Access Analyzer (account) …")
    existing = run_aws(
        ["accessanalyzer", "list-analyzers"],
        region=PRIMARY_REGION,
        dry_run=dry_run,
        allow_failure=True,
    )
    if dry_run:
        return
    analyzers = existing.get("analyzers", []) if isinstance(existing, dict) else []
    if any(a.get("name") == "townofwiley-account" for a in analyzers):
        print("  already exists")
        return
    run_aws(
        [
            "accessanalyzer",
            "create-analyzer",
            "--analyzer-name",
            "townofwiley-account",
            "--type",
            "ACCOUNT",
        ],
        region=PRIMARY_REGION,
        dry_run=dry_run,
        allow_failure=True,
    )


def cloudtrail_bucket_policy(bucket: str) -> dict[str, Any]:
    return {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AWSCloudTrailAclCheck",
                "Effect": "Allow",
                "Principal": {"Service": "cloudtrail.amazonaws.com"},
                "Action": "s3:GetBucketAcl",
                "Resource": f"arn:aws:s3:::{bucket}",
            },
            {
                "Sid": "AWSCloudTrailWrite",
                "Effect": "Allow",
                "Principal": {"Service": "cloudtrail.amazonaws.com"},
                "Action": "s3:PutObject",
                "Resource": f"arn:aws:s3:::{bucket}/AWSLogs/{ACCOUNT_ID}/*",
                "Condition": {
                    "StringEquals": {"s3:x-amz-acl": "bucket-owner-full-control"}
                },
            },
        ],
    }


def ensure_cloudtrail(*, dry_run: bool) -> None:
    print("CloudTrail (multi-Region management events) …")
    trails = run_aws(
        ["cloudtrail", "describe-trails", "--include-shadow-trails"],
        region=PRIMARY_REGION,
        dry_run=dry_run,
        allow_failure=True,
    )
    if not dry_run and isinstance(trails, dict):
        for trail in trails.get("trailList", []):
            if trail.get("Name") != CLOUDTRAIL_NAME:
                continue
            status = run_aws(
                ["cloudtrail", "get-trail-status", "--name", CLOUDTRAIL_NAME],
                region=PRIMARY_REGION,
                allow_failure=True,
            )
            if isinstance(status, dict) and status.get("IsLogging"):
                print(f"  trail {CLOUDTRAIL_NAME} already logging")
                return

    run_aws(
        [
            "s3api",
            "create-bucket",
            "--bucket",
            CLOUDTRAIL_BUCKET,
            "--create-bucket-configuration",
            f"LocationConstraint={PRIMARY_REGION}",
        ],
        region=PRIMARY_REGION,
        dry_run=dry_run,
        allow_failure=True,
    )
    ensure_bucket_public_access_block(
        CLOUDTRAIL_BUCKET, PRIMARY_REGION, dry_run=dry_run
    )
    policy_path = REPO_ROOT / ".tmp-cloudtrail-bucket-policy.json"
    if not dry_run:
        policy_path.write_text(
            json.dumps(cloudtrail_bucket_policy(CLOUDTRAIL_BUCKET)), encoding="utf-8"
        )
    run_aws(
        [
            "s3api",
            "put-bucket-policy",
            "--bucket",
            CLOUDTRAIL_BUCKET,
            "--policy",
            f"file://{policy_path}",
        ],
        region=PRIMARY_REGION,
        dry_run=dry_run,
        allow_failure=True,
    )
    run_aws(
        [
            "cloudtrail",
            "create-trail",
            "--name",
            CLOUDTRAIL_NAME,
            "--s3-bucket-name",
            CLOUDTRAIL_BUCKET,
            "--is-multi-region-trail",
            "--include-global-service-events",
        ],
        region=PRIMARY_REGION,
        dry_run=dry_run,
        allow_failure=True,
    )
    run_aws(
        ["cloudtrail", "start-logging", "--name", CLOUDTRAIL_NAME],
        region=PRIMARY_REGION,
        dry_run=dry_run,
        allow_failure=True,
    )
    if not dry_run and policy_path.exists():
        policy_path.unlink(missing_ok=True)


def cognito_deletion_protection(pool_id: str, *, dry_run: bool) -> None:
    print(f"Cognito deletion protection: {pool_id}")
    pool = run_aws(
        ["cognito-idp", "describe-user-pool", "--user-pool-id", pool_id],
        region=PRIMARY_REGION,
        dry_run=dry_run,
        allow_failure=not dry_run,
    )
    if dry_run:
        return
    if pool.get("UserPool", {}).get("DeletionProtection") == "ACTIVE":
        print("  already ACTIVE")
        return
    run_aws(
        [
            "cognito-idp",
            "update-user-pool",
            "--user-pool-id",
            pool_id,
            "--deletion-protection",
            "ACTIVE",
            "--auto-verified-attributes",
            "email",
        ],
        region=PRIMARY_REGION,
        dry_run=dry_run,
    )


def api_gateway_throttle(*, dry_run: bool) -> None:
    print(f"API Gateway throttle ({CONTACT_REVIEW_API_ID} stage prod) …")
    run_aws(
        [
            "apigatewayv2",
            "update-stage",
            "--api-id",
            CONTACT_REVIEW_API_ID,
            "--stage-name",
            "prod",
            "--default-route-settings",
            "ThrottlingBurstLimit=80,ThrottlingRateLimit=40",
        ],
        region=PRIMARY_REGION,
        dry_run=dry_run,
        allow_failure=True,
    )


def associate_waf(web_acl_arn: str, resource_arn: str, *, dry_run: bool) -> None:
    print(f"  WAF associate → {resource_arn}")
    existing = run_aws(
        [
            "wafv2",
            "get-web-acl-for-resource",
            "--resource-arn",
            resource_arn,
        ],
        region=PRIMARY_REGION,
        dry_run=dry_run,
        allow_failure=True,
    )
    if not dry_run and isinstance(existing, dict) and existing.get("WebACL"):
        print("    already associated")
        return
    run_aws(
        [
            "wafv2",
            "associate-web-acl",
            "--web-acl-arn",
            web_acl_arn,
            "--resource-arn",
            resource_arn,
        ],
        region=PRIMARY_REGION,
        dry_run=dry_run,
        allow_failure=True,
    )


def ensure_waf_on_regional_services(
    bindings: dict[str, Any], *, web_acl_arn: str, dry_run: bool
) -> None:
    print("WAF associate (paid; requires existing regional Web ACL ARN) …")
    appsync_id = bindings["appSync"]["apiId"]
    pool_id = bindings["cognito"]["userPoolId"]
    associate_waf(
        web_acl_arn,
        f"arn:aws:appsync:{PRIMARY_REGION}:{ACCOUNT_ID}:apis/{appsync_id}",
        dry_run=dry_run,
    )
    associate_waf(
        web_acl_arn,
        f"arn:aws:cognito-idp:{PRIMARY_REGION}:{ACCOUNT_ID}:userpool/{pool_id}",
        dry_run=dry_run,
    )


def lambda_reserved_concurrency(*, dry_run: bool) -> None:
    print("Lambda reserved concurrency (public Function URLs) …")
    for name, limit in PUBLIC_LAMBDA_CONCURRENCY.items():
        print(f"  {name} → {limit}")
        full_command = [
            "aws",
            "lambda",
            "put-function-concurrency",
            "--function-name",
            name,
            "--reserved-concurrent-executions",
            str(limit),
            "--region",
            PRIMARY_REGION,
        ]
        if dry_run:
            print(f"[dry-run] {' '.join(full_command)}")
            continue
        process = subprocess.run(
            full_command,
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if process.returncode != 0:
            message = (process.stderr or process.stdout or "").strip()
            if "UnreservedConcurrentExecution" in message:
                print(
                    "  skipped: account unreserved concurrency too low "
                    "(request limit increase or omit --try-lambda-concurrency)."
                )
                return
            print(f"  warning: {message}")


def fix_wildcard_dns(*, dry_run: bool) -> None:
    print("Route 53: *.townofwiley.gov → production CloudFront …")
    zones = run_aws(
        ["route53", "list-hosted-zones-by-name", "--dns-name", "townofwiley.gov"],
        dry_run=dry_run,
    )
    if dry_run:
        return
    zone_id = zones["HostedZones"][0]["Id"].replace("/hostedzone/", "")
    records = run_aws(
        ["route53", "list-resource-record-sets", "--hosted-zone-id", zone_id],
        dry_run=dry_run,
    )
    wildcard_name = "\\052.townofwiley.gov."
    target = None
    for record in records.get("ResourceRecordSets", []):
        if record.get("Name") != wildcard_name:
            continue
        values = [r["Value"] for r in record.get("ResourceRecords", [])]
        if values and STALE_WILDCARD_CF_HOST in values[0]:
            target = record
            break
    if not target:
        print("  no stale wildcard CNAME; skip")
        return
    new_record = {
        "Name": wildcard_name,
        "Type": "CNAME",
        "TTL": target.get("TTL", 300),
        "ResourceRecords": [{"Value": PRODUCTION_CF_HOST}],
    }
    change = {
        "Changes": [
            {
                "Action": "UPSERT",
                "ResourceRecordSet": new_record,
            }
        ]
    }
    run_aws(
        [
            "route53",
            "change-resource-record-sets",
            "--hosted-zone-id",
            zone_id,
            "--change-batch",
            json.dumps(change),
        ],
        dry_run=dry_run,
    )


def enable_amplify_waf(*, dry_run: bool) -> None:
    print(f"Amplify WAF on {AMPLIFY_APP_ID} (paid) …")
    app = run_aws(
        ["amplify", "get-app", "--app-id", AMPLIFY_APP_ID],
        region=PRIMARY_REGION,
        dry_run=dry_run,
    )
    if not dry_run and app.get("app", {}).get("wafConfiguration"):
        print("  already configured")
        return
    # Amplify Console API: create-web-acl + associate — use update-app when available.
    print(
        "  Manual: Amplify Console → Townofwiley → Hosting → Firewall → Enable "
        "(creates CloudFront-scoped WAF; ~$5+/month)."
    )


def main() -> int:
    args = parse_args()
    manifest = load_json(MANIFEST_PATH)
    bindings = load_json(BINDINGS_PATH)

    print("Town of Wiley — free-tier security configure")
    print(f"  account={ACCOUNT_ID} dry_run={args.dry_run}")
    print("  Shield Standard: automatic on CloudFront (no action)")
    print()

    ensure_account_s3_public_access_block(dry_run=args.dry_run)
    for bucket in manifest.get("s3Buckets", []):
        ensure_bucket_public_access_block(
            str(bucket["name"]),
            str(bucket.get("region", PRIMARY_REGION)),
            dry_run=args.dry_run,
        )
    storage_bucket = bindings.get("storage", {}).get("bucket")
    if storage_bucket:
        ensure_bucket_public_access_block(
            str(storage_bucket), PRIMARY_REGION, dry_run=args.dry_run
        )

    ensure_iam_password_policy(dry_run=args.dry_run)
    ensure_ebs_encryption_by_default(dry_run=args.dry_run)
    ensure_access_analyzer(dry_run=args.dry_run)

    if not args.skip_cloudtrail:
        ensure_cloudtrail(dry_run=args.dry_run)

    cognito_deletion_protection(
        bindings["cognito"]["userPoolId"], dry_run=args.dry_run
    )
    api_gateway_throttle(dry_run=args.dry_run)
    if args.try_lambda_concurrency:
        lambda_reserved_concurrency(dry_run=args.dry_run)

    if args.web_acl_arn.strip():
        ensure_waf_on_regional_services(
            bindings, web_acl_arn=args.web_acl_arn.strip(), dry_run=args.dry_run
        )

    if not args.skip_dns:
        fix_wildcard_dns(dry_run=args.dry_run)

    if args.enable_amplify_waf:
        enable_amplify_waf(dry_run=args.dry_run)

    print()
    print("Done. Next: npm run amplify:sync-headers && redeploy main (CSP/HSTS).")
    print(
        "Paid option: re-run with --enable-amplify-waf and enable Firewall in Console."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1) from error
