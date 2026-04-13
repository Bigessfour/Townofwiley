# Townofwiley

TownOfWiley Website

## Git Workflow

- Production deploys come from `main` through Amplify.
- Use short-lived feature branches and merge into `main` only when the change is build-safe.
- Keep deployable app changes in `src/`, `public/`, `package*.json`, `angular.json`, `tsconfig*`, `amplify.yml`, and `scripts/generate-runtime-config.mjs`.
- Keep maintainer-facing docs and runbooks tracked in the repo under `docs/`, `README.md`, `CLERK-CMS-GUIDE.md`, `bot-training/`, and related operational paths.
- Do not commit local reports, temp logs, or machine-specific artifacts.
- GitHub Actions validates deployable paths; Amplify handles the production deployment after `main` updates.
- GitHub Actions uses targeted caches for npm, Playwright browsers, and Angular CLI build artifacts; Amplify keeps its own build cache through `amplify.yml`.

Detailed policy: [docs/git-workflow.md](docs/git-workflow.md)

## Runtime Baseline

- Supported production Node lines: `24.x` preferred, `22.x` acceptable
- Do not deploy or build on odd-numbered current releases such as `25.x`
- This workspace was last observed on local `node v25.2.1`, so switch locally before build and test runs if you want parity with Amplify

Recommended local workflow:

```bash
nvm install 24
nvm use 24
node -v
```

## Deployment Record

### AWS Amplify

- App name: `Townofwiley`
- App ID: `d331voxr1fhoir`
- Region: `us-east-2`
- Repository: `https://github.com/Bigessfour/Townofwiley`
- Default domain: `d331voxr1fhoir.amplifyapp.com`
- Production branch: `main`
- Build command: `npm run build`
- Build output: `dist/townofwiley-app/browser`
- Node runtime for Amplify builds: `24.x`

Amplify build spec:

```yml
version: 1
frontend:
	phases:
		preBuild:
			commands:
				- nvm install 24
				- nvm use 24
				- npm ci
		build:
			commands:
				- npm run build
	artifacts:
		baseDirectory: dist/townofwiley-app/browser
		files:
			- "**/*"
	cache:
		paths:
			- node_modules/**/*
```

Current public domain details:

- Public hostnames: `townofwiley.gov` and `www.townofwiley.gov`
- Known-good fallback hostname: `https://main.d331voxr1fhoir.amplifyapp.com`
- Amplify status at last check: `AVAILABLE`
- Current Amplify branch mapping:
  - apex (`townofwiley.gov`) -> `main`
  - `www` -> `main`
- Current Amplify target:
  - `townofwiley.gov` -> `d3fmdu29qcwosh.cloudfront.net`
  - `www.townofwiley.gov` -> `d3fmdu29qcwosh.cloudfront.net`
- Amplify verification CNAME:
  - Name: `_f4cd947025ff4f4f7e1f4fb150940ac9.townofwiley.gov`
  - Target: `_377aa211e662dc086d0721e3a52067df.jkddzztszm.acm-validations.aws`

#### SPA routing — custom error response

This is a client-side routed Angular SPA. Without a catch-all rule, deep links like `https://townofwiley.gov/weather` return a 403 or 404 from CloudFront on hard refresh.

The `postbuild` script (`scripts/generate-static-route-entrypoints.mjs`) copies `index.html` into each route subdirectory **and** into `dist/.../404.html`, so the app side is handled. The hosting layer also needs to be configured once in the Amplify Console:

1. Open **Amplify Console → App → Hosting → Rewrites and redirects**.
2. Add a rule: Source `</>`  — Target `/index.html`  — Type `200 (Rewrite)`.
3. Save and redeploy.

If the distribution is custom-managed in CloudFront directly, add an **Error pages** rule: HTTP 403 → `/404.html` (response code 200), and the same for HTTP 404.

Important custom-domain note for future maintainers:

- Route 53 is the authoritative DNS provider for `townofwiley.gov`.
- Both `townofwiley.gov` and `www.townofwiley.gov` are attached to Amplify and serve the live site.
- The Route 53 hosted zone now includes an apex alias `A` record that points at the Amplify CloudFront target.
- Keep the apex hosted through Route 53 alias records; do not replace it with a zone-apex `CNAME` or a random historical CloudFront hostname from a failed setup.
- If the domain is ever rebuilt, update the Amplify domain association first, then verify the Route 53 apex alias and `www` record together.

### Route 53

- Hosted zone: `townofwiley.gov`
- Hosted zone ID: `Z088746831TMIL67NZ0VF`
- Authoritative nameservers:
  - `ns-360.awsdns-45.com`
  - `ns-1383.awsdns-44.org`
  - `ns-1718.awsdns-22.co.uk`
  - `ns-530.awsdns-02.net`

