#!/usr/bin/env bash
# Verify the Town of Wiley NWS weather proxy Lambda against AWS and NWS expectations.
# References:
#   - Lambda function URLs (CORS / invocation): https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html#urls-cors
#   - NWS API (User-Agent, formats, points→forecast flow): https://www.weather.gov/documentation/services-web-api
#
# IAM user "copilot" keys are usually stored under the CLI profile configured for this repo (default: steve).
# Use whichever ~/.aws profile resolves to account 570912405222.
#
# Usage (Town of Wiley production account 570912405222, region us-east-2):
#   export AWS_PROFILE=steve   # must be keys for account 570912405222 (e.g. copilot user)
#   export NWS_WEATHER_LAMBDA_FUNCTION_NAME='your-nws-proxy-function-name'
#   ./scripts/verify-nws-weather-proxy-aws.sh
#
# Discover candidate function names (requires lambda:ListFunctions on the profile):
#   aws lambda list-functions --region us-east-2 --output text \
#     --query "Functions[?contains(FunctionName, 'TownOfWiley')].FunctionName"
#
# Optional: NWS_PROXY_AWS_REGION (default: us-east-2 or AWS_DEFAULT_REGION)
# Optional: TOWN_OF_WILEY_AWS_ACCOUNT_ID (default: 570912405222) — script warns if caller account differs.
# Optional: NWS_VERIFY_SKIP_CURL=1 — skip live HTTP checks to the function URL

set -euo pipefail

REGION="${NWS_PROXY_AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-2}}"
EXPECTED_ACCOUNT="${TOWN_OF_WILEY_AWS_ACCOUNT_ID:-570912405222}"
FN="${NWS_WEATHER_LAMBDA_FUNCTION_NAME:-}"

echo "== NWS weather proxy AWS verification (region: ${REGION}) =="

CALLER_ACCOUNT="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
if [[ -z "${CALLER_ACCOUNT}" || "${CALLER_ACCOUNT}" == "None" ]]; then
  echo "Error: aws sts get-caller-identity failed. Configure AWS CLI credentials." >&2
  exit 1
fi
echo "Caller AWS account: ${CALLER_ACCOUNT}"
if [[ "${CALLER_ACCOUNT}" != "${EXPECTED_ACCOUNT}" ]]; then
  echo "Warning: Expected account ${EXPECTED_ACCOUNT} (Town of Wiley). Use the correct AWS_PROFILE if this is wrong." >&2
fi

if [[ -z "${FN}" ]]; then
  echo "Error: Set NWS_WEATHER_LAMBDA_FUNCTION_NAME to the Lambda that runs infrastructure/nws-weather-proxy/index.mjs." >&2
  echo "  Example: export NWS_WEATHER_LAMBDA_FUNCTION_NAME='TownOfWileyNwsWeather'" >&2
  exit 2
fi

echo "Lambda: ${FN}"
STATE="$(aws lambda get-function-configuration --function-name "${FN}" --region "${REGION}" --query State --output text)"
LAST_STATUS="$(aws lambda get-function-configuration --function-name "${FN}" --region "${REGION}" --query LastUpdateStatus --output text)"
echo "  State: ${STATE}  LastUpdateStatus: ${LAST_STATUS}"

UA="$(aws lambda get-function-configuration --function-name "${FN}" --region "${REGION}" --query 'Environment.Variables.NWS_USER_AGENT' --output text)"
if [[ -z "${UA}" || "${UA}" == "None" ]]; then
  echo "Error: NWS_USER_AGENT is missing or empty on the function. NWS requires a User-Agent; the handler returns 500 without it." >&2
  exit 3
fi
echo "  NWS_USER_AGENT is set (length ${#UA} chars)."

API_KEY_SET="$(aws lambda get-function-configuration --function-name "${FN}" --region "${REGION}" --query 'Environment.Variables.NWS_API_KEY' --output text)"
if [[ -n "${API_KEY_SET}" && "${API_KEY_SET}" != "None" ]]; then
  echo "  NWS_API_KEY is set (optional; NWS documents this as a future direction)."
else
  echo "  NWS_API_KEY is unset (OK — NWS currently requires User-Agent; api-key is optional)."
fi

