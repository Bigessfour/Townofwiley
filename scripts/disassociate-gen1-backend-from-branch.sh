#!/usr/bin/env bash
# Remove Gen 1 backendEnvironmentArn from a Hosting branch so only Gen 2 ampx deploy runs.
# Usage: AWS_PROFILE=townofwiley ./scripts/disassociate-gen1-backend-from-branch.sh gen2-main
set -euo pipefail

BRANCH="${1:-gen2-main}"
APP_ID="${AMPLIFY_APP_ID:-d331voxr1fhoir}"

aws amplify update-branch \
  --app-id "$APP_ID" \
  --branch-name "$BRANCH" \
  --backend-environment-arn ""

echo "Cleared Gen 1 backend association on branch ${BRANCH} (app ${APP_ID})."
