#!/usr/bin/env bash
# Push custom HTTP headers to AWS Amplify Hosting (app-level), matching customHttp.yml / amplify.yml.
# This fixes CSP drift when the Amplify Console has a narrower policy than the repo (e.g. font-src missing data:).
#
# Prerequisites:
#   - AWS CLI v2
#   - Credentials for account 570912405222 (Town of Wiley). Example:
#       export AWS_PROFILE=root-login   # after: aws login --profile root-login
#   - jq (brew install jq)
#
# Payload: root customHttp.yml (YAML). Amplify UpdateApp validates YAML, not JSON.
#
# Usage:
#   ./scripts/sync-amplify-custom-headers.sh
#   AMPLIFY_APP_ID=d331voxr1fhoir AWS_REGION=us-east-2 ./scripts/sync-amplify-custom-headers.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Amplify UpdateApp expects customHeaders as YAML (see custom header YAML reference), not JSON.
HEADERS_FILE="${ROOT}/customHttp.yml"
EXPECTED_ACCOUNT="${TOW_AMPLIFY_ACCOUNT_ID:-570912405222}"
APP_ID="${AMPLIFY_APP_ID:-d331voxr1fhoir}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-2}}"

if ! command -v aws >/dev/null 2>&1; then
  echo "error: aws CLI not found" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq not found (install jq to compact JSON for --custom-headers)" >&2
  exit 1
fi

if [[ ! -f $HEADERS_FILE ]]; then
  echo "error: missing $HEADERS_FILE" >&2
  exit 1
fi

ACCOUNT="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
if [[ -z $ACCOUNT || $ACCOUNT == "None" ]]; then
  echo "error: could not resolve AWS caller (configure credentials / profile)" >&2
  exit 1
fi

if [[ ${SKIP_ACCOUNT_CHECK:-0} != "1" && $ACCOUNT != "$EXPECTED_ACCOUNT" ]]; then
  echo "error: current AWS account is $ACCOUNT (expected $EXPECTED_ACCOUNT for Town of Wiley Amplify)." >&2
  echo "  Use credentials for the Wiley account (e.g. export AWS_PROFILE=...) or set SKIP_ACCOUNT_CHECK=1 if intentional." >&2
  exit 1
fi

# Pass YAML via --cli-input-json so CSP single-quotes and newlines are not mangled by the shell.
CLI_INPUT="$(mktemp)"
trap 'rm -f "$CLI_INPUT"' EXIT

jq -n \
  --arg id "$APP_ID" \
  --rawfile raw "$HEADERS_FILE" \
  '{appId: $id, customHeaders: $raw}' >"$CLI_INPUT"

echo "Updating Amplify app $APP_ID in $REGION (account $ACCOUNT)..."
aws amplify update-app \
  --cli-input-json "file://$CLI_INPUT" \
  --region "$REGION" \
  --output json \
  --query 'app.{appId:appId,name:name,customHeaders:customHeaders}' \
  --output text

echo ""
echo "Done. Trigger a redeploy (empty commit or Amplify Console 'Redeploy this version') so CloudFront picks up header changes if they do not apply immediately."