Route 53 DNS records expected during the current recovery path:

- `townofwiley.gov` `A` alias -> `d3fmdu29qcwosh.cloudfront.net`
- `www.townofwiley.gov` `CNAME` -> `d3fmdu29qcwosh.cloudfront.net`
- `_f4cd947025ff4f4f7e1f4fb150940ac9.townofwiley.gov` `CNAME` -> `_377aa211e662dc086d0721e3a52067df.jkddzztszm.acm-validations.aws`
- Route 53 may also create or later require an apex `AAAA` alias if IPv6 is enabled for the attached CloudFront target.

Current DNS note:

- Public resolvers can disagree for a while after a nameserver migration. If a resolver still shows the old Cloudflare nameservers, wait for cache expiry and re-check against the four Route 53 nameservers above.
- The AWS-side source of truth is the Route 53 hosted zone plus the Amplify domain association for `townofwiley.gov`.
- Never use a `CNAME` at the zone apex.
- When debugging apex outages, verify these in order:
  1. `aws amplify get-domain-association --app-id d331voxr1fhoir --domain-name townofwiley.gov`
  2. `aws route53 list-resource-record-sets --hosted-zone-id Z088746831TMIL67NZ0VF`
  3. `Resolve-DnsName -Name townofwiley.gov -Type A -Server ns-360.awsdns-45.com`

Verification check completed after creating the ACM CNAME:

```text
nslookup -type=CNAME _f4cd947025ff4f4f7e1f4fb150940ac9.townofwiley.gov

_f4cd947025ff4f4f7e1f4fb150940ac9.townofwiley.gov canonical name =
_377aa211e662dc086d0721e3a52067df.jkddzztszm.acm-validations.aws
```

### Operational Note

The blocked `Invoke-RestMethod` calls came from the Copilot terminal execution policy in this environment, not from any workspace file in this repository. There are no repo-level Copilot customization or hook files present here to change that behavior.

## User Secrets Locker

This repository now includes a repo-local user secrets workflow that keeps plaintext credentials out of git while still making encrypted secrets portable across machines.

Tracked files:

- `secrets/encrypted/user-secrets.lockbox.json` stores encrypted secrets that can be committed and synced.
- `secrets/templates/user-secrets.template.json` documents the supported secret structure and non-secret metadata.
- `scripts/user-secrets.mjs` provides the lock, unlock, status, and environment import commands.

Gitignored shield:

- `secrets/local/user-secrets.json` is the editable plaintext file.
- `secrets/local/.passphrase` stores the local encryption passphrase if you do not want to pass it in an environment variable.
- The `secrets/local` folder is protected by gitignore so plaintext never enters the repository history.

Commands:

```bash
npm run secrets:init
npm run secrets:init:local-passphrase
npm run secrets:status
npm run secrets:unlock
npm run secrets:lock
npm run secrets:lock:prune
npm run secrets:prune-local
npm run secrets:import-env
```

Cross-machine usage:

1. Pull the repository so the encrypted lockbox is present.
2. Provide the same passphrase on the new machine through `TOW_SECRETS_PASSPHRASE` or, if you accept the local-at-rest tradeoff, `secrets/local/.passphrase`.
3. Run `npm run secrets:unlock` to hydrate the local gitignored plaintext file.

Practical workflow:

1. `npm run secrets:init`
2. Set `TOW_SECRETS_PASSPHRASE` or, for convenience on one machine, run `npm run secrets:init:local-passphrase`.
3. `npm run secrets:unlock`
4. Edit or import secrets locally.
5. `npm run secrets:lock:prune` to update the tracked ciphertext and remove local plaintext afterward.

Current security hardening:

- `package.json` now overrides `undici` to `^7.24.5` so the dependency tree does not stay pinned to the vulnerable `7.22.0` version pulled in by `@angular/build`. This override should be re-evaluated after each Angular major upgrade — run `npm audit` to check whether the upstream package has resolved the issue so the override can be removed.

## Runtime Config & Secrets

`public/runtime-config.js` is **generated** at build time by `scripts/generate-runtime-config.mjs` and is listed in `.gitignore`. It must never be committed to the repository because it contains live endpoint URLs pulled from secrets.

Required Amplify environment variables (set in Amplify Console → App settings → Environment variables for the `main` branch):

