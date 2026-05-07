#!/usr/bin/env bash
# Push Amplify Hosting SPA rewrites from repo JSON (customRules), same as Console
# "Rewrites and redirects". Does not change customHeaders — run amplify:sync-headers separately.
#
# Prerequisites: AWS CLI v2, Wiley credentials (workspace default AWS_PROFILE=townofwiley → account 570912405222).
#
# Usage:
#   ./scripts/sync-amplify-spa-rules.sh
#   AMPLIFY_APP_ID=d331voxr1fhoir AWS_REGION=us-east-2 AWS_PROFILE=townofwiley ./scripts/sync-amplify-spa-rules.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RULES_JSON="${ROOT}/scripts/amplify-spa-rewrite-rules.json"
APP_ID="${AMPLIFY_APP_ID:-d331voxr1fhoir}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-2}}"

if [[ ! -f ${RULES_JSON} ]]; then
  echo "error: missing ${RULES_JSON}" >&2
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "error: aws CLI not found" >&2
  exit 1
fi

echo "Updating Amplify SPA customRules on app ${APP_ID} (${REGION}) from ${RULES_JSON}..."
aws amplify update-app \
  --app-id "${APP_ID}" \
  --region "${REGION}" \
  --custom-rules "file://${RULES_JSON}" \
  --output json \
  --query 'app.{appId:appId,name:name,customRules:customRules}' \
  --output text

echo ""
echo "Done. CloudFront usually picks this up within ~1 minute."
