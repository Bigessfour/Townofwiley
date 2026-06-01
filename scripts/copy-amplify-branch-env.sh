#!/usr/bin/env bash
# Copy Amplify Hosting environment variables from one branch to another (names + values).
# Usage: AWS_PROFILE=townofwiley AWS_REGION=us-east-2 ./scripts/copy-amplify-branch-env.sh main gen2-main
set -euo pipefail

APP_ID="${AMPLIFY_APP_ID:-d331voxr1fhoir}"
FROM_BRANCH="${1:-main}"
TO_BRANCH="${2:-gen2-main}"

if [[ -z ${AWS_PROFILE-} ]]; then
  echo "Set AWS_PROFILE (e.g. townofwiley) before running." >&2
  exit 1
fi

ENV_JSON="$(aws amplify get-branch --app-id "$APP_ID" --branch-name "$FROM_BRANCH" --query 'branch.environmentVariables' --output json)"
if [[ $ENV_JSON == "null" || -z $ENV_JSON ]]; then
  echo "No environment variables on branch $FROM_BRANCH." >&2
  exit 1
fi

aws amplify update-branch \
  --app-id "$APP_ID" \
  --branch-name "$TO_BRANCH" \
  --environment-variables "$ENV_JSON"

echo "Copied environment variables from $FROM_BRANCH to $TO_BRANCH on app $APP_ID."