| Variable | Purpose |
|---|---|
| `APPSYNC_CMS_ENDPOINT` | AppSync GraphQL endpoint URL |
| `APPSYNC_CMS_API_KEY` | AppSync public-read API key |
| `APPSYNC_CMS_REGION` | AWS region (e.g. `us-east-2`) |
| `EASYPEASY_CHAT_URL` | Easy-Peasy bot embed URL |
| `SEVERE_WEATHER_SIGNUP_API_ENDPOINT` | Lambda Function URL for alert signup |
| `SEVERE_WEATHER_SIGNUP_ENABLED` | `true` / `false` |
| `LOG_ENDPOINT` | Frontend log ingest endpoint |
| `CONTACT_UPDATE_API_ENDPOINT` | Lambda Function URL for contact updates |
| `CLERK_SETUP_AWS_ACCOUNT_ID` | Town AWS account ID shown on the clerk setup page |
| `CLERK_SETUP_AMPLIFY_APP_ID` | Amplify app ID used for the clerk setup links |
| `CLERK_SETUP_AWS_REGION` | AWS region used to build clerk setup console links |
| `CLERK_SETUP_AWS_CONSOLE_URL` | Optional direct AWS console URL for the clerk setup page |
| `CLERK_SETUP_STUDIO_URL` | Optional direct Amplify Studio URL for the clerk setup page |

If a variable is missing, `generate-runtime-config.mjs` silently falls back to an empty string; the feature that depends on it will degrade gracefully rather than break the build.

## Easy-Peasy Chatbot

The site can now load the Easy-Peasy chatbot from deployment-time runtime config instead of hardcoding a bot URL into the Angular app shell.

How it works:

- `public/runtime-config.js` stores the browser-safe chatbot settings.
- `public/easy-peasy-loader.js` injects the Easy-Peasy widget only when a chatbot URL is configured.
- `npm start` and `npm run build` both regenerate `public/runtime-config.js` before Angular starts.

Configuration sources:

- `EASYPEASY_CHAT_URL`
- Optional `EASYPEASY_BUTTON_POSITION`
- `secrets/local/user-secrets.json -> chatbot.easyPeasy.chatUrl`

Amplify setup:

1. Create the bot in Easy-Peasy and copy the bot URL.
2. Add `EASYPEASY_CHAT_URL` as an Amplify environment variable for the `main` branch.
3. Redeploy. If the value is present, the widget loads automatically on every page.

If no chatbot URL is configured, the site renders normally and no Easy-Peasy script is injected.

## Amplify Studio CMS

Homepage publishing now relies on Amplify Studio and AppSync. The old browser-local CMS workflow has been disabled.

Plain-language source of truth for staff:

- Daily editing path: Amplify Studio Data Manager
- Clerk handoff page: `/clerk-setup`
- `/admin` route: read-only guide and status page only
- Non-technical instructions: `CLERK-CMS-GUIDE.md`

The `/admin` page now includes a direct Amplify Studio Data Manager link plus a quick-reference copy of the clerk instructions, so staff can jump straight into CMS editing without navigating the AWS dashboard first.

## Developer Notifications

The repo now includes a scheduled site monitor that emails `bigessfour@gmail.com` when the public site or CMS API stops behaving normally.

What it checks:

- `https://townofwiley.gov/`
- `https://townofwiley.gov/weather`
- `https://townofwiley.gov/notices`
- `https://townofwiley.gov/meetings`
- `https://townofwiley.gov/services`
- `https://townofwiley.gov/records`
- `https://townofwiley.gov/businesses`
- `https://townofwiley.gov/news`
- `https://townofwiley.gov/contact`
- `https://townofwiley.gov/accessibility`
- `https://townofwiley.gov/documents`
- `https://townofwiley.gov/admin`
- `https://townofwiley.gov/clerk-setup`
- the AppSync CMS endpoint from `src/amplifyconfiguration.json`

Deployment and test scripts:

```bash
npm run test:infra:monitor
npm run deploy:site-monitor
```

Operational logging note:

- CloudFront access logs are useful for edge-level request patterns, scanner traffic, and status-code spikes, but they do not prove that the correct resident-facing page content rendered.
- The frontend logger reads `LOG_ENDPOINT` into `public/runtime-config.js`, but that value must point to a dedicated log-ingest service. Do not point it at the severe-weather signup API unless that backend explicitly implements a `/log` route.
- The site monitor is the primary route-level guardrail for catching real public-page regressions.

## Site language

The public site now defaults to English and exposes a runtime language switch so residents can move between Spanish and English without a rebuild.

Current implementation notes:

- The selected language is persisted in browser storage under `tow-site-language`.
- The public shell, weather panel chrome, AI assistant chrome, and `/admin` operations route all switch languages at runtime.
- Homepage CMS content is localized in the frontend with bundled Spanish fallbacks and known-text mappings layered over the current single-language AppSync models.
- If Amplify Studio content changes to brand-new English text that is not yet covered by the translation map, that field will fall back to English until the mapping is updated or bilingual CMS fields are introduced.

