#!/usr/bin/env bash
# DEPRECATED: Guestbook IAM was removed 2026-07-11. Use only if discover shows FOUND resources.
# Import remaining hello-from guestbook IAM resources and terraform destroy them.
#
# Usage:
#   export AWS_PROFILE=steve   # or townofwiley / copilot — account 570912405222
#   bash scripts/terraform-destroy-guestbook.sh
#   bash scripts/terraform-destroy-guestbook.sh --auto-approve
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
STACK="${REPO_ROOT}/infrastructure/terraform/stacks/guestbook-decommission"
readonly EXPECTED_ACCOUNT="570912405222"
ROLE_NAME="TownOfWileyGuestbookRole"
POLICY_NAME="TownOfWileyGuestbookPolicy"
AUTO=""

if [[ "${1:-}" == "--auto-approve" ]]; then
  AUTO="-auto-approve"
fi

PROFILE="${AWS_PROFILE:-steve}"
ACCT="$(aws sts get-caller-identity --profile "${PROFILE}" --query Account --output text 2>/dev/null || true)"
if [[ "${ACCT}" != "${EXPECTED_ACCOUNT}" ]]; then
  echo "error: need account ${EXPECTED_ACCOUNT}; profile ${PROFILE} is '${ACCT:-none}'" >&2
  exit 1
fi

export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-2}"

# Terraform AWS provider does not read `aws login` sessions from profile alone.
if ! eval "$(aws configure export-credentials --profile "${PROFILE}" --format env)"; then
  echo "error: could not export credentials for profile ${PROFILE}. Run: npm run aws:login" >&2
  exit 1
fi
unset AWS_PROFILE

cd "${STACK}"
terraform init -input=false

TF_VARS=(-var="aws_profile=")

import_if_needed() {
  local addr="$1"
  local id="$2"
  if terraform state show "${addr}" >/dev/null 2>&1; then
    echo "State already has ${addr}"
    return 0
  fi
  if terraform import "${TF_VARS[@]}" "${addr}" "${id}"; then
    echo "Imported ${addr}"
    return 0
  fi
  echo "Skip import ${addr} (not in AWS or no permission)"
  return 0
}

if aws iam get-role --role-name "${ROLE_NAME}" >/dev/null 2>&1; then
  import_if_needed aws_iam_role.guestbook "${ROLE_NAME}"
  import_if_needed aws_iam_role_policy.guestbook "${ROLE_NAME}:${POLICY_NAME}"
else
  echo "IAM role ${ROLE_NAME} not found — nothing to destroy."
  exit 0
fi

echo ""
echo "Terraform destroy (guestbook IAM only)…"
terraform destroy "${TF_VARS[@]}" ${AUTO} -input=false

echo ""
bash "${REPO_ROOT}/scripts/decommission-hello-from-guestbook-aws.sh" discover