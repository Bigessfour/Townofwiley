#!/usr/bin/env bash
#
# Deploy Town of Wiley static frontend to S3 + CloudFront invalidation.
# SSOT: infrastructure/aws-infrastructure.manifest.json (hosting block).
#
# Usage:
#   npm run deploy:site              # build + sync + invalidate
#   npm run deploy:site:dry          # dry-run sync only
#   bash scripts/deploy-static-site.sh --skip-build   # CI: artifact already built
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

DRY_RUN=false
SKIP_BUILD=false
DIST_DIR="${REPO_ROOT}/dist/townofwiley-app/browser"

while [[ $# -gt 0 ]]; do
  case "$1" in
  --dry-run)
    DRY_RUN=true
    shift
    ;;
  --skip-build)
    SKIP_BUILD=true
    shift
    ;;
  --dist)
    DIST_DIR="$2"
    shift 2
    ;;
  -h | --help)
    echo "Usage: deploy-static-site.sh [--dry-run] [--skip-build] [--dist PATH]"
    exit 0
    ;;
  *)
    echo "Unknown option: $1" >&2
    exit 1
    ;;
  esac
done

read_manifest() {
  node -e "
    import { readHostingManifest } from './scripts/lib/read-hosting-manifest.mjs';
    const m = readHostingManifest();
    console.log([m.accountId, m.hosting.s3Bucket, m.hosting.region, m.hosting.cloudFrontDistributionId].join('\t'));
  "
}

IFS=$'\t' read -r EXPECTED_ACCOUNT S3_BUCKET AWS_REGION CF_DIST_ID <<<"$(read_manifest)"

S3_BUCKET="${TOW_STATIC_SITE_BUCKET:-${S3_BUCKET}}"
CF_DIST_ID="${TOW_CF_DISTRIBUTION_ID:-${CF_DIST_ID}}"
AWS_REGION="${AWS_DEFAULT_REGION:-${AWS_REGION:-us-east-2}}"
export AWS_DEFAULT_REGION="${AWS_REGION}"
export AWS_REGION="${AWS_REGION}"

if ! command -v aws >/dev/null 2>&1; then
  echo "error: aws CLI not found" >&2
  exit 1
fi

CALLER_ACCOUNT="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
if [[ -z ${CALLER_ACCOUNT} || ${CALLER_ACCOUNT} == "None" ]]; then
  echo "error: aws sts get-caller-identity failed — configure AWS_PROFILE (e.g. source scripts/agent-aws-env.sh)" >&2
  exit 1
fi

if [[ ${CALLER_ACCOUNT} != "${EXPECTED_ACCOUNT}" ]]; then
  echo "error: expected AWS account ${EXPECTED_ACCOUNT}, got ${CALLER_ACCOUNT}" >&2
  exit 1
fi

node -e "
  import { assertBrowserDistLayout } from './scripts/lib/read-hosting-manifest.mjs';
  assertBrowserDistLayout(process.argv[1]);
" "${DIST_DIR}"

if [[ ${SKIP_BUILD} != true ]]; then
  echo "Building production bundle (strict runtime-config via prebuild)..."
  npm run build
fi

if [[ ! -f "${DIST_DIR}/index.html" ]]; then
  echo "error: missing ${DIST_DIR}/index.html — build first or pass --dist" >&2
  exit 1
fi

if [[ ! -f "${DIST_DIR}/runtime-config.js" ]]; then
  echo "error: missing ${DIST_DIR}/runtime-config.js — strict build should emit this file" >&2
  exit 1
fi

if [[ ! -f "${DIST_DIR}/runtime-config-admin.js" ]]; then
  echo "error: missing ${DIST_DIR}/runtime-config-admin.js — strict build should emit this file" >&2
  exit 1
fi

SYNC_EXTRA=()
if [[ ${DRY_RUN} == true ]]; then
  SYNC_EXTRA+=(--dryrun)
  echo "DRY RUN: no objects will be modified"
fi

echo "Syncing ${DIST_DIR} -> s3://${S3_BUCKET}/ (immutable assets)..."
aws s3 sync "${DIST_DIR}" "s3://${S3_BUCKET}" --delete \
  ${SYNC_EXTRA[@]+"${SYNC_EXTRA[@]}"} \
  --cache-control 'public, max-age=31536000, immutable' \
  --exclude 'index.html' \
  --exclude 'runtime-config.js' \
  --exclude 'runtime-config-admin.js' \
  --exclude 'cms-snapshot.json' \
  --exclude 'cms-revision.json' \
  --exclude '*/*.html'

echo "Syncing HTML + runtime-config (no-cache)..."
aws s3 sync "${DIST_DIR}" "s3://${S3_BUCKET}" --delete \
  ${SYNC_EXTRA[@]+"${SYNC_EXTRA[@]}"} \
  --cache-control 'no-cache, no-store, must-revalidate' \
  --include 'index.html' \
  --include 'runtime-config.js' \
  --include 'runtime-config-admin.js' \
  --include '*/*.html'

echo "Skipping cms-snapshot.json / cms-revision.json — owned by TownOfWileyCmsChangeNotifier (stream → S3)."

if [[ ${DRY_RUN} == true ]]; then
  echo "DRY RUN: skipping CloudFront invalidation"
  exit 0
fi

echo "Creating CloudFront invalidation on ${CF_DIST_ID}..."
INVALIDATION_ID="$(
  aws cloudfront create-invalidation \
    --distribution-id "${CF_DIST_ID}" \
    --paths '/*' \
    --query 'Invalidation.Id' \
    --output text
)"
echo "CloudFront invalidation started: ${INVALIDATION_ID}"
echo "Deploy complete: s3://${S3_BUCKET} + CloudFront ${CF_DIST_ID}"
