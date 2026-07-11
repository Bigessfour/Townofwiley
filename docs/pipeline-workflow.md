# Pipeline workflow (CI/CD command reference)

Canonical commands for the Town of Wiley **GitHub Flow + path-aware CI + continuous deployment** pipeline. Production frontend: **S3** (`townofwiley-static-site`) + **CloudFront** (`E1NZ3XCY5CYR1J`).

Agents and maintainers: run these in order unless the task is docs-only.

## Architecture

```text
feature branch → PR → site-ci / CI gate (merge required) → merge main
                    → deploy-production (when app_changed) → townofwiley.gov
```

| Stage | Authority | Doc |
|-------|-----------|-----|
| Merge gate | GitHub ruleset + `scripts/ci-gate-check.mjs` | [`github-branch-protection.md`](./github-branch-protection.md) |
| CI | `.github/workflows/git-workflow.yml` | [`git-workflow.md`](./git-workflow.md) |
| Runtime secrets | GitHub repository secrets + local locker | [`secrets/README.md`](../secrets/README.md) |
| Production deploy | OIDC → `scripts/deploy-static-site.sh` via Actions | [`github-actions-production-deploy.md`](./github-actions-production-deploy.md) · [`DEPLOYMENT_SSOT.md`](./DEPLOYMENT_SSOT.md) |
| IaC scaffold | Terraform (`infrastructure/terraform/`) | [terraform README](../infrastructure/terraform/README.md) |
| Ansible | **Deprecated** — not a deploy path | [`ansible-DEPRECATED.md`](./ansible-DEPRECATED.md) |

## Shell setup (every session)

**macOS / Linux (agents and maintainers):**

```bash
cd /path/to/Townofwiley   # repo root
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"   # Intel: /usr/local/opt/node@24/bin
source scripts/agent-aws-env.sh
node -v    # expect v24.x (see .nvmrc)
aws sts get-caller-identity   # expect account 570912405222
```

**Windows (Cursor / VS Code):**

```powershell
.\scripts\setup-repo-node.ps1
$env:AWS_PROFILE = "townofwiley"
aws sts get-caller-identity
```

## One-time setup

```bash
npm ci
npm run secrets:init:local-passphrase   # if locker not initialized
bash scripts/setup-github-actions-deploy-role.sh   # IAM admin; OIDC deploy role
bash scripts/setup-github-governance.sh  # auto-merge, branch rules checklist
# Ansible is deprecated — do not install for production deploy
```

## Runtime secrets (required for strict build + CI)

Strict `npm run build` and Site CI need every key in [`infrastructure/amplify-branch-env.manifest.json`](../infrastructure/amplify-branch-env.manifest.json) → `requiredForProduction`.

**Refresh from live site + AWS SSOT** (after Lambda deploys, AppSync key rotation, or new endpoints):

```bash
source scripts/agent-aws-env.sh
npm run pipeline:secrets                     # sync + lock + strict checks
npm run secrets:sync-runtime -- --github     # mirror → GitHub Actions secrets (CI)
npm run generate:runtime-config:strict       # must pass (also run by pipeline:secrets)
npm run test:runtime-config-strict
```

**Dry-run / inspect without writing:**

```bash
npm run secrets:sync-runtime -- --dry-run
npm run secrets:sync-runtime -- --print-env   # shell exports (do not log in tickets)
npm run secrets:status
```

**New machine:** `npm run secrets:unlock` (passphrase from `TOW_SECRETS_PASSPHRASE` or `secrets/local/.passphrase`), then `npm run secrets:sync-runtime`.

Local strict builds also read **`secrets/local/user-secrets.json`** (not only `process.env`). CI uses GitHub repository secrets injected in workflows.

## Before opening a PR (local validation)

Run the same checks Site CI runs for frontend changes:

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
source scripts/agent-aws-env.sh
npm ci --prefer-offline --no-audit
npm run lint
npm run test:vitest
npm run build
npm run test:e2e:install
npm run test:e2e:smoke
```

**Faster pre-push subset** (when smoke already green recently):

```bash
npm run pipeline:validate    # lint + vitest + offline infra verify
# or manually:
npm run lint && npm run test:vitest && npm run build
```

**Secrets refresh only:**

```bash
npm run pipeline:secrets     # sync-runtime + lock + strict runtime-config tests
```

**Formatting (before commit):**

```bash
trunk fmt --all
trunk check --fix
```

**Infrastructure / manifest edits:**

```bash
npm run verify:aws-infra -- --offline
```

## Pull request → merge

1. Branch from `main`: `git switch -c feature/short-description`
2. Open PR — required check: **`site-ci / CI gate (merge required)`**
3. Merge when green (solo maintainer: 0 approvals until backup collaborator exists)
4. Delete branch after merge (repo default)

```bash
gh pr checks <number>   # verify CI
gh run list --limit 5   # recent workflow runs
```

## After merge to `main` (continuous deployment)

Auto-deploy runs when **all** are true:

- Push to `refs/heads/main`
- `app_changed=true` (not docs-only)
- `frontend-lint-build` and smoke jobs succeeded

**Verify deploy:**

```bash
gh run list --workflow=git-workflow.yml --limit 3
curl -sfI https://townofwiley.gov/
curl -sf https://townofwiley.gov/runtime-config.js | head -5
npm run verify:live-csp-probe
```

**Manual break-glass:**

```bash
# GitHub UI: Actions → Deploy production (manual) on main
# Or locally:
source scripts/agent-aws-env.sh
npm run deploy:site              # build + S3 + CloudFront invalidation
npm run deploy:site:dry          # S3 dry-run only
```

## Ansible (deprecated)

Do **not** use Ansible for deploy. See [`ansible-DEPRECATED.md`](./ansible-DEPRECATED.md).  
Break-glass frontend: `npm run deploy:site` · Ship: merge to `main`.

## When things fail

| Symptom | Command / action |
|---------|------------------|
| Strict runtime config missing vars | `npm run secrets:sync-runtime -- --github` |
| `npm run build` fails on CMS snapshot | AppSync must be reachable; run `npm run secrets:sync-runtime`, then `npm run verify:runtime-config-cms`. CI uses GitHub secrets. |
| CI build failed on secrets | `gh secret list` — compare to `amplify-branch-env.manifest.json` |
| OIDC deploy failed | See [`github-actions-production-deploy.md`](./github-actions-production-deploy.md) troubleshooting |
| CSP / headers drift | `npm run verify:live-csp-probe` |
| Failed CI job logs | `gh run view <run-id> --log-failed` |

## Related

- [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) — agent quick reference
- [`AGENTS.md`](../AGENTS.md) — Grok/Cursor project rules
- [`docs/git-workflow.md`](./git-workflow.md) — file classes and CI policy detail
- [`docs/appsync-api-key-rotation-runbook.md`](./appsync-api-key-rotation-runbook.md) — CMS key rotation (+ re-sync secrets)
