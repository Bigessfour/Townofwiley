#!/usr/bin/env bash
# Export live TOW inventory from account 570912405222 (profile townofwiley).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${SCRIPT_DIR}/../exports"
mkdir -p "$OUT"

export AWS_PROFILE="${AWS_PROFILE:-townofwiley}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-2}"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
if [[ "$ACCOUNT" != "570912405222" ]]; then
  echo "Refusing: expected account 570912405222, got ${ACCOUNT} (profile ${AWS_PROFILE})" >&2
  exit 1
fi

ZONE=Z088746831TMIL67NZ0VF
CF=E1NZ3XCY5CYR1J
CERT=arn:aws:acm:us-east-1:570912405222:certificate/a7d4c19b-070a-478b-9f3a-7203e53fcf90
POOL=us-east-2_DmY7BCBIp

aws sts get-caller-identity >"$OUT/source-caller-identity.json"
aws route53 list-resource-record-sets --hosted-zone-id "$ZONE" >"$OUT/route53-townofwiley.gov.json"
aws cloudfront get-distribution-config --id "$CF" >"$OUT/cloudfront-${CF}.json"
aws acm describe-certificate --region us-east-1 --certificate-arn "$CERT" >"$OUT/acm-townofwiley.gov.json"
aws sesv2 get-email-identity --email-identity townofwiley.gov --region us-east-2 >"$OUT/ses-townofwiley.gov.json"
aws cognito-idp list-users --user-pool-id "$POOL" >"$OUT/cognito-users-raw.json"
aws cognito-idp list-groups --user-pool-id "$POOL" >"$OUT/cognito-groups.json"
aws dynamodb list-tables --query "TableNames[?contains(@, 'j7b2x3sh7rcezekekkxxiak7hi')]" >"$OUT/dynamodb-cms-tables.json"
aws lambda list-functions --query "Functions[?starts_with(FunctionName, 'TownOfWiley') || starts_with(FunctionName, 'townofwiley')]" >"$OUT/lambdas-tow.json"
aws s3api list-buckets --query "Buckets[?contains(Name, 'townofwiley')].Name" >"$OUT/s3-tow-buckets.json"

echo "Wrote exports to ${OUT} (account ${ACCOUNT})"
