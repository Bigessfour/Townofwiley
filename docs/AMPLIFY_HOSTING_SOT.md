# Amplify Hosting — Single Source of Truth (SOT)

This document is the canonical reference for how the Town of Wiley website is built,
hosted, and routed on AWS Amplify Hosting. It is intentionally narrow: only the wiring
that turns the Angular 21 SPA into a live, deep-linkable site belongs here.

When the build output, rewrite rules, CSP origins, or runtime-config flow change,
update this file in the same PR.

---

## 1. Build output and artifact path

Amplify executes the build defined in [`amplify.yml`](../amplify.yml). The relevant facts:

- **Node version**: pinned to **`24.16.0`** via `nvm install 24.16.0` / `nvm use 24.16.0` in `preBuild`, matching `.nvmrc` and CI. See [`NODE_VERSION.md`](NODE_VERSION.md). **Node 25+ is unsupported** for this stack.
- **Install**: `npm ci`.
- **Build command**: `npm run build` (which runs the Angular `ng build` configured in `angular.json`).
- **Artifact `baseDirectory`**: `dist/townofwiley-app/browser` — Amplify uploads everything under this folder to its CDN. This is the SPA static-asset root: `index.html`, hashed `*.js`/`*.css` bundles, and the `assets/` tree.
- **Build cache**: `node_modules/**/*` is cached between builds.

If the artifact root ever moves (for example after an Angular major upgrade that changes the output folder), update both `amplify.yml` and this section.

### 1.b Why `serve:prodlike` can look “perfect” but **townofwiley.gov** does not

Those are **not the same runtime**. `ng serve --configuration=production` still runs a **dev server** from disk, without Amplify’s CDN, custom headers, or the **exact** build-time environment.

| Factor                  | Local prod-like                                                                                             | Live Amplify (`townofwiley.gov`)                                                                                                                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`runtime-config.js`** | Written by `prestart` / `prebuild` using **local** `secrets/local/user-secrets.json` and your shell **env** | Written at **Amplify build** time from **Amplify Console → Environment variables** ([`scripts/generate-runtime-config.mjs`](../scripts/generate-runtime-config.mjs)). Missing or wrong vars ⇒ different CMS, Paystar, chat, weather proxies, feature flags. |
| **Service worker**      | **Off** while `ng serve` runs (`isDevMode()` is true) → no offline cache of old bundles                     | **On** for real production builds (`provideServiceWorker` in [`src/app/app.config.ts`](../src/app/app.config.ts)). Stale cache can make the public site look **one or more deploys behind**.                                                                |
| **CSP / headers**       | Optional; `angular.json` **serve** CSP is not guaranteed to match Amplify                                   | Repo SSOT [`customHttp.yml`](../customHttp.yml) (must be synced to hosting). Stricter **connect-src** / **frame-src** can block APIs or embeds that work locally.                                                                                           |
| **What’s deployed**     | Your **current working tree**                                                                               | Whatever **last succeeded** on **`main`** for app `d331voxr1fhoir`. Unmerged PRs or failed builds mean production lags your laptop.                                                                                                                         |

**Quick parity checks (operators):**

1. Amplify **Hosting → Builds**: last **main** job succeeded; note the **commit**.
2. Browser (production): **hard reload** or DevTools → Application → **Clear storage** (or unregister **Service Workers** for the site) and retry.
3. Compare **`/runtime-config.js`** on production with your local `public/runtime-config.js` (same **keys** shape; **never** paste secrets into tickets).
4. Confirm **custom headers** in Console match repo: `npm run amplify:sync-headers` after changing [`customHttp.yml`](../customHttp.yml).

To approximate “static prod” without `ng serve`, after `npm run build` you can serve **`dist/townofwiley-app/browser`** with a static server and still expect **no** service-worker behavior unless you mimic registration—so it is not a full Amplify twin either.

### 1.a Build logs — capture and alerting (operator checklist)

**Nothing in `amplify.yml` turns logs “on.”** Amplify Hosting records a full transcript for every frontend build automatically. You retrieve it under **Hosting → Builds** → select the job (**Download**, or inline viewer). Optionally use the API (`aws amplify list-jobs` / `aws amplify get-job`; some payloads include step **log URLs**).