Plain-language staff guide:

- See [CLERK-CMS-GUIDE.md](CLERK-CMS-GUIDE.md) for the current staff workflow.

Current scope:

- Publishing surface: Amplify Studio Data Manager
- Public read path: AppSync GraphQL API with a runtime-injected read key
- Homepage and operations models in use: `SiteSettings`, `AlertBanner`, `Announcement`, `Event`, `OfficialContact`, `EmailAlias`
- `/admin` route: read-only operations page that points maintainers to Amplify Studio

Runtime configuration sources for the public CMS read path:

- `APPSYNC_CMS_REGION`
- `APPSYNC_CMS_ENDPOINT`
- `APPSYNC_CMS_API_KEY`
- `secrets/local/user-secrets.json -> cms.appSync`

Operational notes:

- Homepage content should be changed in Amplify Studio, not in the browser.
- The site falls back to bundled homepage content if AppSync runtime config is missing or the CMS request fails.
- The repo secrets workflow now carries the AppSync endpoint and public read key in the encrypted lockbox for future maintainers.

## Public document hub

The public site now includes a resident-facing document hub at `/documents`.

Current implementation status:

- The homepage records center, transparency actions, selected search results, and meeting-related calls to action now route residents into stable public document destinations instead of generic section anchors.
- The `/documents` page is organized into four resident-facing destinations:
  - records requests
  - meeting documents
  - financial documents
  - code references
- The `/documents` page now includes a first-pass downloadable archive with stable public files under `/documents/archive`.
- Archive publishing is now driven by a central manifest in `src/app/document-hub/document-archive.ts` plus static public files under `public/documents/archive`.
- Maintainers now have a repo guide for the publishing workflow in `docs/town-document-publishing-guide.md`.
- This is still not a CMS-managed document library yet. Official packets, budgets, ordinances, and reports still need to be posted through the new workflow as those files become available.

Traceability:

- `src/app/document-hub/document-links.ts`
- `src/app/document-hub/document-archive.ts`
- `src/app/document-hub/document-hub.ts`
- `src/app/records-center/records-center.ts`
- `docs/town-document-publishing-guide.md`
- `src/app/app.ts`
- `docs/incomplete-items-reference.md`

## Utility Payments

The Town's preferred utility payment rollout path is now Paystar because it best fits the current RVS Mosaics setup and can be incorporated into the AWS Amplify-hosted site with the least friction.

Current implementation status:

- The public payment card still supports billing-help email as the fallback path.
- A Paystar runtime-config scaffold now exists for the resident-services payment card.
- A small town-managed proxy scaffold now exists so the website can keep a stable launch contract while the live processor configuration is finalized.
- The current scaffold is intentionally hosted-first because Paystar's public utility documentation clearly supports linking an existing website into a hosted payment portal, while vendor-specific secret API details are not published publicly.

Traceability:

- `src/app/payments/paystar-config.ts`
- `src/app/payments/paystar-connection.ts`
- `src/app/resident-services/resident-services.ts`
- `infrastructure/paystar-proxy/index.mjs`
- `docs/incomplete-items-reference.md`

Runtime configuration sources:

- `PAYSTAR_MODE`
- `PAYSTAR_PORTAL_URL`
- `PAYSTAR_API_ENDPOINT`
- `secrets/local/user-secrets.json -> payments.paystar`

Supported modes:

- `none`: keep the resident-facing payment card on staff-help fallback only
- `hosted`: open the secure Paystar portal directly from the homepage card
- `api`: call a town-managed endpoint first, then launch the returned Paystar URL

Recommended near-term deployment path:

1. Set `PAYSTAR_MODE=hosted`.
2. Set `PAYSTAR_PORTAL_URL` to the Town's live Paystar payment page.
3. Redeploy Amplify so the homepage payment card exposes the secure Paystar action.
4. Keep the proxy scaffold for a later phase if the Town wants a deeper server-side launch or receipt workflow.

Operational note:

- The current proxy scaffold does not attempt a direct private vendor integration. It normalizes the launch contract on the Town side and can later be extended once live Paystar credentials, posting behavior, and any non-public API details are confirmed.

## Town Email Aliases

The Town mail-routing path should use AWS-managed forwarding rather than personal mailbox rules so `townofwiley.gov` addresses stay under Town control even when the staff member's current inbox changes.

Selected AWS method:

- Receive inbound town mail through Amazon SES.
- Store the raw inbound message in S3.
- Trigger a Lambda forwarder from the S3 object-created event.
- Look up the destination inbox from a private Amplify Studio `EmailAlias` record.
- Forward the message to the staff member's current inbox by SES using a verified Town sender.

