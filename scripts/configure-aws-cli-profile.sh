#!/usr/bin/env bash
# Configure a named AWS CLI profile for Town of Wiley (account 570912405222).
# Default local profile name: steve (see .vscode/settings.json "aws.profile"; bracket [steve] in ~/.aws/credentials).
# Keys come from IAM (e.g. user copilot in account 570912405222). Code Platoon is 388691194728 — use a separate ~/.aws profile for each account.
#
# Best practice: credentials only under ~/.aws/ with chmod 600 — never in the git repo.
# See: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
#
# Usage (from repo root):
#   bash scripts/configure-aws-cli-profile.sh
#   AWS_PROFILE_NAME=othername bash scripts/configure-aws-cli-profile.sh   # optional override
#
# You need the secret access key from IAM when the key was created; if lost, create a new key in the console.

set -euo pipefail

readonly PROFILE="${AWS_PROFILE_NAME:-steve}"
readonly REGION="${AWS_DEFAULT_REGION:-us-east-2}"
readonly EXPECTED_ACCOUNT="${TOWN_OF_WILEY_AWS_ACCOUNT_ID:-570912405222}"

echo "This script writes credentials only to ~/.aws/ (not this repository)."
echo "Profile: ${PROFILE}   Region: ${REGION}   (expected account: ${EXPECTED_ACCOUNT})"
echo ""
echo "In IAM → Users → (e.g. copilot) → Security credentials, use one access key and its secret."
echo "If you do not have the secret, choose Create access key and deactivate the old key when done."
echo ""

if [[ -t 0 ]]; then
  set +o history 2>/dev/null || true
  read -rp "Access key ID: " AK
  read -rsp "Secret access key (input hidden): " SK
  echo ""
  set -o history 2>/dev/null || true
else
  echo "Error: run this script in an interactive terminal so the secret is not echoed." >&2
  exit 1
fi

if [[ -z "${AK// /}" || -z "${SK// /}" ]]; then
  echo "Error: access key ID and secret access key are required." >&2
  exit 1
fi

mkdir -p "${HOME}/.aws"
aws configure set aws_access_key_id "${AK}" --profile "${PROFILE}"
aws configure set aws_secret_access_key "${SK}" --profile "${PROFILE}"
aws configure set region "${REGION}" --profile "${PROFILE}"

unset AK SK

for f in "${HOME}/.aws/credentials" "${HOME}/.aws/config"; do
  if [[ -f "${f}" ]]; then
    chmod 600 "${f}"
  fi
done

echo ""
echo "Verifying caller identity..."
OUT="$(AWS_PROFILE="${PROFILE}" aws sts get-caller-identity --output json)"
echo "${OUT}"
if command -v jq >/dev/null 2>&1; then
  ACC="$(echo "${OUT}" | jq -r .Account)"
else
  ACC=""
fi
if [[ -n "${ACC}" && "${ACC}" != "null" && "${ACC}" != "${EXPECTED_ACCOUNT}" ]]; then
  echo ""
  echo "Warning: expected AWS account ${EXPECTED_ACCOUNT}; got ${ACC}. Check the access key belongs to Town of Wiley." >&2
fi

echo ""
echo "Done. Use: export AWS_PROFILE=${PROFILE} AWS_DEFAULT_REGION=${REGION}"
