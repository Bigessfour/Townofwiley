#!/usr/bin/env bash
# Export short-lived credentials for Terraform (AWS provider does not use `aws login` sessions directly).
# Usage: source scripts/terraform-export-aws-env.sh [profile]
set -euo pipefail

PROFILE="${1:-${AWS_PROFILE:-steve}}"
if ! eval "$(aws configure export-credentials --profile "${PROFILE}" --format env)"; then
  echo "error: export credentials failed for profile ${PROFILE}. Run: npm run aws:login" >&2
  return 1 2>/dev/null || exit 1
fi
unset AWS_PROFILE
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-2}"