Why this is the best fit here:

- It supports alias-style forwarding such as `steve.mckitrick@townofwiley.gov -> bigessfour@gmail.com` without moving staff into a new mailbox system first.
- The routing data can be managed in Amplify Studio by adding or updating `EmailAlias` records.
- Public contact cards can stay in `OfficialContact`, while forwarding destinations remain private and are never exposed through the public API key.
- The Lambda forwarder keeps the logic in AWS, so the Town can later swap destination inboxes without editing Route 53 records or personal Gmail rules.

Important scope note:

- This scaffold is for inbound forwarding first.
- If the Town later wants staff to send mail as `townofwiley.gov` from Gmail or another client, that should be handled separately with SES SMTP or Amazon WorkMail after forwarding is stable.
- SES inbound receiving may need to live in an AWS region that supports email receiving even if the rest of the site stays in `us-east-2`.

Current live SES status in Ohio:

- The `townofwiley.gov` domain identity is verified in Amazon SES `us-east-2`.
- Easy DKIM is active and the Route 53 hosted zone now carries the SES DKIM CNAME records for the domain.
- The SES account in `us-east-2` is no longer sandbox-limited.
- Current Ohio SES sending quotas are `50,000` messages per 24 hours and `14` messages per second.
- The current SES account details in `us-east-2` report `MailType=TRANSACTIONAL` and `WebsiteURL=http://townofwiley.gov`.

What this means now:

- Outbound Town mail through SES in `us-east-2` is available.
- The live alias router is now configured to forward mail using `steve.mckitrick@townofwiley.gov` as the sender.
- The remaining mail work is now primarily bucket hardening, rollout of the rest of the alias records, and live end-to-end mail validation.
- The `EmailAlias` backend model is now deployed on the live AppSync API and its current main-environment DynamoDB table is `EmailAlias-j7b2x3sh7rcezekekkxxiak7hi-main`.
- The alias router now supports split-region operation so inbound processing can run in an SES-receiving region such as `us-east-1` while forwarded outbound mail continues through the verified `us-east-2` SES sender.
- The first-pass alias router infrastructure is now deployed with Lambda `TownOfWileyEmailAliasRouter`, IAM role `TownOfWileyEmailAliasRouterRole`, S3 bucket `townofwiley-email-alias-570912405222-us-east-1`, and active SES receipt rule set `TownOfWileyAliasForwarding` in `us-east-1`.
- Route 53 now publishes `townofwiley.gov MX 10 inbound-smtp.us-east-1.amazonaws.com` and the change is fully in sync.
- The first live `EmailAlias` record is active for `steve.mckitrick@townofwiley.gov -> bigessfour@gmail.com`.
- The current AWS principal could not apply `s3:PutBucketPublicAccessBlock`, so that bucket-hardening step still needs to be completed by a principal with that permission.

CMS model split:

- `OfficialContact`: public role, label, detail, and public alias email shown on the website
- `EmailAlias`: private alias-to-destination mapping used only by the forwarding worker

`EmailAlias` model fields:

- `aliasAddress`
- `destinationAddress`
- `displayName`
- `roleLabel`
- `active`
- `notes`

Traceability:

- `amplify/backend/api/townofwiley/schema.graphql`
- `src/app/cms-admin/cms-admin.ts`
- `src/app/cms-admin/cms-admin.html`
- `infrastructure/email-alias-router/app.py`
- `infrastructure/email-alias-router/tests/test_app.py`
- `scripts/deploy-email-alias-router.py`
- `docs/town-email-alias-forwarding-runbook.md`
- `docs/incomplete-items-reference.md`

Recommended deployment shape:

1. Apply S3 public-access-block settings on `townofwiley-email-alias-570912405222-us-east-1` with a principal that has `s3:PutBucketPublicAccessBlock`.
2. Add the remaining `EmailAlias` records in Amplify Studio for each Town mailbox alias.
3. Send live test mail to each alias before staff relies on it.

Repo-backed deployment path:

- Fill in the `mail.aliasForwarding` section in `secrets/local/user-secrets.json`.
- Run `npm run deploy:email-alias-router`.
- Follow the operator steps in [docs/town-email-alias-forwarding-runbook.md](docs/town-email-alias-forwarding-runbook.md).

Required Lambda environment variables:

- `EMAIL_ALIAS_TABLE`
- Optional `EMAIL_ALIAS_TABLE_REGION` when the EmailAlias table lives outside the Lambda region
- Optional `EMAIL_ALIAS_INDEX_NAME` with default `byAliasAddress`
- `FORWARDER_FROM`
- Optional `ALIAS_DOMAIN` with default `townofwiley.gov`

