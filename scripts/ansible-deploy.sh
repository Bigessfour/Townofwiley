#!/usr/bin/env bash
#
# DEPRECATED — production deploy is GitHub Actions (S3 + CloudFront OIDC).
# See docs/DEPLOYMENT_SSOT.md and docs/ansible-DEPRECATED.md.
#
# Escape hatch (reference / archaeology only):
#   ALLOW_DEPRECATED_ANSIBLE=1 ./scripts/ansible-deploy.sh --tags verify
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ "${ALLOW_DEPRECATED_ANSIBLE:-}" != "1" ]]; then
  cat <<'EOF' >&2
[DEPRECATED] Ansible deploy is disabled for Town of Wiley production.

Canonical frontend deploy:
  • Merge a green PR to main → Site CI → deploy-production (OIDC → S3 + CloudFront)
  • Break-glass: npm run deploy:site
  • Manual: GitHub Actions → Deploy production (manual)

Docs:
  docs/DEPLOYMENT_SSOT.md
  docs/github-actions-production-deploy.md
  docs/ansible-DEPRECATED.md

Terraform remains for IaC scaffolding (not static-site publish).
To force a legacy Ansible run (not recommended): ALLOW_DEPRECATED_ANSIBLE=1 …
EOF
  exit 1
fi

echo "[ansible-deploy] ALLOW_DEPRECATED_ANSIBLE=1 — proceeding with legacy playbook" >&2

source "${SCRIPT_DIR}/agent-aws-env.sh"
export ANSIBLE_CONFIG="${REPO_ROOT}/ansible.cfg"

echo "[ansible-deploy] Using ANSIBLE_CONFIG=${ANSIBLE_CONFIG}"
echo "[ansible-deploy] AWS_PROFILE=${AWS_PROFILE:-} AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-}"
echo "[ansible-deploy] Invoking: ansible-playbook ansible/playbooks/deploy.yml $*"
echo

exec ansible-playbook "${REPO_ROOT}/ansible/playbooks/deploy.yml" "$@"
