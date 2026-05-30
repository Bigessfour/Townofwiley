#!/usr/bin/env bash
#
# scripts/agent-aws-env.sh
#
# Town of Wiley — AWS environment setup for AI agents (Grok, Cursor, etc.)
#
# Purpose:
#   Makes AWS CLI available to the agent using the standard `townofwiley` profile.
#   This script is SAFE to source (no secrets are stored here).
#
# Usage (run in your terminal before or during agent sessions):
#   source scripts/agent-aws-env.sh
#
# Or make it automatic for agent work:
#   echo 'source /path/to/this/repo/scripts/agent-aws-env.sh' >> ~/.zshrc
#
# After sourcing, the agent can run commands like:
#   aws sts get-caller-identity --profile townofwiley
#   AWS_PROFILE=townofwiley aws ...
#
# Prerequisites:
#   1. Run once: npm run aws:configure-profile   (or bash scripts/configure-aws-cli-profile.sh)
#      This stores your keys in ~/.aws/ (never in git).
#   2. (Recommended) Prefer AWS SSO for better security:
#      aws configure sso --profile townofwiley
#      Then: aws sso login --profile townofwiley
#
# The agent should always use --profile townofwiley or have AWS_PROFILE exported.

set -euo pipefail

readonly DEFAULT_PROFILE="townofwiley"
readonly DEFAULT_REGION="us-east-2"
readonly EXPECTED_ACCOUNT="570912405222"

PROFILE="${AWS_PROFILE_NAME:-$DEFAULT_PROFILE}"
REGION="${AWS_DEFAULT_REGION:-$DEFAULT_REGION}"

# Fall back to steve/default when townofwiley is not configured but account matches.
resolve_profile() {
  local candidate="$1"
  local acct
  acct="$(AWS_PROFILE="$candidate" aws sts get-caller-identity --output text --query Account 2>/dev/null || true)"
  if [[ $acct == "$EXPECTED_ACCOUNT" ]]; then
    echo "$candidate"
    return 0
  fi
  return 1
}

if ! RESOLVED="$(resolve_profile "$PROFILE" 2>/dev/null)"; then
  for fallback in steve default; do
    if RESOLVED="$(resolve_profile "$fallback" 2>/dev/null)"; then
      echo "[agent-aws-env] Profile '${AWS_PROFILE_NAME:-townofwiley}' unavailable; using '$fallback' (account ${EXPECTED_ACCOUNT})."
      PROFILE="$RESOLVED"
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
echo "  Expected account: $EXPECTED_ACCOUNT"
echo ""

# Quick health check (non-fatal)
if command -v aws >/dev/null 2>&1; then
  if AWS_PROFILE="$PROFILE" aws sts get-caller-identity --output text --query Account >/dev/null 2>&1; then
    echo "[agent-aws-env] ✅ AWS CLI is working with profile '$PROFILE'"
  else
    echo "[agent-aws-env] ⚠️  Profile '$PROFILE' not fully configured or credentials expired."
    echo "               Run: npm run aws:configure-profile"
    echo "               Or for SSO: aws sso login --profile $PROFILE"
  fi
else
  echo "[agent-aws-env] ⚠️  aws CLI not found in PATH"
fi

echo ""
echo "[agent-aws-env] Agent can now use AWS commands with the townofwiley profile."
echo "               Example: aws sts get-caller-identity"
echo ""
