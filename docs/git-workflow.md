# Git Workflow

## Purpose

This repository serves two jobs at the same time:

- it is the source of truth for the live Amplify site
- it is the long-term maintainer record for docs, runbooks, content models, and supporting tooling

Industry best practice is not to force those into separate repositories by default. The usual professional approach is:

1. keep one repository when the same team owns the site and the related operational knowledge
2. make production deployment depend on a small, explicit set of deployable paths
3. keep maintainer-only files versioned for visibility, but out of the deploy gate unless they affect the build
4. ignore local reports, temporary logs, and machine-specific artifacts completely

That is the workflow this repository now follows.

## File Classes

### Deployable Site Files

These files can affect what Amplify builds or what the public site serves:

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
- Amplify deploys from `main`
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

The GitHub Actions workflow at `.github/workflows/git-workflow.yml` is the repository CI gate.

It uses path-aware classification so the checks match the actual website surface instead of treating every repo file as production-critical.

### Frontend validation paths

These trigger the frontend CI pipeline:

- `src/**`
- `public/**`
- `e2e/**`
- `package.json`
- `package-lock.json`
- `angular.json`
- `playwright.config.ts`
- `tsconfig*.json`
- `eslint.config.js`
- `amplify.yml`
- `scripts/generate-runtime-config.mjs`

### Frontend CI steps

For frontend-impacting changes, GitHub Actions runs:

1. `npm ci --prefer-offline --no-audit`
2. `npm run lint`
3. `npm run build`
4. `npx playwright install --with-deps chromium`
5. `npm run test:e2e:smoke`

That is the recommended minimum deterministic gate for this site because it validates:

- Angular compilation
- linting and config drift
- generated runtime-config compatibility
- core resident-facing smoke flows on desktop and mobile emulation

### Optional site-runtime checks

The workflow also runs targeted checks when website-facing backend code changes:

- `npm run test:infra` for `infrastructure/nws-weather-proxy/**` and `infrastructure/paystar-proxy/**`
- `npm run test:infra:alerts` for `infrastructure/severe-weather-signup/**`

### Amplify alignment

The CI workflow intentionally mirrors the key AWS Amplify build recommendations:

- use an explicit build spec in `amplify.yml`
- pin the Node major version explicitly
- prefer lockfile-based installs with `npm ci`
- cache dependencies deliberately instead of depending on mutable machine state

For this repository, that translates to:

- Amplify keeps `node_modules/**/*` caching in `amplify.yml`
- GitHub Actions uses `actions/setup-node` npm cache instead of caching `node_modules` directly
- GitHub Actions also restores Playwright browser binaries and Angular CLI build cache to reduce repeated work in CI

That split is intentional. Amplify and GitHub Actions have different cache ergonomics.

### Caching guidance

Should caching be enabled in GitHub Actions?

Yes, but only targeted caches.

Recommended:

- npm package cache
- Playwright browser cache
- Angular CLI persistent cache

Not recommended as the primary strategy:

- caching `node_modules` directly in GitHub Actions

Why:

- `npm ci` stays deterministic with the lockfile
- npm cache is usually smaller and less fragile than a full `node_modules` cache
- direct `node_modules` caches are more likely to bloat or become flaky across runner updates

### About the prebundling message

This message:

`Prebundling has been configured but will not be used because caching has been disabled.`

comes from Angular's dev-server cache behavior during the Playwright smoke run. It is not an AWS Amplify warning.

To address that, this repo now enables Angular CLI persistent cache in all environments through `angular.json` and restores `.angular/cache` in GitHub Actions.

That should improve smoke-run startup behavior without changing the production Amplify build model.

### Maintainer-only changes

Docs, runbooks, training material, and non-website operational notes stay tracked in the repo, but they do not trigger the frontend regression gate by themselves.

That is the intended separation:

- version everything maintainers need
- gate only the paths that can regress the public website or its website-facing runtime services

## CD Model

This repository uses GitHub Actions for deterministic CI and AWS Amplify for deployment.

That is a normal professional setup.

- Pull requests are validated in GitHub Actions.
- Merges to `main` trigger Amplify builds from the same repository.
- Amplify remains the deployment authority for the public site.

This keeps deployment simple while still giving strong regression protection before code reaches production.

## When To Split Repositories

Do not split by default. Split only if one of these becomes true:

- different teams own app code and ops/docs with separate permissions
- deployment cadence is completely different
- the repository becomes too noisy to review effectively even with path-based discipline
- compliance requires stronger separation

Until then, one repository plus path-aware workflow is the standard professional setup.
