#!/usr/bin/env bash
# Apply S3 document bucket IAM inline policies for Cognito guest + Staff auth roles.
# SSOT: infrastructure/iam/documents-*-access-policy.json
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

: "${AWS_PROFILE:=townofwiley}"
: "${AWS_REGION:=us-east-2}"
export AWS_PROFILE AWS_REGION

UNAUTH_ROLE="amplify-townofwiley-main-d1245-unauthRole"
AUTH_ROLE="amplify-townofwiley-main-d1245-authRole"

echo "Applying documentsGuestReadAccess -> ${UNAUTH_ROLE} (profile: ${AWS_PROFILE})"
aws iam put-role-policy \
  --role-name "${UNAUTH_ROLE}" \
  --policy-name documentsGuestReadAccess \
  --policy-document "file://${REPO_ROOT}/infrastructure/iam/documents-guest-read-access-policy.json"

echo "Applying documentsAuthAccess -> ${AUTH_ROLE}"
aws iam put-role-policy \
  --role-name "${AUTH_ROLE}" \
  --policy-name documentsAuthAccess \
  --policy-document "file://${REPO_ROOT}/infrastructure/iam/documents-auth-access-policy.json"

echo "Done. Guest + Staff document storage IAM policies updated."