Current first live alias:

- Public alias: `steve.mckitrick@townofwiley.gov`
- Current destination inbox: `bigessfour@gmail.com`

Validation command:

```bash
npm run test:infra:mail
```

## NWS Weather Proxy

The homepage weather panel now supports two modes:

- Direct browser requests to `api.weather.gov` for local development and simple fallback behavior.
- A Town of Wiley AWS proxy endpoint for production, which is the preferred path because NWS expects a meaningful `User-Agent` header that browsers cannot set.

Runtime configuration sources:

- `NWS_PROXY_ENDPOINT`
- Optional `NWS_ALLOW_BROWSER_FALLBACK`
- `secrets/local/user-secrets.json -> weather.nws.apiEndpoint`
- `secrets/local/user-secrets.json -> weather.nws.allowBrowserFallback`

Maintainer reference values for this site:

- Town: Wiley, Colorado
- ZIP code: `81092`
- Primary display location used in the UI: `Wiley, CO`
- Point lookup used by the frontend and proxy: `38.154,-102.72`
- Forecast page link used by the UI: `https://forecast.weather.gov/MapClick.php?lat=38.155356&lon=-102.719248`
- Forecast zone used for alert filtering: `COZ098`
- Zone label from NWS: `Lamar Vicinity / Prowers County`
- Current design intent: treat `COZ098` as the practical Wiley service area, which covers Wiley plus the surrounding area well beyond a 20-mile radius

Why `COZ098` matters:

- The severe-weather logic does not try to calculate a literal radius.
- The NWS zone is the official alert boundary used by the site.
- If alerts ever look wrong, verify the zone first before changing code.
- Current alert endpoint pattern:

```text
https://api.weather.gov/alerts/active?zone=COZ098
```

Core operational files:

- Frontend weather component: [src/app/weather-panel/weather-panel.ts](src/app/weather-panel/weather-panel.ts)
- Frontend weather template: [src/app/weather-panel/weather-panel.html](src/app/weather-panel/weather-panel.html)
- AWS weather proxy handler: [infrastructure/nws-weather-proxy/index.mjs](infrastructure/nws-weather-proxy/index.mjs)
- Runtime config generator: [scripts/generate-runtime-config.mjs](scripts/generate-runtime-config.mjs)
- Local/encrypted secrets workflow: [scripts/user-secrets.mjs](scripts/user-secrets.mjs)

Required runtime settings:

- Amplify environment variable: `NWS_PROXY_ENDPOINT`
- Optional Amplify environment variable: `NWS_ALLOW_BROWSER_FALLBACK`
- Lambda environment variable: `NWS_USER_AGENT`
- Optional Lambda environment variable: `NWS_API_KEY`

Current resident-facing weather UI behavior:

- The weather panel shows the forecast, active alerts, and a severe-weather signup form when `weather.alertSignup.enabled` and `weather.alertSignup.apiEndpoint` are present in runtime config.
- The signup form posts to `POST /subscriptions` on the severe-weather backend and asks residents to confirm before alerts begin.
- The resident-facing signup is currently limited to ZIP code `81092` because the backend enforces that service area.
- The checked-in runtime config currently enables this signup form and points it at the live severe-weather backend, so if the form disappears in production the first thing to verify is whether `public/runtime-config.js` was regenerated with the expected alert-signup block during the build.
- The live severe-weather backend sender is now `alerts@townofwiley.gov`, which is allowed through the verified `townofwiley.gov` SES domain identity in `us-east-2`.
- Email confirmations are working through SES, and SMS confirmations are now live through Amazon SNS in `us-east-2` with transactional SMS delivery enabled for this account.
- SES and SNS SMS are separate AWS delivery systems, so both services need to remain configured in the same deployment path.
- The severe-weather backend keeps subscription records in DynamoDB with the subscriber channel, normalized destination, full name, preferred language, ZIP code, status, and confirmation/unsubscribe tokens, so the site is already tracking who signs up.
- Scheduled alert fan-out now isolates individual send failures so one bad destination does not stop the rest of the alert run.
- The developer-only smoke-test token is stored in AWS Secrets Manager under `TownOfWileySevereWeatherDeveloperTestToken` and mirrored in the repo's encrypted secrets locker instead of being hardcoded in Lambda config.
- CloudWatch alarms are configured for both the normal alert-trigger event and delivery failures, with SNS topic notifications sent to the configured alarm recipient.
- Reusable developer-only alert smoke tests can be run against the backend with `scripts/send-developer-weather-test.py`; that route sends only to the explicit email and SMS recipients you provide and does not fan out to the subscriber table.

