# Amplify Hosting — Single Source of Truth (SOT)

This document is the canonical reference for how the Town of Wiley website is built,
hosted, and routed on AWS Amplify Hosting. It is intentionally narrow: only the wiring
that turns the Angular 21 SPA into a live, deep-linkable site belongs here.

When the build output, rewrite rules, CSP origins, or runtime-config flow change,
update this file in the same PR.

---

## 1. Build output and artifact path

Amplify executes the build defined in [`amplify.yml`](../amplify.yml). The relevant facts:

- **Node version**: pinned to `nvm install 24` in the `preBuild` phase so Amplify and local builds use the same major.
- **Install**: `npm ci`.
- **Build command**: `npm run build` (which runs the Angular `ng build` configured in `angular.json`).
- **Artifact `baseDirectory`**: `dist/townofwiley-app/browser` — Amplify uploads everything under this folder to its CDN. This is the SPA static-asset root: `index.html`, hashed `*.js`/`*.css` bundles, and the `assets/` tree.
- **Build cache**: `node_modules/**/*` is cached between builds.

If the artifact root ever moves (for example after an Angular major upgrade that changes the output folder), update both `amplify.yml` and this section.

---

## 2. SPA fallback / rewrites (deep-link parity)

The site is a single-page Angular application using the standard Router. Amplify Hosting
must rewrite every unknown path to `/index.html` so deep links and hard refreshes work.

The required rewrite rule (Amplify Console → App settings → Rewrites and redirects):

| Source                                                           | Target           | Type                  |
| ---------------------------------------------------------------- | ---------------- | --------------------- |
| `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json\|xml\|webmanifest\|webp)$)([^.]+$)/>` | `/index.html`     | `200 (Rewrite)`        |

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
  - **S3 documents bucket**: `https://townofwiley-documents-storage.s3.us-east-2.amazonaws.com` (connect-src + media-src).
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

---

## 6. Update checklist

Before merging changes that touch hosting:

1. Bump `customHttp.yml` and run `npm run verify:custom-http-yaml`.
2. Run `npm run lint` and the targeted `live-hosting*.spec.ts` against a staging URL when applicable.
3. Update this file with any new origin, rewrite, or runtime-config key.
4. After deploy, hit `/admin#documents`, `/clerk-setup#documents`, and a couple of public deep links via hard refresh to confirm the SPA fallback rewrite is intact.

## 7. AWS logging and alerts (Hosting API changes)

Amplify emits **CloudTrail management events** for `amplify.amazonaws.com` (including **`UpdateApp`**, which carries **customHeaders** changes). To get **notifications** when Hosting metadata changes, enable **CloudTrail → EventBridge** and a rule on **`UpdateApp` / `UpdateBranch`** targeting **SNS** (or Chatbot). The repo runbook with step-by-step patterns is **[`AWS_AMPLIFY_HOSTING_CHANGE_ALERTS.md`](AWS_AMPLIFY_HOSTING_CHANGE_ALERTS.md)**. Complement that with the **daily** GitHub Actions CSP probe ([`hosting-headers-drift-watch.yml`](../.github/workflows/hosting-headers-drift-watch.yml)) so **live** CSP regressions are caught even when API calls are expected.
