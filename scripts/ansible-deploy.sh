#!/usr/bin/env bash
#
# scripts/ansible-deploy.sh
#
# Thin convenience wrapper for Town of Wiley Ansible deployments.
# - Sources the standard agent AWS env (AWS_PROFILE=townofwiley, region).
# - Ensures repo-root ansible.cfg is used for config discovery.
# - Forwards all arguments (e.g. --tags frontend, --check --diff, --list-tags) to the playbook.
#
# Usage (after npm install / in CI or locally):
#   npm run ansible:deploy
#   npm run ansible:deploy:frontend
#   npm run ansible:deploy:lambdas
#   npm run ansible:verify
#   npm run ansible:check
#   ./scripts/ansible-deploy.sh --tags "iam,lambdas,verify" --check --diff
#
# Prerequisites:
#   - npm run aws:configure-profile (or equivalent) so the townofwiley profile exists.
#   - Ansible installed for full runs (CI job installs it on-demand).
#
# This keeps raw `ansible-playbook` + manual env setup out of everyday ops/docs.
# The underlying roles still delegate the real work to the existing battle-tested
# scripts/deploy-*.py and deploy-static-site.sh (per project constraints).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Source the standard AWS env setup (exports AWS_PROFILE + AWS_DEFAULT_REGION).
# Safe to source; it only sets profile/region and prints diagnostics.
source "${SCRIPT_DIR}/agent-aws-env.sh"

# Prefer the root ansible.cfg for discovery when invoked from repo root.
# This makes "npm run ansible:..." and direct calls work without users setting ANSIBLE_CONFIG.
export ANSIBLE_CONFIG="${REPO_ROOT}/ansible.cfg"

# If a user still has the old ansible/ansible.cfg and wants to force it, they can override
# ANSIBLE_CONFIG before calling this wrapper.

echo "[ansible-deploy] Using ANSIBLE_CONFIG=${ANSIBLE_CONFIG}"
echo "[ansible-deploy] AWS_PROFILE=${AWS_PROFILE} AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION}"
echo "[ansible-deploy] Invoking: ansible-playbook ansible/playbooks/deploy.yml $*"
echo

exec ansible-playbook "${REPO_ROOT}/ansible/playbooks/deploy.yml" "$@"
