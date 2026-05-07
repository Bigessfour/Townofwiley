#!/usr/bin/env bash
# Download the Amplify Hosting BUILD transcript for a frontend (WEB) app.
#
# SPA builds are NOT delivered to customer CloudWatch by default—the API exposes
# time-limited S3 URLs (steps[].logUrl). This script curls that URL locally.
#
# Usage (profile townofwiley → 570912405222, us-east-2):
#   ./scripts/fetch-amplify-build-log.sh
#   AMPLIFY_APP_ID=d331voxr1fhoir BRANCH_NAME=main JOB_ID=190 ./scripts/fetch-amplify-build-log.sh
#
# Optionally write:
#   ./scripts/fetch-amplify-build-log.sh > /tmp/amplify-main-build.txt

set -euo pipefail

APP="${AMPLIFY_APP_ID:-d331voxr1fhoir}"
BR="${BRANCH_NAME:-main}"
JOB="${JOB_ID-}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-2}}"

if [[ -z ${JOB} ]]; then
  JOB="$(aws amplify list-jobs --app-id "${APP}" --branch-name "${BR}" \
    --region "${REGION}" --max-results 1 \
    --query 'jobSummaries[0].jobId' --output text)"
fi

# JMESPath literal uses backticks inside the query (--query must stay single-quoted for the shell).
# shellcheck disable=SC2016
LOG_URL="$(aws amplify get-job --app-id "${APP}" --branch-name "${BR}" \
  --job-id "${JOB}" --region "${REGION}" \
  --query 'job.steps[?stepName==`BUILD`].logUrl | [0]' --output text)"

if [[ -z ${LOG_URL} || ${LOG_URL} == "None" ]]; then
  echo "error: no BUILD logUrl for job ${JOB}" >&2
  exit 1
fi

echo "job=${JOB}" >&2
curl -sfS "${LOG_URL}"
