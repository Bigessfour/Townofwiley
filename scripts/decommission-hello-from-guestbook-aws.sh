#!/usr/bin/env bash
#
# Discover and remove AWS resources dedicated to the deprecated hello-from guestbook.
# Does not touch CMS, weather, email-alias, NWS, or other Lambdas.
#
# Usage:
#   source scripts/agent-aws-env.sh
#   npm run aws:guestbook:discover
#   npm run aws:guestbook:decommission   # requires --confirm on CLI
#
set -euo pipefail

readonly REGION="${AWS_DEFAULT_REGION:-us-east-2}"
readonly EXPECTED_ACCOUNT="570912405222"
readonly FUNCTION_NAME="${GUESTBOOK_FUNCTION_NAME:-TownOfWileyGuestbook}"
readonly ROLE_NAME="${GUESTBOOK_ROLE_NAME:-TownOfWileyGuestbookRole}"
readonly TABLE_NAME="${GUESTBOOK_TABLE_NAME:-TownOfWileyGuestbook}"
readonly LOG_GROUP="/aws/lambda/${FUNCTION_NAME}"

MODE="${1:-discover}"
CONFIRM="${2:-}"

aws_cmd() {
  aws "$@" --region "$REGION" --output json 2>/dev/null
}

aws_text() {
  aws "$@" --region "$REGION" --output text 2>/dev/null
}

account_check() {
  local acct
  acct="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
  if [[ "$acct" != "$EXPECTED_ACCOUNT" ]]; then
    echo "ERROR: Expected AWS account ${EXPECTED_ACCOUNT}; got '${acct:-none}'."
    echo "Run: source scripts/agent-aws-env.sh && aws sso login --profile townofwiley"
    exit 1
  fi
}

report_lambda() {
  if aws_cmd lambda get-function --function-name "$FUNCTION_NAME" >/dev/null; then
    echo "FOUND  Lambda: ${FUNCTION_NAME}"
    if aws_cmd lambda get-function-url-config --function-name "$FUNCTION_NAME" >/dev/null; then
      local url
      url="$(aws_text lambda get-function-url-config --function-name "$FUNCTION_NAME" --query FunctionUrl)"
      echo "       Function URL: ${url}"
    else
      echo "       Function URL: (none)"
    fi
  else
    echo "ABSENT Lambda: ${FUNCTION_NAME}"
  fi
}

report_table() {
  if aws_cmd dynamodb describe-table --table-name "$TABLE_NAME" >/dev/null; then
    local status items
    status="$(aws_text dynamodb describe-table --table-name "$TABLE_NAME" --query 'Table.TableStatus')"
    items="$(aws_text dynamodb describe-table --table-name "$TABLE_NAME" --query 'Table.ItemCount' 2>/dev/null || echo '?')"
    echo "FOUND  DynamoDB: ${TABLE_NAME} (status=${status}, approx items=${items})"
  else
    echo "ABSENT DynamoDB: ${TABLE_NAME}"
  fi
}

report_role() {
  if aws_cmd iam get-role --role-name "$ROLE_NAME" >/dev/null; then
    echo "FOUND  IAM role: ${ROLE_NAME}"
  else
    echo "ABSENT IAM role: ${ROLE_NAME}"
  fi
}

report_log_group() {
  if aws_cmd logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" | grep -q "$LOG_GROUP"; then
    echo "FOUND  CloudWatch: ${LOG_GROUP}"
  else
    echo "ABSENT CloudWatch: ${LOG_GROUP}"
  fi
}

discover() {
  account_check
  echo "Hello-from guestbook AWS evaluation (region ${REGION})"
  echo "------------------------------------------------------"
  report_lambda
  report_table
  report_role
  report_log_group
  echo ""
  echo "If anything is FOUND, run decommission after backup review:"
  echo "  npm run aws:guestbook:decommission -- --confirm"
}

delete_lambda() {
  if ! aws_cmd lambda get-function --function-name "$FUNCTION_NAME" >/dev/null; then
    return 0
  fi
  echo "Deleting Lambda function URL (if any)…"
  aws lambda delete-function-url-config --function-name "$FUNCTION_NAME" --region "$REGION" 2>/dev/null || true
  echo "Deleting Lambda ${FUNCTION_NAME}…"
  aws lambda delete-function --function-name "$FUNCTION_NAME" --region "$REGION"
}

delete_log_group() {
  if aws_cmd logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" | grep -q "$LOG_GROUP"; then
    echo "Deleting log group ${LOG_GROUP}…"
    aws logs delete-log-group --log-group-name "$LOG_GROUP" --region "$REGION"
  fi
}

delete_table() {
  if ! aws_cmd dynamodb describe-table --table-name "$TABLE_NAME" >/dev/null; then
    return 0
  fi
  echo "Deleting DynamoDB table ${TABLE_NAME}…"
  aws dynamodb delete-table --table-name "$TABLE_NAME" --region "$REGION"
  echo "Waiting for table removal…"
  aws dynamodb wait table-not-exists --table-name "$TABLE_NAME" --region "$REGION"
}

delete_role() {
  if ! aws_cmd iam get-role --role-name "$ROLE_NAME" >/dev/null; then
    return 0
  fi
  echo "Detaching IAM policies from ${ROLE_NAME}…"
  local policies
  policies="$(aws iam list-attached-role-policies --role-name "$ROLE_NAME" --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null || true)"
  for arn in $policies; do
    [[ -z "$arn" || "$arn" == "None" ]] && continue
    aws iam detach-role-policy --role-name "$ROLE_NAME" --policy-arn "$arn"
  done
  local inline
  inline="$(aws iam list-role-policies --role-name "$ROLE_NAME" --query 'PolicyNames[]' --output text 2>/dev/null || true)"
  for name in $inline; do
    [[ -z "$name" || "$name" == "None" ]] && continue
    aws iam delete-role-policy --role-name "$ROLE_NAME" --policy-name "$name"
  done
  echo "Deleting IAM role ${ROLE_NAME}…"
  aws iam delete-role --role-name "$ROLE_NAME"
}

decommission() {
  if [[ "$CONFIRM" != "--confirm" ]]; then
    echo "Refusing to delete without --confirm"
    echo "Usage: npm run aws:guestbook:decommission -- --confirm"
    exit 1
  fi
  account_check
  discover
  echo ""
  echo "Applying guestbook-only decommission…"
  delete_lambda
  delete_log_group
  delete_table
  delete_role
  echo ""
  echo "Done. Re-run: npm run aws:guestbook:discover (all should be ABSENT)."
}

case "$MODE" in
  discover) discover ;;
  decommission) decommission ;;
  *)
    echo "Usage: $0 discover|decommission [--confirm]"
    exit 1
    ;;
esac