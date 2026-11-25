#!/usr/bin/env bash
#
# scripts/agent-aws-env.sh
#
# Town of Wiley — AWS environment setup for AI agents (Grok, Cursor, etc.).
# Defaults to the Town account (818…) / profile tow.
#
# Usage:
#   source scripts/agent-aws-env.sh
#
# Safe to source (no secrets stored here).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ACCOUNT_JSON="${REPO_ROOT}/infrastructure/town-aws-account.json"

read_account_field() {
  local field="$1"
  local fallback="$2"
  if [[ -f "${ACCOUNT_JSON}" ]] && command -v node >/dev/null 2>&1; then
    node -e "const j=require(process.argv[1]);const v=j[process.argv[2]];process.stdout.write(v!=null?String(v):'')" "${ACCOUNT_JSON}" "${field}" 2>/dev/null || echo "${fallback}"
  else
    echo "${fallback}"
  fi
}

readonly DEFAULT_PROFILE="$(read_account_field defaultProfile tow)"
readonly DEFAULT_REGION="$(read_account_field primaryRegion us-east-2)"
readonly EXPECTED_ACCOUNT="$(read_account_field accountId 818904800844)"
PROFILE="${AWS_PROFILE_NAME:-$DEFAULT_PROFILE}"
REGION="${AWS_DEFAULT_REGION:-$DEFAULT_REGION}"
EXPECTED_FOR_PROFILE="$EXPECTED_ACCOUNT"

resolve_profile() {
  local candidate="$1"
  local expect="$2"
  local acct
  acct="$(AWS_PROFILE="$candidate" aws sts get-caller-identity --output text --query Account 2>/dev/null || true)"
  if [[ $acct == "$expect" ]]; then
    echo "$candidate"
    return 0
  fi
  return 1
}

if ! RESOLVED="$(resolve_profile "$PROFILE" "$EXPECTED_FOR_PROFILE" 2>/dev/null)"; then
  if RESOLVED="$(resolve_profile "tow" "$EXPECTED_ACCOUNT" 2>/dev/null)"; then
    echo "[agent-aws-env] Using profile 'tow' (account ${EXPECTED_ACCOUNT})."
    PROFILE="$RESOLVED"
  else
    echo "[agent-aws-env] WARNING: No working profile for Town account ${EXPECTED_ACCOUNT}."
    echo "               Run: aws sso login --profile tow"
  fi
else
  PROFILE="$RESOLVED"
fi

export AWS_PROFILE="$PROFILE"
export AWS_DEFAULT_REGION="$REGION"

echo "[agent-aws-env] AWS environment configured for agent use:"
echo "  AWS_PROFILE=$AWS_PROFILE"
echo "  AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION"
echo "  Expected account for this profile: $EXPECTED_FOR_PROFILE"
echo "  Town account: $EXPECTED_ACCOUNT (profile tow)"
echo ""

if command -v aws >/dev/null 2>&1; then
  if IDENTITY="$(AWS_PROFILE="$PROFILE" aws sts get-caller-identity --output json 2>/dev/null)"; then
    echo "[agent-aws-env] AWS CLI is working with profile '$PROFILE'"
    if command -v node >/dev/null 2>&1; then
      node -e "
        const id = JSON.parse(process.argv[1]);
        const acct = id.Account || '';
        const arn = id.Arn || '';
        const expect = process.argv[2];
        if (acct !== expect) console.log('[agent-aws-env] Account mismatch: got', acct, 'expected', expect);
        else console.log('[agent-aws-env]    Caller:', arn);
      " "${IDENTITY}" "${EXPECTED_FOR_PROFILE}" 2>/dev/null || true
    fi
  else
    echo "[agent-aws-env] Profile '$PROFILE' not fully configured or credentials expired."
    echo "               Run: aws sso login --profile tow"
  fi
else
  echo "[agent-aws-env] aws CLI not found in PATH"
fi

echo ""
echo "[agent-aws-env] Example: aws sts get-caller-identity"
echo ""
