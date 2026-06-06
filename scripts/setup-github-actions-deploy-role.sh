#!/usr/bin/env bash
#
# One-time setup: GitHub Actions OIDC role for production static site deploy.
# Requires IAM admin on Town of Wiley account 570912405222.
#
# Usage:
#   source scripts/agent-aws-env.sh
#   bash scripts/setup-github-actions-deploy-role.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

ROLE_NAME="${TOW_GITHUB_DEPLOY_ROLE_NAME:-GitHubActions-TownOfWiley-StaticSiteDeploy}"
ACCOUNT_ID="570912405222"
OIDC_PROVIDER_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
TRUST_FILE="${REPO_ROOT}/infrastructure/iam/github-actions-static-site-deploy-trust.json"
POLICY_FILE="${REPO_ROOT}/infrastructure/iam/github-actions-static-site-deploy-policy.json"

if ! command -v aws >/dev/null 2>&1; then
  echo "error: aws CLI not found" >&2
  exit 1
fi

CALLER_ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
if [[ ${CALLER_ACCOUNT} != "${ACCOUNT_ID}" ]]; then
  echo "error: expected AWS account ${ACCOUNT_ID}, got ${CALLER_ACCOUNT}" >&2
  exit 1
fi

if ! aws iam get-open-id-connect-provider --open-id-connect-provider-arn "${OIDC_PROVIDER_ARN}" >/dev/null 2>&1; then
  echo "Creating GitHub OIDC provider..."
  THUMBPRINT="$(openssl s_client -connect token.actions.githubusercontent.com:443 -servername token.actions.githubusercontent.com </dev/null 2>/dev/null | openssl x509 -fingerprint -sha1 -noout | cut -d= -f2 | tr -d ':')"
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list "${THUMBPRINT}"
else
  echo "GitHub OIDC provider already exists."
fi

if aws iam get-role --role-name "${ROLE_NAME}" >/dev/null 2>&1; then
  echo "Updating trust policy on existing role ${ROLE_NAME}..."
  aws iam update-assume-role-policy \
    --role-name "${ROLE_NAME}" \
    --policy-document "file://${TRUST_FILE}"
else
  echo "Creating IAM role ${ROLE_NAME}..."
  aws iam create-role \
    --role-name "${ROLE_NAME}" \
    --assume-role-policy-document "file://${TRUST_FILE}" \
    --description "GitHub Actions OIDC deploy for townofwiley.gov static site (S3 + CloudFront)"
fi

echo "Attaching inline deploy policy..."
aws iam put-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-name TownOfWileyStaticSiteDeploy \
  --policy-document "file://${POLICY_FILE}"

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
echo ""
echo "Done. Configure GitHub Actions with:"
echo "  role-to-assume: ${ROLE_ARN}"
echo ""
echo "Verify:"
echo "  aws iam get-role --role-name ${ROLE_NAME} --query Role.Arn --output text"
