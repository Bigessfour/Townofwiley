# Amplify Deployment Self-Healing Runbook

> **Frontend hosting (June 2026):** The public site is **S3 + CloudFront**, not Amplify Hosting. Production deploys run from GitHub Actions after Site CI on `main`. See **[`docs/github-actions-production-deploy.md`](./github-actions-production-deploy.md)** for OIDC setup, auto-deploy triggers, rollback, and manual **Deploy production (manual)** workflow. Local break-glass: `npm run deploy:site`.

This runbook is for maintainers who need to diagnose and fix AWS Amplify build failures
for the Town of Wiley site. It documents the repeatable path using GitHub Copilot coding
agent and GitHub Actions failure logs.

## How to Use GitHub Actions Logs to Diagnose Failures

When an Amplify deployment fails, the build job logs are the first place to look.

### Step 1 — Find the failing workflow run

1. Go to the repository on GitHub.
2. Click **Actions** in the top navigation.
3. Find the most recent failed workflow run (red ✗).
4. Click the run to open it and then click the failing job (for example **Deploy** or **Backend**).

### Step 2 — Read the CloudFormation error

Amplify backend failures almost always surface as a CloudFormation rollback. Scroll the
job log to the first `CREATE_FAILED` or `ROLLBACK_IN_PROGRESS` line. The error message
will name:

- the resource that failed (for example `S3Bucket`, `AuthRolePolicy`)
- the IAM action that was denied (for example `s3:PutBucketLogging`)
- the ARN that was the target (for example `arn:aws:s3:::townofwiley-documents-storage-main`)

### Step 3 — Open a GitHub Copilot coding agent issue

If you cannot immediately identify the fix, create a GitHub Issue and assign it to
**GitHub Copilot** (the coding agent):

1. Click **Issues → New issue**.
2. Title it clearly: for example "Amplify job NNN failing: `s3:PutBucketLogging` denied on documents bucket".
3. Paste the exact error lines from the log.
4. Mention which Amplify app ID and branch are affected (for example `app-id d331voxr1fhoir`, branch `main`, job `129`).
5. Assign the issue to **Copilot** using the Assignees panel.

Copilot will inspect the `amplify/backend/` configuration, identify the CloudFormation
resource causing the denial, and open a pull request with a targeted fix.

### Step 4 — Review and merge the pull request

Review the diff. Copilot changes should be limited to the exact resource causing the
denial. Merge the PR and let Amplify trigger a new build automatically from `main`.

---

## Known Issue: s3:PutBucketLogging on the Documents Bucket (resolved April 2026)

**Symptom**: Amplify job fails during backend environment initialization with:

```
AccessDenied: User arn:aws:sts::570912405222:assumed-role/townofwiley-amplify-service-role/BuildSession
is not authorized to perform s3:PutBucketLogging on arn:aws:s3:::townofwiley-documents-storage-main
```

**Root cause**: `amplify/backend/storage/documents/cloudformation-template.json` had a
`LoggingConfiguration` block on the `S3Bucket` resource and two companion resources
(`S3LogBucket`, `S3LogBucketPolicy`). CloudFormation calls `s3:PutBucketLogging` on the
main bucket to wire up logging, but the Amplify service role was not granted that
permission.

**Fix applied**: Removed the `LoggingConfiguration` property from `S3Bucket` and removed
the `S3LogBucket` and `S3LogBucketPolicy` resources entirely. The documents bucket retains
public-access blocking, AES-256 encryption, versioning, and CORS. Access logging is not
required for the current operational model of this bucket.

**If logging is needed in the future**: Add `s3:PutBucketLogging` to the
`townofwiley-amplify-service-role` in IAM **before** re-adding `LoggingConfiguration` to
the CloudFormation template, or use a separate CloudTrail trail at the account level
instead.

---

## Amplify build logs (always on; notifications are not)

Hosting builds **already save** full console output per job (**Hosting → Builds**). There is no repo switch to enable that.

Operators should verify in the Amplify Console:

