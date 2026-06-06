#!/usr/bin/env bash
# Apply Town of Wiley GitHub governance settings that can be automated via gh CLI.
# Branch rulesets must still be configured in the GitHub UI — see docs/github-branch-protection.md
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-Bigessfour/Townofwiley}"

echo "==> Town of Wiley GitHub governance setup"
echo "    Repository: ${REPO}"
echo ""

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI is required (https://cli.github.com/)" >&2
  exit 1
fi

echo "==> Enabling auto-merge and delete-branch-on-merge"
gh repo edit "${REPO}" --enable-auto-merge --delete-branch-on-merge

echo ""
echo "==> Current repository merge settings"
gh repo view "${REPO}" --json mergeCommitAllowed,squashMergeAllowed,deleteBranchOnMerge \
  --jq '{mergeCommitAllowed, squashMergeAllowed, deleteBranchOnMerge}'

echo ""
echo "==> Manual steps (GitHub UI — cannot fully automate via gh without org ruleset API)"
cat <<'EOF'

1. Settings → Rules → Rulesets → New ruleset for branch `main`:
   - Require pull request before merging
   - Required status check: site-ci / CI gate (merge required)
   - Required approvals: 0 (until backup collaborator added)
   - Block force pushes; restrict deletions

2. Settings → Environments → production:
   - No required reviewers (auto-deploy model)
   - Deployment branches: main only

Full runbook: docs/github-branch-protection.md

EOF

echo "==> Done (automated repo flags applied; complete ruleset in GitHub UI)"
