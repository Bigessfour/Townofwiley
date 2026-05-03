# Amplify Deployment Self-Healing Runbook

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

## Quick Reference: Amplify App Details

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

## Sync app-level custom headers (CSP) with the repo

Amplify Hosting can store **custom HTTP headers** on the app that differ from [`amplify.yml`](amplify.yml). If production CSP is narrower (for example `font-src 'self'` without `data:`), PrimeIcons and other assets break in the browser even though the repo is correct.

1. Use AWS credentials for account **570912405222** (same account as `amplify/team-provider-info.json`).
2. Install **jq** (`brew install jq`).
3. From the repo root:

   ```bash
   export AWS_PROFILE=your-wiley-profile   # or SSO login for 570912405222
   npm run amplify:sync-headers
   ```

   This runs [`scripts/sync-amplify-custom-headers.sh`](../scripts/sync-amplify-custom-headers.sh), which reads the repo-root [`customHttp.yml`](../customHttp.yml) (YAML; keep in sync with `amplify.yml`) and calls `aws amplify update-app --cli-input-json` so CSP values with single quotes are not truncated.

4. Redeploy the `main` branch from the Amplify Console (or push an empty commit) if headers do not appear immediately on CloudFront.

To update the policy later, edit **`amplify.yml`** and **`customHttp.yml`** together, then run `npm run amplify:sync-headers` again (or push so Amplify applies `customHttp.yml` from the repo).

### Resilience (prevent header / CSP drift)

AWS documents that **custom headers should live in `customHttp.yml` or the Amplify console**, and that **headers historically embedded in `amplify.yml` should be migrated out** of the buildspec to avoid split sources of truth:

- [Setting custom headers](https://docs.aws.amazon.com/amplify/latest/userguide/setting-custom-headers.html)
- [Custom header YAML reference](https://docs.aws.amazon.com/amplify/latest/userguide/custom-header-YAML-format.html)
- [Migrating custom headers out of the build specification and amplify.yml](https://docs.aws.amazon.com/amplify/latest/userguide/migrate-custom-headers.html)

This repository currently keeps **`amplify.yml` `customHeaders` and root `customHttp.yml` identical** so builds and `aws amplify update-app` stay aligned. **CI enforces that parity** so a PR cannot merge with mismatched CSP strings:

- `npm run verify:amplify-csp-parity` — [`scripts/verify-custom-http-csp-parity.mjs`](../scripts/verify-custom-http-csp-parity.mjs) (runs on every push/PR in GitHub Actions).

After `npm run amplify:sync-headers`, the sync script **reads back** `aws amplify get-app` and fails if the returned `customHeaders` blob is missing key CSP markers (catches silent API truncation).

**Weekly production probe** (scheduled workflow): [`hosting-headers-drift-watch.yml`](../.github/workflows/hosting-headers-drift-watch.yml) curls `https://www.townofwiley.gov/` and fails if `Content-Security-Policy` is missing baseline tokens (`googletagmanager`, `font-src` + `data:`, etc.). Run manually via **Actions → Hosting headers drift watch → Run workflow**.

**Operational rule:** Do not maintain a third copy of CSP in the Amplify Console **Hosting → Custom headers** editor unless it matches the repo; when `customHttp.yml` is in the repo and deployed, it **overrides** console custom headers for that deployment path—see AWS [custom headers](https://docs.aws.amazon.com/amplify/latest/userguide/custom-headers.html) overview. Prefer editing the repo only, then sync + redeploy.