1. **Hosting → Build notifications** — at least one recipient for **`main`** (or **All branches**), success and failure, so alerts include a link to the job transcript ([AWS docs](https://docs.aws.amazon.com/amplify/latest/userguide/notifications.html)).
2. **CloudWatch Logs** — locate CodeBuild-/Amplify-related **log groups** in `us-east-2`, set **retention**, and confirm IAM allows the Wiley team read access.

More detail lives in **`docs/AMPLIFY_HOSTING_SOT.md` § 1.a (Build logs — capture and alerting)**.

---

## Gen 2 decommissioned

Amplify Gen 2, Amplify Hosting, and `amplify_outputs.json` were **retired June 2026**. Production CMS uses **Gen 1 AppSync only** — see [gen2-decommissioned.md](./gen2-decommissioned.md) and [infrastructure/gen1-production-bindings.json](../infrastructure/gen1-production-bindings.json).

Deploy frontend with `npm run deploy:static-site` (S3 + CloudFront). Runtime config: `npm run generate:runtime-config:strict` + `npm run verify:runtime-config-cms`.

## Quick Reference: production backend

| Field             | Value                                |
| ----------------- | ------------------------------------ |
| App ID            | `d331voxr1fhoir`                     |
| Production branch | `main`                               |
| Region            | `us-east-2`                          |
| Service role      | `townofwiley-amplify-service-role`   |
| Documents bucket  | `townofwiley-documents-storage-main` |

## Quick Reference: GitHub Actions CI

The GitHub Actions workflow at `.github/workflows/git-workflow.yml` runs on every push to
`main` and on pull requests. It validates:

1. `npm run lint` — TypeScript and Angular linting
2. `npm run build` — production Angular build
3. `npm run test:e2e:smoke` — Playwright smoke tests on desktop Chromium

Amplify also runs its own build from `amplify.yml` after every merge to `main`.
GitHub Actions CI failures block the pull request; Amplify failures do not block the PR
but they do take the live site offline, so they must be fixed immediately.

See `docs/git-workflow.md` for the full CI policy and path-based trigger rules.

---

## Runtime config verification (`/runtime-config.js`)

**Source of truth:** Amplify Console → **Environment variables** on branch `main` (and any staging branch).
**Build step:** `npm run prebuild` → [`scripts/generate-runtime-config.mjs`](../scripts/generate-runtime-config.mjs) **`--strict`** → `public/runtime-config.js` copied into the hosting artifact.
**Live asset:** `https://townofwiley.gov/runtime-config.js` (or `https://main.d331voxr1fhoir.amplifyapp.com/runtime-config.js` for Amplify default host).

### Strict production build

Required variable **names** are defined in [`infrastructure/amplify-branch-env.manifest.json`](../infrastructure/amplify-branch-env.manifest.json) (`requiredForProduction`). The generator exits non-zero if any are missing when:

- `node scripts/generate-runtime-config.mjs --strict`
- `STRICT_RUNTIME_CONFIG=1`
- `AWS_APP_ID` is set (Amplify Hosting)

[`amplify.yml`](../amplify.yml) runs strict generation before `npm run build`. GitHub Actions passes the same values from **repository secrets** (see table in [appsync-api-key-rotation-runbook.md](./appsync-api-key-rotation-runbook.md)).

Local `npm start` uses non-strict `generate:runtime-config` so developers without Amplify env vars can still run the app.

### Expected keys (compare live file to Amplify env)

| Runtime path                        | Amplify env var(s)                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| `cms.appSync.apiEndpoint`           | `APPSYNC_CMS_ENDPOINT`                                                             |
| `cms.appSync.apiKey`                | `APPSYNC_CMS_API_KEY` (redact in logs)                                             |
| `cms.appSync.region`                | `APPSYNC_CMS_REGION`                                                               |
| `weather.apiEndpoint`               | `NWS_PROXY_ENDPOINT`                                                               |
| `weather.alertSignup.apiEndpoint`   | `SEVERE_WEATHER_SIGNUP_API_ENDPOINT`                                               |
| `weather.alertSignup.enabled`       | `SEVERE_WEATHER_SIGNUP_ENABLED`                                                    |
| `payments.paystar.mode`             | `PAYSTAR_MODE` (or inferred from portal/API URLs)                                  |
| `payments.paystar.portalUrl`        | `PAYSTAR_PORTAL_URL`                                                               |
| `payments.paystar.apiEndpoint`      | `PAYSTAR_API_ENDPOINT`                                                             |
| `contactUpdate.apiEndpoint`         | `CONTACT_UPDATE_API_ENDPOINT` (write Lambda; billing assistance + contact updates) |
| `contactUpdate.reviewApiEndpoint`   | `CONTACT_UPDATE_REVIEW_API_URL` (JWT staff review API)                             |
| `contactUpdate.reviewProxyEndpoint` | `CONTACT_UPDATE_REVIEW_PROXY_URL` (**deprecated**)                                 |
| `chatbot.*`                         | `EASYPEASY_*`                                                                      |
| `build.gitSha` / `build.timestamp`  | From git at build time                                                             |

### Verification commands (PowerShell)

```powershell
$env:AWS_PROFILE = "townofwiley"
$env:AWS_REGION = "us-east-2"
aws amplify get-branch --app-id d331voxr1fhoir --branch-name main `
  --query "branch.environmentVariables" --output json

Invoke-WebRequest -Uri "https://townofwiley.gov/runtime-config.js" -OutFile "$env:TEMP\runtime-config-prod.js"
```

Reproduce locally from the same env vars (do not commit output):

```powershell
npm run generate:runtime-config
```

**Pass criteria:** Paystar `portalUrl` is the real Town URL when go-live is intended (no resident-facing placeholder links). CMS endpoint and API key present. Weather proxy URL matches deployed Lambda. `build.gitSha` matches the latest `main` deploy.

**Post-deploy gate (every merge to `main` with hosting or infra changes):**

Auto-deploy runs post-deploy curl + CSP probe in the `deploy-production` CI job. For manual verification:

```bash
export AWS_PROFILE=townofwiley
export AWS_REGION=us-east-2

npm run verify:aws-infra
npm run verify:live-csp-probe
npm run verify:live-csp-vs-repo
```

(Historical: `npm run amplify:sync-hosting` applied when Amplify Hosting was live.)

See the full checklist: [pre-launch-ops-workflow.md](./pre-launch-ops-workflow.md).

**Post-deploy CMS probe:**

```bash
npm run verify:runtime-config-cms
npm run verify:runtime-config-cms -- --require-events
```

AppSync API key rotation: [appsync-api-key-rotation-runbook.md](./appsync-api-key-rotation-runbook.md).

**Evidence log (paste in PR or ops ticket):** date, verifier, branch, Amplify job id, `build.gitSha`, Paystar `mode` + whether `portalUrl` is set (not the URL itself if sensitive), CMS/weather endpoints non-empty yes/no.

After any Amplify env change: **redeploy `main`**, then ask clerks/residents to **hard-refresh** so browsers load the new `/runtime-config.js`. Clerk-facing steps: [`docs/CLERK-CMS-GUIDE.md`](CLERK-CMS-GUIDE.md) § “When IT changes payment or other website settings.”

See also [`docs/AMPLIFY_HOSTING_SOT.md`](AMPLIFY_HOSTING_SOT.md) §4. Agent session prompt (Week 1 AP-01/02/03/10): [`docs/week1-incremental-session-prompt.md`](week1-incremental-session-prompt.md).

---

## Sync app-level custom headers (CSP) with the repo

Hosting headers (**CSP, HSTS, cache-control**, etc.) are defined only in repo-root [`customHttp.yml`](../customHttp.yml). [`amplify.yml`](../amplify.yml) intentionally has **no** `customHeaders` block, following AWS guidance to [migrate custom headers out of the build specification](https://docs.aws.amazon.com/amplify/latest/userguide/migrate-custom-headers.html).

If production CSP is narrower than the repo (for example `font-src 'self'` without `data:`), PrimeIcons and other assets break in the browser even though `customHttp.yml` is correct—usually the Amplify **app** custom headers in AWS were edited separately or an old deploy is cached.

1. Use AWS credentials for account **570912405222** (same account as `amplify/team-provider-info.json`).
2. Install **jq** (`brew install jq`).
3. From the repo root:

   ```bash
   export AWS_PROFILE=townofwiley   # must resolve to 570912405222 (workspace default)
   npm run amplify:sync-headers
   ```

   To sync **buildSpec** (Node pin from [`amplify.yml`](../amplify.yml)) and SPA rewrites in one step:

   ```bash
   npm run amplify:sync-hosting
   ```

   This runs [`scripts/sync-amplify-custom-headers.sh`](../scripts/sync-amplify-custom-headers.sh), which reads [`customHttp.yml`](../customHttp.yml) and calls `aws amplify update-app --cli-input-json` so CSP values with single quotes are not truncated. Build settings: [`scripts/sync-amplify-buildspec.sh`](../scripts/sync-amplify-buildspec.sh).

4. Redeploy the `main` branch from the Amplify Console (or push an empty commit) if headers do not appear immediately on CloudFront.

To change headers or CSP, edit **`customHttp.yml` only**, merge to `main`, then either wait for the Amplify build (which ships `customHttp.yml` from the repo root) or run `npm run amplify:sync-headers` to push the same YAML to the app immediately.

**Local `ng serve` CSP parity:** After changing CSP in `customHttp.yml`, run `npm run sync:angular-serve-csp` so `angular.json` `serve.options.headers` stays identical to the hosting policy (the dev server applies that header on every response). `npm run verify:custom-http-yaml` fails if they drift.

### Resilience (prevent header / CSP drift)

AWS documents that **custom headers should live in `customHttp.yml` or the Amplify console**, and that **headers historically embedded in `amplify.yml` should be migrated out** of the buildspec:

- [Setting custom headers](https://docs.aws.amazon.com/amplify/latest/userguide/setting-custom-headers.html)
- [Custom header YAML reference](https://docs.aws.amazon.com/amplify/latest/userguide/custom-header-YAML-format.html)
- [Migrating custom headers out of the build specification and amplify.yml](https://docs.aws.amazon.com/amplify/latest/userguide/migrate-custom-headers.html)

**CI enforces the migration:** `amplify.yml` must not reintroduce `customHeaders`, and [`customHttp.yml`](../customHttp.yml) must contain a CSP that satisfies [Google Tag Platform / GA4 + Google Signals](https://developers.google.com/tag-platform/security/guides/csp) (script-src, connect-src, img-src, frame-src for Google hosts), plus site baselines (`worker-src 'self'` for Angular `ngsw-worker.js`, `font-src` + `data:` for PrimeIcons, `object-src 'none'`). Google Analytics loads from [`public/google-analytics-init.js`](../public/google-analytics-init.js) so the service worker does not prefetch `gtag/js` during install (those SW `fetch()` calls follow `connect-src`; see [angular#35491](https://github.com/angular/angular/issues/35491)).

- `npm run verify:custom-http-yaml` — [`scripts/verify-custom-http-yaml.mjs`](../scripts/verify-custom-http-yaml.mjs) (Site CI job **Verify CSP SSOT** on every push/PR).

After `npm run amplify:sync-headers`, the sync script **reads back** `aws amplify get-app` and fails if the returned `customHeaders` blob is missing key CSP markers (catches silent API truncation).

**Weekly production probe** (scheduled workflow): [`hosting-headers-drift-watch.yml`](../.github/workflows/hosting-headers-drift-watch.yml) curls `https://www.townofwiley.gov/` and fails if `Content-Security-Policy` is missing baseline tokens (`googletagmanager`, `font-src` + `data:`, `style-src 'unsafe-inline'`, etc.), compares the full header to `customHttp.yml`, and runs the live Playwright inline-style check. Run manually via **Actions → Hosting headers drift watch → Run workflow**.

**After CSP header changes:** Some clients keep a stale policy until the Angular service worker updates. Operators should unregister the SW or use “Update on reload”, then confirm the **document** response for `/` includes `style-src 'self' 'unsafe-inline'`. See [third-party-csp-registry.md](./third-party-csp-registry.md) § “Service worker and stale CSP”.

**Operational rule:** Do not maintain a conflicting copy of CSP in the Amplify Console **Hosting → Custom headers** editor unless it matches the repo; when `customHttp.yml` is in the repo and deployed, it **overrides** console custom headers for that deployment path—see AWS [custom headers](https://docs.aws.amazon.com/amplify/latest/userguide/custom-headers.html) overview. Prefer editing **`customHttp.yml`** only, then sync + redeploy.
