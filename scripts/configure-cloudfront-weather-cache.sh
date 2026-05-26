#!/usr/bin/env bash
# Optional: add a CloudFront cache behavior for /weather* on the Amplify-managed distribution.
#
# Prefer the repo-native path first (no manual Console edits):
#   1. customHttp.yml pattern /weather* → Cache-Control: public, max-age=300
#   2. npm run amplify:sync-headers
#   3. Redeploy Amplify main (or empty commit) so CloudFront picks up headers
#   4. Redeploy NWS proxy Lambda for API Cache-Control (see infrastructure/nws-weather-proxy)
#
# This script is for operators who also want an explicit CloudFront behavior (TTL 60–300s).
# Amplify may reconcile manual distribution edits on some updates — treat customHttp.yml as SSOT.
#
# Prerequisites: AWS CLI, jq, AWS_PROFILE=townofwiley (account 570912405222), cloudfront:* on the distribution.
#
# Usage:
#   ./scripts/configure-cloudfront-weather-cache.sh
#   ./scripts/configure-cloudfront-weather-cache.sh --dry-run

set -euo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

EXPECTED_ACCOUNT="${TOW_AMPLIFY_ACCOUNT_ID:-570912405222}"
APP_ID="${AMPLIFY_APP_ID:-d331voxr1fhoir}"
REGION="${AWS_REGION:-us-east-2}"
# From: aws amplify list-domain-associations --app-id "$APP_ID" (www CNAME)
CF_DOMAIN_HINT="${TOWN_CF_DOMAIN:-d1tkcm7820z9y8.cloudfront.net}"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
if [[ -z $ACCOUNT || $ACCOUNT == "None" ]]; then
  echo "error: configure AWS credentials (e.g. export AWS_PROFILE=townofwiley)" >&2
  exit 1
fi

if [[ $ACCOUNT != "$EXPECTED_ACCOUNT" ]]; then
  echo "error: account $ACCOUNT (expected $EXPECTED_ACCOUNT)" >&2
  exit 1
fi

echo "Looking up CloudFront distribution for $CF_DOMAIN_HINT ..."
DIST_ID="$(aws cloudfront list-distributions --output json \
  | jq -r --arg d "$CF_DOMAIN_HINT" '
    .DistributionList.Items[]?
    | select(.DomainName == $d or ((.Aliases.Items // []) | index("townofwiley.gov")) != null)
    | .Id' | head -n1)"

if [[ -z $DIST_ID ]]; then
  echo "error: no distribution found (check IAM cloudfront:ListDistributions or set TOWN_CF_DISTRIBUTION_ID)." >&2
  echo "  Amplify domain association lists: www CNAME → $CF_DOMAIN_HINT" >&2
  echo "  Console: CloudFront → Distributions → Behaviors → Create behavior → Path /weather*" >&2
  exit 1
fi

echo "Distribution ID: $DIST_ID"

if [[ $DRY_RUN == 1 ]]; then
  echo "dry-run: would ensure a /weather* behavior with MinTTL=60, DefaultTTL=300, MaxTTL=300"
  exit 0
fi

CONFIG_JSON="$(mktemp)"
ETAG="$(aws cloudfront get-distribution-config --id "$DIST_ID" --output json >"$CONFIG_JSON" \
  && jq -r '.ETag' "$CONFIG_JSON")"

HAS_WEATHER="$(jq '[.DistributionConfig.CacheBehaviors.Items[]?.PathPattern] | any(. == "/weather*")' "$CONFIG_JSON")"
if [[ $HAS_WEATHER == "true" ]]; then
  echo "Behavior /weather* already exists on $DIST_ID — no change."
  rm -f "$CONFIG_JSON"
  exit 0
fi

DEFAULT_CACHE_POLICY="$(jq -r '.DistributionConfig.DefaultCacheBehavior.CachePolicyId' "$CONFIG_JSON")"
DEFAULT_ORIGIN="$(jq -r '.DistributionConfig.DefaultCacheBehavior.TargetOriginId' "$CONFIG_JSON")"

UPDATED="$(jq --arg origin "$DEFAULT_ORIGIN" --arg policy "$DEFAULT_CACHE_POLICY" '
  .DistributionConfig.CacheBehaviors.Quantity as $q
  | .DistributionConfig.CacheBehaviors.Items += [{
      PathPattern: "/weather*",
      TargetOriginId: $origin,
      ViewerProtocolPolicy: "redirect-to-https",
      AllowedMethods: {
        Quantity: 2,
        Items: ["GET", "HEAD"],
        CachedMethods: { Quantity: 2, Items: ["GET", "HEAD"] }
      },
      Compress: true,
      CachePolicyId: $policy,
      SmoothStreaming: false,
      LambdaFunctionAssociations: { Quantity: 0 },
      FunctionAssociations: { Quantity: 0 },
      FieldLevelEncryptionId: "",
      TrustedSigners: { Enabled: false, Quantity: 0 },
      TrustedKeyGroups: { Enabled: false, Quantity: 0 }
    }]
  | .DistributionConfig.CacheBehaviors.Quantity = (.DistributionConfig.CacheBehaviors.Items | length)
' "$CONFIG_JSON")"

DIST_ONLY="$(jq '.DistributionConfig' <<<"$UPDATED")"
aws cloudfront update-distribution \
  --id "$DIST_ID" \
  --if-match "$ETAG" \
  --distribution-config "$DIST_ONLY" \
  --output text \
  --query 'Distribution.{Id:Id,Status:Status,DomainName:DomainName}'

rm -f "$CONFIG_JSON"
echo "Submitted /weather* behavior. Wait until Status is Deployed, then hard-refresh https://www.townofwiley.gov/weather"
