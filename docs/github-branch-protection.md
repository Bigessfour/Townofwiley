# GitHub branch protection and pipeline governance

Production frontend deploys from **`main`** via GitHub Actions (S3 + CloudFront). This runbook locks in **PR-only merges**, a single required CI check, and **auto-deploy after merge** (no production environment approval gate).

Related: [`git-workflow.md`](./git-workflow.md), [`github-actions-production-deploy.md`](./github-actions-production-deploy.md).

## Pipeline summary

```text
feature branch → PR → Site CI → ci-gate green → merge main → deploy-production → townofwiley.gov
```

**Required status check (exact name):**

```text
site-ci / CI gate (merge required)
```

Confirm this name on the **Checks** tab of any PR after the governance workflow has run once.

## Solo maintainer note

With one GitHub collaborator (`@Bigessfour`), **required PR approvals block self-merge** (authors cannot approve their own PR). Until a backup reviewer is invited:

- Require **pull request** + **`ci-gate`** status check
- Set **required approvals to 0**
- Leave **Require review from Code Owners** off

When a backup collaborator exists, set required approvals to **1** and optionally enable Code Owner review.

## One-time GitHub setup (repo admin)

Apply **after** the `ci-gate` workflow is merged and has run on at least one PR.

### 1. Repository settings

Enable merge helpers (or run [`scripts/setup-github-governance.sh`](../scripts/setup-github-governance.sh)):

```bash
gh repo edit Bigessfour/Townofwiley --enable-auto-merge
gh repo edit Bigessfour/Townofwiley --delete-branch-on-merge
```

- **Allow auto-merge:** Settings → General → Pull Requests → Allow auto-merge
- **Delete branch on merge:** recommended for short-lived feature branches

### 2. Ruleset for `main`

Settings → Rules → Rulesets → **New ruleset** (or edit existing).

| Setting | Value |
|---------|--------|
| Enforcement | Active |
| Target | Branch `main` |
| Require a pull request before merging | Yes |
| Required approvals | **0** (raise to **1** when backup reviewer added) |
| Require review from Code Owners | Off until second collaborator |
| Require status checks to pass | Yes |
| Required check | `site-ci / CI gate (merge required)` |
| Require branches to be up to date | Recommended |
| Block force pushes | Yes |
| Restrict deletions | Yes |
| Require conversation resolution | Optional (recommended) |

Do **not** include `deploy-production` as a required check — it only runs on push to `main`, not on PRs.

### 3. `production` GitHub Environment

Settings → Environments → **New environment** → `production`

| Setting | Value |
|---------|--------|
| Required reviewers | **None** (auto-deploy after merge; PR + CI is the gate) |
| Deployment branches | **Selected branches** → `main` only |

Workflow jobs [`deploy-production`](../.github/workflows/git-workflow.yml) and [manual deploy](../.github/workflows/deploy-production.yml) reference `environment: production` for deployment history only.

### 4. AWS OIDC (unchanged)

Deploy auth remains OIDC to `GitHubActions-TownOfWiley-StaticSiteDeploy`, trusted only for `refs/heads/main`:

[`infrastructure/iam/github-actions-static-site-deploy-trust.json`](../infrastructure/iam/github-actions-static-site-deploy-trust.json)

Branch protection complements IAM: even with credentials, only merged `main` content deploys through Actions.

## CODEOWNERS

[`.github/CODEOWNERS`](../.github/CODEOWNERS) auto-requests review on deployable paths. With a single owner, use it for visibility — not as a merge blocker until a backup collaborator exists.

## Dependabot

[`.github/dependabot.yml`](../.github/dependabot.yml) opens weekly dependency PRs. After `ci-gate` is required:

1. Wait for `site-ci / CI gate (merge required)` green
2. Merge (or enable auto-merge when a backup reviewer exists)

Dependabot-triggered workflows do **not** receive repository secrets. Site CI runs a **non-strict** production build for `dependabot[bot]` PRs (lint, unit tests, and compile still run). **Close** red Dependabot PRs that predate a CI or `main` fix rather than merging without a green gate; Dependabot will open fresh PRs on the next schedule.

Optional later: [Dependabot auto-merge](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/automating-dependabot-with-github-actions) for grouped patch updates.

## Verification checklist

After applying the ruleset:

1. **Docs-only PR** — frontend jobs skipped; `ci-gate` still green; merge allowed
2. **App PR** — lint/build/smoke run; merge blocked until `ci-gate` green
3. **Direct push to `main`** — blocked by ruleset
4. **Merge app change to `main`** — `deploy-production` runs when `app_changed=true`
5. **Rollback** — revert on `main`; auto-deploy if deployable paths changed ([deploy runbook](./github-actions-production-deploy.md#rollback))

## Application order

1. Merge governance PR (this workflow + docs)
2. Note exact check name from PR Checks tab
3. Apply ruleset (**0 approvals** initially)
4. Create `production` environment (no reviewers, `main` only)
5. Run verification checklist above
6. When backup GitHub user joins: approvals = 1 + optional Code Owner review

## Helper script

```bash
bash scripts/setup-github-governance.sh
```

Prints ruleset checklist and applies repo settings that can be automated via `gh`.
