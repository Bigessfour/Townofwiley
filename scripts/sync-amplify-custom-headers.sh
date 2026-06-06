#!/usr/bin/env bash
# HISTORICAL: Push custom HTTP headers to (deleted) AWS Amplify Hosting app from customHttp.yml.
# Now a no-op / dev-parity only for prod S3+CF (CSP lives in CloudFront Response Headers Policy).
# customHttp.yml remains SSOT for ng serve parity and reference. See README + manifest.
# (Amplify Hosting app d331voxr1fhoir decommissioned June 2026.)
#
# Prerequisites:
#   - AWS CLI v2
#   - Credentials for account 570912405222 (Town of Wiley). Example:
#       export AWS_PROFILE=townofwiley   # must resolve to account 570912405222 (see .vscode/settings.json)
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

if [[ ! -f ${HEADERS_FILE} ]]; then
  echo "error: missing ${HEADERS_FILE}" >&2
  exit 1
fi

ACCOUNT="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
if [[ -z ${ACCOUNT} || ${ACCOUNT} == "None" ]]; then
  echo "error: could not resolve AWS caller (configure credentials / profile)" >&2
  exit 1
fi

if [[ ${SKIP_ACCOUNT_CHECK:-0} != "1" && ${ACCOUNT} != "${EXPECTED_ACCOUNT}" ]]; then
  echo "error: current AWS account is ${ACCOUNT} (expected ${EXPECTED_ACCOUNT} for Town of Wiley Amplify)." >&2
  echo "  Use credentials for the Wiley account (e.g. export AWS_PROFILE=...) or set SKIP_ACCOUNT_CHECK=1 if intentional." >&2
  exit 1
fi

# Historical Amplify app is deleted (S3+CF hosting); gracefully skip to avoid update-app errors.
if ! aws amplify get-app --app-id "${APP_ID}" --region "${REGION}" --query 'app.id' --output text >/dev/null 2>&1; then
  echo "Amplify app ${APP_ID} not found (decommissioned June 2026) — skipping sync."
  echo "Prod CSP/security headers are now served by CloudFront Response Headers Policy (see attached policy and customHttp.yml as source)."
  exit 0
fi

# Pass YAML via --cli-input-json so CSP single-quotes and newlines are not mangled by the shell.
CLI_INPUT="$(mktemp)"
trap 'rm -f "$CLI_INPUT"' EXIT

jq -n \
  --arg id "${APP_ID}" \
  --rawfile raw "${HEADERS_FILE}" \
  '{appId: $id, customHeaders: $raw}' >"${CLI_INPUT}"

echo "Updating Amplify app ${APP_ID} in ${REGION} (account ${ACCOUNT})..."
aws amplify update-app \
  --cli-input-json "file://${CLI_INPUT}" \
  --region "${REGION}" \
  --output json \
  --query 'app.{appId:appId,name:name,customHeaders:customHeaders}' \
  --output text

echo ""
echo "Verifying remote app customHeaders include expected CSP markers..."
REMOTE_RAW="$(aws amplify get-app --app-id "${APP_ID}" --region "${REGION}" --output json)"
REMOTE_HEADERS="$(jq -r '.app.customHeaders // empty' <<<"${REMOTE_RAW}")"
if [[ -z ${REMOTE_HEADERS} ]]; then
  echo "error: get-app returned empty customHeaders (sync may have failed)" >&2
  exit 1
fi
# Baseline tokens must survive API round-trip (prevents silent truncation).
# frame-src includes 'self' before GTM; match CSP as written in repo customHttp.yml
for needle in "Content-Security-Policy" "worker-src" "googletagmanager" "g.doubleclick.net" "font-src 'self' data:" "frame-src 'self' https://www.googletagmanager.com" "bots.easy-peasy.ai"; do
  if ! grep -qF "${needle}" <<<"${REMOTE_HEADERS}"; then
    echo "error: remote customHeaders missing expected substring: ${needle}" >&2
    exit 1
  fi
done
echo "Remote customHeaders OK (CSP markers present)."

echo ""
echo "Done. Trigger a redeploy (empty commit or Amplify Console 'Redeploy this version') so CloudFront picks up header changes if they do not apply immediately."
