#!/usr/bin/env bash
# List running Town of Wiley AWS resources (read-only). Account must be 570912405222.
#
# Usage:
#   source scripts/agent-aws-env.sh   # or export AWS_PROFILE=steve|townofwiley
#   bash scripts/aws-discover-town-resources.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly EXPECTED_ACCOUNT="570912405222"

PROFILE="${AWS_PROFILE:-townofwiley}"
REGION="${AWS_DEFAULT_REGION:-us-east-2}"

ACCT="$(aws sts get-caller-identity --profile "${PROFILE}" --query Account --output text 2>/dev/null || true)"
if [[ "${ACCT}" != "${EXPECTED_ACCOUNT}" ]]; then
  echo "error: profile ${PROFILE} is account '${ACCT:-none}', expected ${EXPECTED_ACCOUNT}. Run: bash scripts/aws-login-town.sh steve" >&2
  exit 1
fi

echo "Town of Wiley resource discovery — account ${ACCT}, profile ${PROFILE}"
aws sts get-caller-identity --profile "${PROFILE}" --output table
echo ""

bash "${REPO_ROOT}/scripts/decommission-hello-from-guestbook-aws.sh" discover
echo ""

echo "=== Lambda TownOfWiley* (us-east-2) ==="
aws lambda list-functions --profile "${PROFILE}" --region us-east-2 \
  --query "Functions[?starts_with(FunctionName, 'TownOfWiley')].[FunctionName,Runtime,LastModified]" --output table

echo ""
echo "=== Lambda TownOfWiley* (us-east-1) ==="
aws lambda list-functions --profile "${PROFILE}" --region us-east-1 \
  --query "Functions[?starts_with(FunctionName, 'TownOfWiley')].[FunctionName,Runtime,LastModified]" --output table

echo ""
echo "=== DynamoDB tables (us-east-2) ==="
aws dynamodb list-tables --profile "${PROFILE}" --region us-east-2 --output table

echo ""
echo "=== S3 buckets (townofwiley*) ==="
aws s3api list-buckets --profile "${PROFILE}" \
  --query "Buckets[?starts_with(Name, 'townofwiley')].Name" --output table

echo ""
echo "=== CloudFront (manifest IDs) ==="
aws cloudfront list-distributions --profile "${PROFILE}" \
  --query "DistributionList.Items[?Id=='E1NZ3XCY5CYR1J' || Id=='E1VI8ZZ8L1HW1F'].[Id,DomainName,Status,Enabled]" --output table

echo ""
echo "=== AppSync townofwiley-main ==="
aws appsync list-graphql-apis --profile "${PROFILE}" --region us-east-2 \
  --query "graphqlApis[?apiId=='j7b2x3sh7rcezekekkxxiak7hi'].[name,apiId]" --output table

echo ""
echo "Compare with: npm run verify:aws-infra"