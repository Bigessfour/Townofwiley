# Git Workflow

## Purpose

This repository serves two jobs at the same time:

- it is the source of truth for the live site (S3 + CloudFront; see [`docs/github-actions-production-deploy.md`](../../docs/github-actions-production-deploy.md))
- it is the long-term maintainer record for docs, runbooks, content models, and supporting tooling

Industry best practice is not to force those into separate repositories by default. The usual professional approach is:

1. keep one repository when the same team owns the site and the related operational knowledge
2. make production deployment depend on a small, explicit set of deployable paths
3. keep maintainer-only files versioned for visibility, but out of the deploy gate unless they affect the build
4. ignore local reports, temporary logs, and machine-specific artifacts completely

That is the workflow this repository now follows.

## File Classes

### Deployable Site Files

These files can affect what the public site serves or how it is deployed:

- `src/**`
- `public/**`
- `package.json`
- `package-lock.json`
- `angular.json`
- `tsconfig*.json`
- `amplify.yml`
- `scripts/generate-runtime-config.mjs`

When these change, treat the work as production-impacting.

### Release Validation Files

These do not ship to the browser, but they should move with deployable changes when behavior changes:

- `e2e/**`
- unit tests adjacent to app code such as `src/**/*.spec.ts`

Professional teams keep these in the same pull request as the app behavior they validate.

### Maintainer Visibility Files

These belong in the remote repository for future operators and maintainers, even though Amplify does not need them to build the site:

- `docs/**`
- `README.md`
- `CLERK-CMS-GUIDE.md`
- `bot-training/**`
- `infrastructure/**`
- deployment helpers under `scripts/` that are not part of the frontend build

These should remain tracked because repository history is part of the operational record.

### Local-Only Artifacts

These should not be committed:

- Playwright reports and test output
- ad hoc smoke JSON reports
- temporary log files
- machine-local secrets and caches

Those are ignored in `.gitignore`.

## Branch Strategy

### Main

- `main` is the production branch
- Amplify deploys from `main` (historical — frontend hosting is now S3 + CloudFront via GitHub Actions)
- every commit merged to `main` should be safe to build and publish

### Feature Branches

Create short-lived branches from `main`:

- `feature/homepage-polish`
- `feature/document-hub`
- `docs/records-publishing-guide`
- `ops/weather-alert-backend`

Best practice is to avoid doing active work directly on `main`.

## Pull Request Rules

### For Deployable Changes

If a PR changes deployable site files:

1. include any related tests in the same PR
2. run lint and build before merge
3. keep unrelated docs or operational churn out of the same PR unless it is directly needed to understand the change

### For Maintainer-Only Changes

If a PR only changes docs, runbooks, or training material:

1. merge without forcing a frontend deployment decision
2. keep the PR scoped to documentation or operational knowledge only

## Staging Discipline

Professional teams separate changes at commit time, not after the fact.

Useful commands:

```bash
git switch -c feature/some-change
git add -p
git add src public e2e
git add docs README.md
git status
```

Recommended commit split:

1. deployable app change
2. test update
3. maintainer docs or runbook update

If the docs explain the exact same deploy, keeping the app change and docs in one PR is fine. If the docs are broader operational notes, keep them separate.

## CI Policy

The GitHub Actions entrypoint [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) calls [`.github/workflows/site-ci.yml`](../.github/workflows/site-ci.yml) (job id `site-ci`) so the required check stays **`site-ci / CI gate (merge required)`**.

It is intentionally basic (not a full regression suite). Playwright smoke stays local: `npm run test:e2e:smoke`.

### Site CI steps

Every PR and every push to `main` runs:

1. `npm ci --prefer-offline --no-audit`
2. CSP SSOT check (`node scripts/verify-custom-http-yaml.mjs`)
3. `npm run lint`
4. `npm run test:unit:browser`
5. `npm run test:vitest`
6. `npm run build:ci`
7. `npm audit --audit-level=critical`

Required merge check: **`site-ci / CI gate (merge required)`**.

On green push to `main`, **`deploy-production`** deploys the built artifact to S3 + CloudFront.

### Local / optional checks

Run these locally when needed (not on every PR):

- `npm run test:e2e:smoke` — Playwright critical smoke
- `npm run test:infra` — NWS / CMS media upload
- `npm run test:infra:alerts` — severe-weather signup (Python **3.13**)
- `npm run test:infra:contact` — contact Lambdas and deploy scripts
- `node scripts/verify-aws-infrastructure.mjs --offline` — SSOT manifest checks

### Caching

GitHub Actions caches npm (via `setup-node`) and Angular CLI (`.github/actions/cache-angular-cli`). Playwright browsers are installed only for local smoke, not in Site CI.

## CD Model

This repository uses GitHub Actions for CI **and** production frontend deployment.

- Pull requests are validated in Site CI (lint, unit tests, production build, critical audit).
- Green pushes to **`main`** trigger **`deploy-production`**: OIDC → S3 sync → CloudFront invalidation.
- Manual break-glass: `npm run deploy:site` locally or **Actions → Deploy production (manual)** on `main`.

Runbook: [`docs/github-actions-production-deploy.md`](./github-actions-production-deploy.md).

Command reference: [`docs/pipeline-workflow.md`](./pipeline-workflow.md).

## Governance

Production changes flow through **pull requests** to **`main`** — do not push directly to `main`.

| Control           | Implementation                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------- |
| Merge gate        | GitHub ruleset on `main`: require PR + **`site-ci / CI gate (merge required)`**              |
| CI validation     | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)                                    |
| Merge check logic | [`scripts/ci-gate-check.mjs`](../scripts/ci-gate-check.mjs) — `build-and-test` must succeed |
| Code ownership    | [`.github/CODEOWNERS`](../.github/CODEOWNERS)                                                |
| Production deploy | Auto **`deploy-production`** on green push to `main`                                         |
| Solo maintainer   | Required approvals **0** until a backup GitHub collaborator exists                           |

Setup runbook: [`docs/github-branch-protection.md`](./github-branch-protection.md)

Helper: `bash scripts/setup-github-governance.sh`