Recommended `NWS_USER_AGENT` format:

```text
TownOfWileyWeather/1.0 (contact: bigessfour@gmail.com)
```

AWS account and hosting identifiers that future maintainers will need:

- AWS account ID: `570912405222`
- AWS region: `us-east-2`
- Amplify app ID: `d331voxr1fhoir`
- Amplify app name: `Townofwiley`
- Production branch: `main`
- Static build output: `dist/townofwiley-app/browser`

Expected runtime behavior:

1. If `NWS_PROXY_ENDPOINT` is set, the weather panel uses the AWS proxy.
2. If the proxy fails and browser fallback is enabled, the site retries against public `api.weather.gov`.
3. If the proxy fails and browser fallback is disabled, the site shows an error state and links residents to the full forecast page.

Common failure points and what to verify:

1. No weather data appears at all:
   Check that `public/runtime-config.js` contains the expected `weather` block after build or deploy.
2. Proxy returns errors:
   Check that the Lambda has `NWS_USER_AGENT` set and that the string still includes a valid maintainer contact.
3. Alerts look too broad or too narrow:
   Reconfirm that Wiley is still being mapped to `COZ098` and that NWS has not changed the point-to-zone mapping.
4. Browser works locally but production fails:
   Verify `NWS_PROXY_ENDPOINT` in Amplify and confirm the deployed proxy URL still responds with JSON.
5. Tests fail only on mobile:
   Check the Playwright smoke suite first; mobile interactions are covered there specifically for chat and weather refresh.

Useful manual verification URLs:

- Point metadata: `https://api.weather.gov/points/38.154,-102.72`
- Active alerts for Wiley area: `https://api.weather.gov/alerts/active?zone=COZ098`
- Public forecast page: `https://forecast.weather.gov/MapClick.php?lat=38.155356&lon=-102.719248`
- National forecast maps: `https://www.weather.gov/forecastmaps`

Production recommendation:

1. Deploy `infrastructure/nws-weather-proxy/index.mjs` as an AWS Lambda-backed HTTP endpoint.
2. Set `NWS_USER_AGENT` on that function.
3. Set `NWS_PROXY_ENDPOINT` in Amplify so the Angular app uses the AWS proxy instead of direct browser requests.
4. Leave browser fallback enabled only if you want a safety net during rollout.

## Severe Weather Signup Backend

The repository now includes a Python AWS backend for resident severe weather signups, confirmation links, unsubscribe handling, and scheduled NWS alert fanout for Wiley service area residents.

Core backend files:

- Signup Lambda handler: [infrastructure/severe-weather-signup/app.py](infrastructure/severe-weather-signup/app.py)
- Lambda entrypoint shim: [infrastructure/severe-weather-signup/index.py](infrastructure/severe-weather-signup/index.py)
- Backend tests: [infrastructure/severe-weather-signup/tests/test_app.py](infrastructure/severe-weather-signup/tests/test_app.py)
- Deployment script: [scripts/deploy-severe-weather-backend.py](scripts/deploy-severe-weather-backend.py)
- Frontend signup form logic: [src/app/weather-panel/weather-panel.ts](src/app/weather-panel/weather-panel.ts)
- Frontend signup form template: [src/app/weather-panel/weather-panel.html](src/app/weather-panel/weather-panel.html)

Service contract:

- Allowed resident ZIP code: `81092`
- NWS alert zone: `COZ098`
- Supported notification channels: `email` and `sms`
- Supported alert languages: `en` and `es`
- Public routes:
  - `POST /subscriptions`
  - `GET /confirm`
  - `GET /unsubscribe`
  - `GET /health`
- Scheduled route source: EventBridge `rate(5 minutes)` by default

Required AWS resources created by the deploy script:

- Lambda function running on `python3.13`
- Lambda Function URL with public unauthenticated access
- DynamoDB subscriptions table
- DynamoDB delivery deduplication table
- EventBridge schedule for repeated alert polling
- IAM role with Lambda basic execution, DynamoDB access, SNS publish, SES send permissions, and Amazon Translate `TranslateText`

Live backend identifiers at last successful deployment:

- Lambda function name: `TownOfWileySevereWeatherBackend`
- Lambda role: `arn:aws:iam::570912405222:role/TownOfWileySevereWeatherRole`
- Public Function URL: `https://myqlw4fgzf5hwnes5ki2msye2m0bbbue.lambda-url.us-east-2.on.aws`
- Subscriptions table: `TownOfWileySevereWeatherSubscriptions`
- Deliveries table: `TownOfWileySevereWeatherDeliveries`
- EventBridge rule name: `TownOfWileySevereWeatherPoller`
- Current sender email: `bigessfour@gmail.com`
- Current notification sender name: `Town of Wiley Alerts`
- Current NWS user agent: `TownOfWileyWeather/1.0 (contact: bigessfour@gmail.com)`
- Current allowed ZIP code: `81092`
- Current alert zone: `COZ098`

