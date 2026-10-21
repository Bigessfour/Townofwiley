#!/usr/bin/env bash
#
# scripts/agent-aws-env.sh
#
# Town of Wiley — AWS environment setup for AI agents (Grok, Cursor, etc.).
# Defaults to official Town account (818…) / profile tow for site hosting.
# For Gen1 backend work: AWS_PROFILE_NAME=steve source scripts/agent-aws-env.sh
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
readonly LEGACY_ACCOUNT="$(node -e "const j=require(process.argv[1]);process.stdout.write(j.legacyPersonalAccount?.accountId||'570912405222')" "${ACCOUNT_JSON}" 2>/dev/null || echo "570912405222")"

PROFILE="${AWS_PROFILE_NAME:-$DEFAULT_PROFILE}"
REGION="${AWS_DEFAULT_REGION:-$DEFAULT_REGION}"

# When targeting Gen1 backend, allow steve / townofwiley → 570…
EXPECTED_FOR_PROFILE="$EXPECTED_ACCOUNT"
if [[ "$PROFILE" == "steve" || "$PROFILE" == "townofwiley" ]]; then
  EXPECTED_FOR_PROFILE="$LEGACY_ACCOUNT"
fi

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
  for fallback in tow steve townofwiley default; do
    expect="$EXPECTED_ACCOUNT"
    if [[ "$fallback" == "steve" || "$fallback" == "townofwiley" ]]; then
      expect="$LEGACY_ACCOUNT"
    fi
    if RESOLVED="$(resolve_profile "$fallback" "$expect" 2>/dev/null)"; then
      echo "[agent-aws-env] Profile '${AWS_PROFILE_NAME:-$DEFAULT_PROFILE}' unavailable; using '$fallback' (account ${expect})."
      PROFILE="$RESOLVED"
      EXPECTED_FOR_PROFILE="$expect"
      break
    fi
  done
else
  PROFILE="$RESOLVED"
fi

export AWS_PROFILE="$PROFILE"
export AWS_DEFAULT_REGION="$REGION"

echo "[agent-aws-env] AWS environment configured for agent use:"
echo "  AWS_PROFILE=$AWS_PROFILE"
echo "  AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION"
echo "  Expected account for this profile: $EXPECTED_FOR_PROFILE"
echo "  Official Town (hosting): $EXPECTED_ACCOUNT (profile tow)"
echo "  Legacy Gen1 backend:     $LEGACY_ACCOUNT (profile steve)"
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
    echo "               Hosting: aws sso login --profile tow"
    echo "               Gen1:    aws sso login --profile steve  (or npm run aws:configure-profile for legacy)"
  fi
else
  echo "[agent-aws-env] aws CLI not found in PATH"
fi

echo ""
echo "[agent-aws-env] Example: aws sts get-caller-identity"
echo ""
