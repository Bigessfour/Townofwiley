# GitHub Actions production deploy (S3 + CloudFront)

Production frontend hosting for [townofwiley.gov](https://townofwiley.gov) is **S3** (`townofwiley-static-site`) + **CloudFront** (`E1NZ3XCY5CYR1J`). After Site CI passes on a push to **`main`** with deployable app changes, GitHub Actions syncs the CI-built artifact and invalidates CloudFront.

Amplify Hosting is **not** the deploy authority (app `d331voxr1fhoir` was deleted June 2026).

## Architecture

```text
push main (app_changed) → Site CI (lint, build, e2e smoke)
                       → deploy-production job (OIDC → S3 sync → CF invalidation)
                       → post-deploy curl + CSP probe
```

Manual break-glass: **Actions → Deploy production (manual)** or local `npm run deploy:site`.

## Before locking down `main`

Apply branch protection **after** the `ci-gate` job has run on at least one PR so the required check name exists:

```text
site-ci / CI gate (merge required)
```

Runbook: [`docs/github-branch-protection.md`](./github-branch-protection.md)

The GitHub **`production`** environment is used for deployment tracking only — **no required reviewers** (auto-deploy after merge; PR + CI is the gate). Restrict deployment branches to **`main`**.

## One-time AWS setup (IAM admin)

GitHub Actions uses **OIDC** — no long-lived `AWS_ACCESS_KEY_ID` secrets for deploy.

### Files

| File | Purpose |
|------|---------|
| [`infrastructure/iam/github-actions-static-site-deploy-trust.json`](../infrastructure/iam/github-actions-static-site-deploy-trust.json) | Trust: repo `Bigessfour/Townofwiley`, branch `main` |
| [`infrastructure/iam/github-actions-static-site-deploy-policy.json`](../infrastructure/iam/github-actions-static-site-deploy-policy.json) | Least privilege: S3 bucket + CloudFront invalidation |
| [`scripts/setup-github-actions-deploy-role.sh`](../scripts/setup-github-actions-deploy-role.sh) | Creates OIDC provider (if missing) + role |

### Apply

```bash
source scripts/agent-aws-env.sh
bash scripts/setup-github-actions-deploy-role.sh
```

Role ARN (used in workflows):

```text
arn:aws:iam::570912405222:role/GitHubActions-TownOfWiley-StaticSiteDeploy
```

### Verify OIDC provider

```bash
aws iam list-open-id-connect-providers
aws iam get-role --role-name GitHubActions-TownOfWiley-StaticSiteDeploy
```

## GitHub configuration

### Required repository secrets (CI build)

Deploy consumes the **artifact from `frontend-lint-build`**, which runs `npm run build` with strict runtime config. These secrets must exist (see [`infrastructure/amplify-branch-env.manifest.json`](../infrastructure/amplify-branch-env.manifest.json) `requiredForProduction`):

- `APPSYNC_CMS_ENDPOINT`, `APPSYNC_CMS_API_KEY`, `APPSYNC_CMS_REGION`
- `NWS_PROXY_ENDPOINT`
- `SEVERE_WEATHER_SIGNUP_API_ENDPOINT`, `SEVERE_WEATHER_SIGNUP_ENABLED`
- `EASYPEASY_API_ENDPOINT`, `EASYPEASY_CHAT_URL`
- `CONTACT_UPDATE_REVIEW_API_URL`
- `GUESTBOOK_API_ENDPOINT`

No new secrets are required for S3/CloudFront when using OIDC.

### Workflows

| Workflow | Trigger | Deploy |
|----------|---------|--------|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | PR / push `main` | Calls reusable Site CI |
| [`.github/workflows/git-workflow.yml`](../.github/workflows/git-workflow.yml) | `workflow_call` | `deploy-production` after CI green |
| [`.github/workflows/deploy-production.yml`](../.github/workflows/deploy-production.yml) | `workflow_dispatch` | Manual build + deploy from `main` |

### When auto-deploy runs

All of the following must be true:

1. Event is **`push`** to **`refs/heads/main`**
2. `detect-changes` reports **`app_changed=true`**
3. `frontend-lint-build` succeeded
4. `frontend-smoke` succeeded or was skipped

Docs-only merges skip deploy.

## Deploy script (humans + CI)

[`scripts/deploy-static-site.sh`](../scripts/deploy-static-site.sh) reads bucket and distribution ID from [`infrastructure/aws-infrastructure.manifest.json`](../infrastructure/aws-infrastructure.manifest.json).

```bash
source scripts/agent-aws-env.sh
npm run deploy:site          # build + tiered s3 sync + invalidation
npm run deploy:site:dry      # dry-run sync only
```

CI passes `--skip-build` because the artifact is already at `dist/townofwiley-app/browser`.

**Critical:** Sync to the S3 **bucket root** — not a `browser/` prefix. CloudFront has no OriginPath.

## Rollback

1. **Revert + merge** — push a revert commit to `main`; auto-deploy runs if `app_changed`.
2. **Manual redeploy** — Actions → **Deploy production (manual)** on `main` (rebuilds from current `main` tip).
3. **Local break-glass** — checkout known-good commit, `npm run deploy:site` with `townofwiley` profile.

## Troubleshooting

### `deploy-production` skipped

- Docs-only change → expected.
- PR build → deploy only runs on **push to main**, not PRs.

### OIDC `Not authorized to perform sts:AssumeRoleWithWebIdentity`

- Confirm IAM role exists and trust policy matches repo + `refs/heads/main`.
- Confirm workflow job has `permissions: id-token: write`.
- Manual deploy workflow must run from **`main`** branch.

### `expected AWS account 570912405222`

- Wrong AWS profile or credentials in local deploy.

### Missing `runtime-config.js` in artifact

- `frontend-lint-build` failed strict prebuild — fix missing GitHub secrets.

### Post-deploy curl fails

- CloudFront invalidation may still be in progress (usually seconds). Re-run job or wait and curl manually:
  ```bash
  curl -sfI https://townofwiley.gov/
  curl -sf https://townofwiley.gov/runtime-config.js | head
  ```

### CSP probe fails

```bash
npm run verify:live-csp-probe
npm run verify:live-csp-vs-repo
```

See [`docs/third-party-csp-registry.md`](./third-party-csp-registry.md).

## Related docs

- [`README.md`](../README.md) — hosting overview
- [`docs/git-workflow.md`](./git-workflow.md) — CD model
- [`docs/AWS_INFRASTRUCTURE_SOT.md`](./AWS_INFRASTRUCTURE_SOT.md) — resource IDs
- [`.github/instructions/aws-hosting.instructions.md`](../.github/instructions/aws-hosting.instructions.md)
