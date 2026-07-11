#!/usr/bin/env bash
# Refresh AWS CLI credentials for Town of Wiley account 570912405222.
# Preferred agent IAM user: copilot (profile townofwiley). Interactive login also works as steve/bigessfour.
#
# Usage:
#   bash scripts/aws-login-town.sh
#   bash scripts/aws-login-town.sh copilot   # profile townofwiley
#   bash scripts/aws-login-town.sh steve     # personal IAM user in same account
set -euo pipefail

readonly EXPECTED_ACCOUNT="570912405222"
WHO="${1:-steve}"

case "$WHO" in
  copilot | townofwiley)
    PROFILE="townofwiley"
    ;;
  steve | bigessfour)
    PROFILE="steve"
    ;;
  *)
    echo "Usage: $0 [copilot|steve]" >&2
    exit 1
    ;;
esac

echo "Opening browser login for profile=${PROFILE} (expected account ${EXPECTED_ACCOUNT})…"
aws login --profile "${PROFILE}"

ACCT="$(aws sts get-caller-identity --profile "${PROFILE}" --query Account --output text)"
ARN="$(aws sts get-caller-identity --profile "${PROFILE}" --query Arn --output text)"
if [[ "${ACCT}" != "${EXPECTED_ACCOUNT}" ]]; then
  echo "error: logged into ${ACCT}, expected ${EXPECTED_ACCOUNT}" >&2
  exit 1
fi
echo "OK: ${ARN}"
echo "Use: export AWS_PROFILE=${PROFILE} AWS_DEFAULT_REGION=us-east-2"