TIMEOUT="$(aws lambda get-function-configuration --function-name "${FN}" --region "${REGION}" --query Timeout --output text)"
MEMORY="$(aws lambda get-function-configuration --function-name "${FN}" --region "${REGION}" --query MemorySize --output text)"
echo "  Lambda Timeout: ${TIMEOUT}s  Memory: ${MEMORY}MB (raise timeout if cold + NWS chain is slow during incidents)."

echo ""
echo "Function URL config(s) (AWS-managed CORS must not fight handler CORS — see index.mjs header comment):"
aws lambda list-function-url-configs --function-name "${FN}" --region "${REGION}" --output table || true

FURL_JSON="$(aws lambda list-function-url-configs --function-name "${FN}" --region "${REGION}" --output json 2>/dev/null || true)"
if command -v jq >/dev/null 2>&1 && [[ -n "${FURL_JSON}" ]]; then
  echo ""
  echo "Function URL detail (first config):"
  echo "${FURL_JSON}" | jq '.FunctionUrlConfigs[0] | {FunctionUrl, AuthType, Cors}' 2>/dev/null || true
  ORIGINS="$(echo "${FURL_JSON}" | jq -r '.FunctionUrlConfigs[0].Cors.AllowOrigins[]? // empty' 2>/dev/null || true)"
  if echo "${ORIGINS}" | grep -q '\*'; then
    echo ""
    echo "WARNING: Function URL CORS AllowOrigins includes '*'. Combined with the handler's own" >&2
    echo "  Access-Control-Allow-Origin, browsers can see multiple ACAO values and block the site." >&2
    echo "  Fix per AWS Lambda function URL CORS docs: clear URL-level CORS allow-origins or rely on the handler only." >&2
    echo "  Ref: https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html#urls-cors" >&2
  fi
  FUN_URL="$(echo "${FURL_JSON}" | jq -r '.FunctionUrlConfigs[0].FunctionUrl // empty' 2>/dev/null)"
  if [[ -n "${FUN_URL}" && "${NWS_VERIFY_SKIP_CURL:-}" != "1" ]] && command -v curl >/dev/null 2>&1; then
    echo ""
    echo "Live HTTP check (GET with Origin: https://www.townofwiley.gov) — expect 200 and JSON with provider nws:"
    HDR_FILE="$(mktemp)"
    HTTP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' -D "${HDR_FILE}" \
      -H 'Origin: https://www.townofwiley.gov' \
      "${FUN_URL}" || true)"
    echo "  HTTP status: ${HTTP_CODE}"
    ACAO_COUNT="0"
    if [[ -f "${HDR_FILE}" ]]; then
      ACAO_COUNT="$(grep -ci '^access-control-allow-origin:' "${HDR_FILE}" 2>/dev/null || echo 0)"
    fi
    echo "  access-control-allow-origin header lines: ${ACAO_COUNT}"
    if [[ "${ACAO_COUNT}" =~ ^[0-9]+$ ]] && [[ "${ACAO_COUNT}" -gt 1 ]]; then
      echo "  WARNING: Multiple Access-Control-Allow-Origin lines — browsers may reject (see live-audit artifacts)." >&2
    fi
    rm -f "${HDR_FILE}"
  elif [[ -n "${FUN_URL}" && "${NWS_VERIFY_SKIP_CURL:-}" != "1" ]]; then
    echo "(Install curl for an automatic GET check of ${FUN_URL})"
  fi
fi

echo ""
echo "NWS API alignment (handler in infrastructure/nws-weather-proxy/index.mjs):"
echo "  - User-Agent: required by NWS; Lambda env NWS_USER_AGENT is sent on every upstream fetch (verified above)."
echo "  - Accept: application/geo+json on upstream requests (NWS formats / content negotiation)."
echo "  - Flow: GET /points/{lat},{lon} then properties.forecast + alerts/active?zone=… (NWS documentation examples)."
echo "  - Re-check /points periodically in production: NWS notes grid office/X/Y can change; this Lambda resolves points each invocation (good)."
echo ""
echo "Manual checks (see comment at top of infrastructure/nws-weather-proxy/index.mjs):"
echo "  - Lambda Function URL CORS in the console must NOT duplicate Access-Control-Allow-Origin"
echo "    with the headers this handler already returns, or browsers will reject responses."
echo "  - Amplify NWS_PROXY_ENDPOINT must match this function URL (see README weather section)."
echo "  - Site CSP connect-src already allows https://*.lambda-url.us-east-2.on.aws (amplify.yml)."
echo "Done."
