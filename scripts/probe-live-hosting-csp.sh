#!/usr/bin/env bash
# Curl production (or E2E_BASE_URL) and verify CSP contains required tokens so
# hosting drift (narrower Console policy, failed sync, stale edge) is detected in CI.
#
# Usage:
#   bash scripts/probe-live-hosting-csp.sh
#   E2E_BASE_URL=https://preview.example.amplifyapp.com bash scripts/probe-live-hosting-csp.sh
#
# References:
#   https://docs.aws.amazon.com/amplify/latest/userguide/custom-headers.html
#   https://developers.google.com/tag-platform/security/guides/csp

set -euo pipefail

BASE="${E2E_BASE_URL:-${PRIMARY_URL-}}"
if [[ -z ${BASE} ]]; then
  BASE="${PRIMARY_URL:-https://www.townofwiley.gov/}"
fi

fetch_headers() {
  local url="$1"
  curl -sSI --max-time 25 -A 'TownOfWiley-Header-Probe/1.0' "${url}" 2>/dev/null || true
}

HDRS="$(fetch_headers "${BASE}")"
if [[ -z ${HDRS} ]]; then
  if [[ -n ${FALLBACK_URL-} && ${BASE} != "${FALLBACK_URL}" ]]; then
    HDRS="$(fetch_headers "${FALLBACK_URL}")"
    BASE="${FALLBACK_URL}"
  fi
fi

if [[ -z ${HDRS} ]]; then
  echo "error: no response from ${BASE} (set E2E_BASE_URL to override)" >&2
  exit 1
fi

CSP="$(printf '%s' "${HDRS}" | tr -d '\r' | awk -F': ' 'BEGIN{IGNORECASE=1} /^content-security-policy:/{sub(/^[^:]+: /,""); print; exit}')"
if [[ -z ${CSP} ]]; then
  echo "error: missing Content-Security-Policy header on ${BASE}" >&2
  printf '%s\n' "${HDRS}" | head -20 >&2
  exit 1
fi

checks=(
  "default-src 'self'"
  'font-src'
  'data:'
  'googletagmanager'
  "frame-src 'none'"
  "object-src 'none'"
)

for token in "${checks[@]}"; do
  if [[ ${CSP} != *"${token}"* ]]; then
    echo "error: CSP on ${BASE} missing expected token: ${token}" >&2
    echo "CSP (truncated): ${CSP:0:400}..." >&2
    exit 1
  fi
done

echo "OK: ${BASE} returned Content-Security-Policy with baseline tokens."
