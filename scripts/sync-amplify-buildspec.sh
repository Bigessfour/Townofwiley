#!/usr/bin/env bash
# Push Amplify Hosting build settings from repo-root amplify.yml (Node pin, npm ci, artifacts).
# Console buildSpec can drift when edited manually; this restores the repo SSOT.
#
# https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html
#
# Usage:
#   ./scripts/sync-amplify-buildspec.sh
#   AMPLIFY_APP_ID=d331voxr1fhoir AWS_REGION=us-east-2 AWS_PROFILE=townofwiley ./scripts/sync-amplify-buildspec.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDSPEC_FILE="${ROOT}/amplify.yml"
EXPECTED_ACCOUNT="${TOW_AMPLIFY_ACCOUNT_ID:-570912405222}"
APP_ID="${AMPLIFY_APP_ID:-d331voxr1fhoir}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-2}}"

if ! command -v aws >/dev/null 2>&1; then
  echo "error: aws CLI not found" >&2
  exit 1
fi

if [[ ! -f ${BUILDSPEC_FILE} ]]; then
  echo "error: missing ${BUILDSPEC_FILE}" >&2
  exit 1
fi

ACCOUNT="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
if [[ -z ${ACCOUNT} || ${ACCOUNT} == "None" ]]; then
  echo "error: could not resolve AWS caller (configure credentials / profile)" >&2
  exit 1
fi

if [[ ${SKIP_ACCOUNT_CHECK:-0} != "1" && ${ACCOUNT} != "${EXPECTED_ACCOUNT}" ]]; then
  echo "error: current AWS account is ${ACCOUNT} (expected ${EXPECTED_ACCOUNT} for Town of Wiley Amplify)." >&2
  exit 1
fi

echo "Updating Amplify buildSpec on app ${APP_ID} (${REGION}) from ${BUILDSPEC_FILE}..."
aws amplify update-app \
  --app-id "${APP_ID}" \
  --region "${REGION}" \
  --build-spec "file://${BUILDSPEC_FILE}" \
  --query 'app.{appId:appId,buildSpec:buildSpec}' \
  --output json

echo ""
echo "Done. Trigger a main branch build if you need the new Node pin on the next artifact."
