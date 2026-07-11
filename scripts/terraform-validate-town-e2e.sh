#!/usr/bin/env bash
# E2E Terraform + AWS alignment (HashiCorp: fmt, validate, plan; repo: verify:aws-infra).
#
# Usage:
#   npm run terraform:e2e:validate
#   AWS_PROFILE=steve npm run terraform:e2e:validate
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly EXPECTED_ACCOUNT="570912405222"
PROFILE="${AWS_PROFILE:-steve}"

ACCT="$(aws sts get-caller-identity --profile "${PROFILE}" --query Account --output text 2>/dev/null || true)"
if [[ "${ACCT}" != "${EXPECTED_ACCOUNT}" ]]; then
  echo "error: profile ${PROFILE} must be account ${EXPECTED_ACCOUNT} (got ${ACCT:-none})" >&2
  exit 1
fi

# shellcheck source=scripts/terraform-export-aws-env.sh
source "${SCRIPT_DIR}/terraform-export-aws-env.sh" "${PROFILE}"

echo "=== 1. terraform fmt -check (recursive) ==="
terraform -chdir="${REPO_ROOT}/infrastructure/terraform" fmt -check -recursive

echo ""
echo "=== 2. terraform validate (all workspaces, local backend) ==="
for dir in \
  "${REPO_ROOT}/infrastructure/terraform/bootstrap/state-backend" \
  "${REPO_ROOT}/infrastructure/terraform/environments/town-production" \
  "${REPO_ROOT}/infrastructure/terraform/stacks/guestbook-decommission"; do
  echo "-- ${dir}"
  terraform -chdir="${dir}" init -backend=false -input=false >/dev/null
  terraform -chdir="${dir}" validate
done

echo ""
echo "=== 3. town-production plan (read-only; expect no changes) ==="
PROD="${REPO_ROOT}/infrastructure/terraform/environments/town-production"
rm -rf "${PROD}/.terraform"
terraform -chdir="${PROD}" init -input=false >/dev/null
set +e
PLAN_OUT="$(terraform -chdir="${PROD}" plan -input=false -detailed-exitcode 2>&1)"
PLAN_CODE=$?
set -e
echo "${PLAN_OUT}"
if [[ ${PLAN_CODE} -eq 0 ]]; then
  echo "plan: no changes (aligned)"
elif [[ ${PLAN_CODE} -eq 2 ]]; then
  if echo "${PLAN_OUT}" | grep -qE '# (aws_|module\.)[^ ]+ will be (created|updated|destroyed|replaced)'; then
    echo "error: plan proposes infrastructure changes; fix Terraform or import before merge" >&2
    exit 1
  fi
  echo "plan: output-only refresh (all manifest Lambdas resolved; no managed resources to apply)"
else
  echo "error: terraform plan failed (exit ${PLAN_CODE})" >&2
  exit 1
fi

echo ""
echo "=== 4. verify:aws-infra (manifest vs live AWS) ==="
cd "${REPO_ROOT}"
npm run verify:aws-infra -- --skip-log-retention 2>&1 | tail -40

echo ""
echo "=== E2E Terraform validation complete ==="
exit 0