**Correct AWS account (Town of Wiley website):** The hosting app **`d331voxr1fhoir`** lives in **AWS account `570912405222`** (**`57…`**). This repository pins **`townofwiley`** as the CLI profile (`~/.aws/` + `.vscode/settings.json` + terminal `AWS_PROFILE`). Code Platoon and other workloads use **`38…`** and must **never** occupy that Wiley profile slot. Wrong profile ⇒ **`amplify list-apps`** empty and unrelated CloudWatch noise. Confirm identity before CLI or Console ops:

```bash
AWS_PROFILE=townofwiley aws sts get-caller-identity   # Account must be Town of Wiley 570912405222 (57… prefix)
AWS_PROFILE=townofwiley AWS_REGION=us-east-2 aws amplify list-apps --output table --query 'apps[*].[name,appId]'
```

**Recommended settings so logs are reachable and actionable:**

| Setting                               | Where                                                                                                                  | Why                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Build notifications**               | Amplify Console → **Hosting → Build notifications** → **Manage notifications**                                         | Email (SNS-managed) when a branch build **succeeds or fails**, with links back to the failing job ([AWS docs: build notifications](https://docs.aws.amazon.com/amplify/latest/userguide/notifications.html)). Treat this as mandatory for whoever owns deployments.                                                                                                                                                                            |
| **Build logs ≠ CloudWatch (WEB SPA)** | `aws amplify get-job …` **`steps[].logUrl`** → presigned **`log.txt`** in **`aws-amplify-prod-*-*-artifacts`** buckets | Amplify Hosting **frontend** transcripts are **artifact URLs**, **not** a customer-managed CloudWatch Logs stream AWS turns on via Console. Searching CW for **`CODEBUILD`** / **`d331`** often finds **Amplify Backend Lambdas** only (set **retention** on those—for example **`/aws/lambda/amplify-townofwiley-main--…`** already had **30d** retention in May 2026). Do **not** expect a turnkey “Amplify CW build logs” checkbox for SPA. |
| **SSR Compute logs** (if ever used)   | Amplify Console → **Monitoring → Hosting compute logs**                                                                | Applies only when using Amplify **SSR Hosting compute**, not static export. See [Monitoring with CloudWatch](https://docs.aws.amazon.com/amplify/latest/userguide/monitoring-with-cloudwatch.html).                                                                                                                                                                                                                                            |

**Optional central archive:** Route **`Amplify Deployment Status Change`** from EventBridge (`source: aws.amplify`) to SNS, Slack, Lambda, etc., to stash **job id / branch / status** and a Console URL whenever a deployment finishes ([EventBridge amplify events](https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-amplify.html)).

**Parallel record:** GitHub Actions **`npm run build`** on merges also captures **`prebuild`** (including **`generate-runtime-config.mjs`**) and **`postbuild`** (`generate-static-route-entrypoints.mjs`) in workflow logs—not a substitute for Amplify’s artifact deploy, but a second transcript when CI runs.

**CLI: pull the latest main BUILD log locally** (after `AWS_PROFILE=townofwiley` works):

```bash
bash scripts/fetch-amplify-build-log.sh | tail -80
JOB_ID=190 bash scripts/fetch-amplify-build-log.sh > /tmp/main-job-190-build.txt
```

Links expire quickly; rerun the script after ~1 h.

**Duplicating transcripts into CloudWatch yourself:** Amplify doesn’t automate this for SPA WEB. Typical pattern an operator adds is **EventBridge (`Amplify Deployment Status Change`) → Lambda**: `amplify get-job` → **`curl`** each **`logUrl`** → **`PutLogEvents`** to a repo-owned log group (for example **`/townofwiley/amplify-hosted/Townofwiley-main`**) with **`logs:PutLogEvents`** on the Lambda role—not maintained in-repo today unless you explicitly add IaC/Lambda later.

---

## 2. SPA fallback / rewrites (deep-link parity)

The site is a single-page Angular application using the standard Router. Amplify Hosting
must rewrite every unknown path to `/index.html` so deep links and hard refreshes work.

The required rewrite rule (Amplify Console → App settings → Rewrites and redirects):

| Source                                                                                                                     | Target        | Type            |
| -------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------- |
| `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json\|xml\|webmanifest\|webp)$)([^.]+$)/>` | `/index.html` | `200 (Rewrite)` |

This is the AWS-recommended SPA fallback regex (see Amplify Hosting docs:
[Single page apps and rewrites](https://docs.aws.amazon.com/amplify/latest/userguide/redirects.html#redirects-for-single-page-web-apps-spa)).

**Apply or repair via AWS CLI** (Town of Wiley account, `AWS_PROFILE` with access to app `d331voxr1fhoir`, region `us-east-2`; does **not** overwrite `customHeaders`):

```bash
# From repo root (uses absolute file:// path):
npm run amplify:sync-spa-rewrites

# Or:
./scripts/sync-amplify-spa-rules.sh
```

Source of truth for that JSON array is [`scripts/amplify-spa-rewrite-rules.json`](../scripts/amplify-spa-rewrite-rules.json): (1) SPA regex above rewriting to `/index.html` with `200`, (2) optional `/404.html` → `/index.html` `200` for a clean Angular shell on missing static files.

Routes that must hard-refresh on production:

- `/`
- `/services`
- `/news`
- `/weather`
- `/admin` (and `/clerk-setup#*` legacy redirect, owned by [`ClerkSetupRedirect`](../src/app/clerk-setup/clerk-setup-redirect.ts))
- `/documents`
- `/notices`, `/meetings`, `/contact`, `/businesses`, `/pay-bill`, `/permits`, `/accessibility`, `/privacy`, `/terms`

These are exercised by [`e2e/specs/smoke/live-hosting.spec.ts`](../e2e/specs/smoke/live-hosting.spec.ts) when `E2E_BASE_URL` is set.

---

## 3. HTTP headers (CSP and friends)

All HTTP headers are managed in the repo at [`customHttp.yml`](../customHttp.yml) and synced to Amplify by `scripts/sync-amplify-custom-headers.sh`. Highlights:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `Content-Security-Policy` — single source of truth for allowed origins. Notable origins:
  - **Self / Amplify**: default-src 'self'.
  - **AppSync (CMS)**: `https://*.appsync-api.us-east-2.amazonaws.com`, `wss://*.appsync-realtime-api.us-east-2.amazonaws.com`.
  - **S3 documents bucket**: `https://townofwiley-documents-storage.s3.us-east-2.amazonaws.com` (connect-src + media-src + frame-src — the last so the `/news` newsletter PDF iframe can render presigned URLs; see [`docs/CMS_NEWSLETTER.md`](CMS_NEWSLETTER.md)).
  - **NWS weather**: `https://api.weather.gov`, `https://alerts.weather.gov`, `https://radar.weather.gov`.
  - **Lambda function URLs**: `https://*.lambda-url.us-east-2.on.aws` (weather proxy + alert signup).
  - **Google Analytics 4 / GTM**: `https://www.googletagmanager.com`, `https://www.google-analytics.com`, etc.
  - **AI assistant embed**: `https://bots.easy-peasy.ai`, `wss://bots.easy-peasy.ai`.

Caching:

- `**/*.js`, `**/*.css`, `**/*.woff`, `**/*.woff2`: `public, max-age=31536000, immutable` (hashed bundles).
- `**/*.png`, `**/*.webp`, `**/*.gif`: `public, max-age=2592000`.
- `**/*.html`: `no-cache, no-store, must-revalidate` (always serve fresh `index.html`).
- `**/runtime-config.js`: `no-cache, no-store, must-revalidate` (so env updates land immediately on next refresh).

CI guards:

- [`scripts/verify-custom-http-yaml.mjs`](../scripts/verify-custom-http-yaml.mjs) keeps the YAML structurally valid.
- [`scripts/probe-live-hosting-csp.sh`](../scripts/probe-live-hosting-csp.sh) compares the deployed CSP to the repo file.
- [`e2e/specs/smoke/live-hosting-headers.spec.ts`](../e2e/specs/smoke/live-hosting-headers.spec.ts) asserts the headers on `E2E_BASE_URL` when set.

**Drift from `customHttp.yml` (staging/prod CSP looks stale vs local `ng serve`):** Amplify persists `customHeaders` on the Hosting app (`aws amplify get-app`). The repo expects full GA4/SW-aligned CSP (see [`customHttp.yml`](../customHttp.yml)). If the CLI shows an older CSP (for example missing `worker-src`, `*.googletagmanager.com`, `frame-src`, or Doubleclick/Google `connect-src` entries), operators with Wiley IAM access should run **`npm run amplify:sync-headers`** (see [`scripts/sync-amplify-custom-headers.sh`](../scripts/sync-amplify-custom-headers.sh)), using `AWS_PROFILE` / `AWS_REGION=us-east-2`. Then optionally **Redeploy** the `main` branch in the Amplify Console if edge headers do not update within a short window.

---

## 4. Runtime config provenance (`/runtime-config.js`)

The Angular app reads environment-shaped configuration from `window.__TOW_RUNTIME_CONFIG__`,
populated by the static asset `/runtime-config.js`.

Pipeline:

1. Amplify environment variables (Console → App settings → Environment variables) are the source of truth for values like `APPSYNC_CMS_ENDPOINT`, `APPSYNC_CMS_API_KEY`, `APPSYNC_CMS_REGION`, weather/alert proxy URLs, Paystar mode/portal, and chatbot ids.
2. During the build, [`scripts/generate-runtime-config.mjs`](../scripts/generate-runtime-config.mjs) reads those variables and writes [`public/runtime-config.js`](../public/runtime-config.js).
3. Angular's build copies `public/` into `dist/townofwiley-app/browser/`.
4. Amplify uploads it. The browser fetches `/runtime-config.js` on every page load (no-cache) and assigns to `window.__TOW_RUNTIME_CONFIG__`.
5. App services (`getPaystarRuntimeConfig`, `LocalizedCmsContentStore`, weather proxy, etc.) read from that window object.

Override mechanism for E2E and dev: tests can set `window.__TOW_RUNTIME_CONFIG_OVERRIDE__` from `Page.addInitScript`. Production code merges override on top of the runtime config so tests never have to deploy a different `runtime-config.js` to exercise a code path.

---

## 5. Backend dependencies (out of scope, but linked here)

- **AppSync GraphQL CMS**: schema at [`amplify/backend/api/townofwiley/schema.graphql`](../amplify/backend/api/townofwiley/schema.graphql). Models read by `LocalizedCmsContentStore` (SiteSettings, AlertBanner, Announcement, Event, OfficialContact, Business, PublicDocument, ExternalNewsLink, EmailAlias).
- **S3 documents bucket**: `townofwiley-documents-storage` in `us-east-2`. Resolved at runtime by `DocumentUploadService.resolveDocumentHref`.
- **Lambda function URLs**: weather proxy and alert signup, both behind `https://*.lambda-url.us-east-2.on.aws` (allowed in the connect-src CSP origin).

**Lambda Function URL → CORS (severe weather alert signup):** The handler in [`infrastructure/severe-weather-signup/app.py`](../infrastructure/severe-weather-signup/app.py) emits a single `Access-Control-Allow-Origin` (allowlisted origins, `Vary: Origin`), matching the pattern documented at the top of [`infrastructure/nws-weather-proxy/index.mjs`](../infrastructure/nws-weather-proxy/index.mjs). In AWS Console → Lambda → **Configuration → Function URL → CORS**, do **not** layer a second ACAO (for example `*` plus a site origin); either disable URL-level CORS so only the function’s headers apply, or align URL CORS with that single header—otherwise browsers report multiple `Access-Control-Allow-Origin` values and block the call.

---

## 6. Update checklist

Before merging changes that touch hosting:

1. Bump `customHttp.yml` and run `npm run verify:custom-http-yaml`.
2. Run `npm run lint` and the targeted `live-hosting*.spec.ts` against a staging URL when applicable.
3. Update this file with any new origin, rewrite, or runtime-config key.
4. After deploy, hit `/admin#documents`, `/clerk-setup#documents`, and a couple of public deep links via hard refresh to confirm the SPA fallback rewrite is intact.

## 7. AWS logging and alerts (Hosting API changes)

Amplify emits **CloudTrail management events** for `amplify.amazonaws.com` (including **`UpdateApp`**, which carries **customHeaders** changes). To get **notifications** when Hosting metadata changes, enable **CloudTrail → EventBridge** and a rule on **`UpdateApp` / `UpdateBranch`** targeting **SNS** (or Chatbot). The repo runbook with step-by-step patterns is **[`AWS_AMPLIFY_HOSTING_CHANGE_ALERTS.md`](AWS_AMPLIFY_HOSTING_CHANGE_ALERTS.md)**. Complement that with the **daily** GitHub Actions CSP probe ([`hosting-headers-drift-watch.yml`](../.github/workflows/hosting-headers-drift-watch.yml)) so **live** CSP regressions are caught even when API calls are expected.