Amplify branch settings related to alert signup at last successful deployment:

- `SEVERE_WEATHER_SIGNUP_API_ENDPOINT=https://myqlw4fgzf5hwnes5ki2msye2m0bbbue.lambda-url.us-east-2.on.aws`
- `SEVERE_WEATHER_SIGNUP_ENABLED=true`

Operational warning for future maintainers:

- If email confirmations suddenly stop working, verify the SES identity status for `bigessfour@gmail.com` in `us-east-2` first.
- If the Function URL starts returning `403`, check both Lambda resource-policy statements for Function URL access before changing app code.
- The current IAM user still lacks `events:DescribeRule`, so deployment verification from this workspace may not be able to read back the EventBridge rule even when the scheduler itself already exists.

Required runtime and secret settings:

- Lambda environment variables:
  - `SUBSCRIPTIONS_TABLE`
  - `DELIVERIES_TABLE`
  - `SENDER_EMAIL`
  - `NOTIFICATION_SENDER_NAME`
  - `ALLOWED_ZIP_CODE`
  - `ALERT_ZONE_CODE`
  - `PUBLIC_API_BASE_URL`
  - `NWS_USER_AGENT`
  - Optional `NWS_API_KEY`
- Amplify branch environment variables:
  - `SEVERE_WEATHER_SIGNUP_API_ENDPOINT`
  - `SEVERE_WEATHER_SIGNUP_ENABLED`
- Repo-local secrets support:
  - `weather.alertSignup.enabled`
  - `weather.alertSignup.apiEndpoint`
  - `weather.alertSignup.senderEmail`

Deployment flow:

1. Unlock or import repo-local secrets so AWS credentials, Amplify app ID, and NWS sender values are available.
2. Ensure the sender address you plan to use in `SENDER_EMAIL` is verified in SES for `us-east-2`.
3. Run `npm run deploy:severe-weather-backend`.
4. The script packages the Python backend, creates or updates the Lambda function, creates the Function URL, provisions DynamoDB tables, configures the EventBridge poller, updates the Amplify branch environment, and starts an Amplify release unless skipped.

Optional deployment flags:

```bash
python scripts/deploy-severe-weather-backend.py --skip-amplify-release
python scripts/deploy-severe-weather-backend.py --sender-email alerts@townofwiley.gov
python scripts/deploy-severe-weather-backend.py --branch-name main
```

Operational notes:

- The deploy script reads AWS credentials and default metadata from `secrets/local/user-secrets.json` when environment variables are not already set.
- The weather signup form now lets residents choose English or Spanish alerts. The backend stores that preference and uses Amazon Translate `translate_text` for Spanish confirmation and alert delivery, while preserving confirmation and unsubscribe URLs.
- The script updates Amplify `main` branch environment values to keep the Angular runtime config aligned with the live backend URL.
- Email confirmation and alert delivery will remain blocked until the configured SES sender identity is verified.
- SMS sending uses SNS directly, so destination-country and spend-limit policies still apply in the AWS account.

## Regression Testing

The weather integration is now covered at three layers:

- Angular browser unit tests for direct NWS, proxy mode, and proxy fallback.
- Node-level proxy tests for the AWS handler.
- Playwright smoke coverage for homepage weather rendering, severe-weather signup, and refresh behavior.

Commands:

```bash
npm run test:unit:browser
npm run test:infra
npm run test:infra:alerts
npm run test:e2e:smoke
npm run test:regression
```

Mobile-specific regression coverage now checks:

- Programmatic chat submission on the mobile homepage
- Chat fallback handling when the proxy returns malformed data
- Weather refresh behavior on the mobile homepage without a full page reload

## Trunk Hook

This repository now includes a tracked Git `pre-push` hook at [.githooks/pre-push](.githooks/pre-push).

Behavior:

- Runs Trunk formatting across tracked repository files before every push.
- Allows the push to continue only if Trunk leaves the tracked file set unchanged.
- Aborts the push if formatting changed any tracked file so the formatted result can be reviewed and committed first.

One-time setup for each clone:

```bash
git config core.hooksPath .githooks
```

Manual verification:

```bash
trunk fmt --all
```

Operational note:

- The hook requires the Trunk CLI to be installed and on `PATH`.
- The current repo-local Trunk configuration lives in [.trunk/trunk.yaml](.trunk/trunk.yaml).
