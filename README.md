# Town of Wiley — Official Municipal Website

**Live site:** [townofwiley.gov](https://townofwiley.gov)

The official, bilingual (English/Spanish) website for the Town of Wiley, Colorado — built and operated as a modern, low-cost, serverless municipal platform.

| Area             | Stack                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Frontend         | Angular 21 (standalone components, signals, OnPush), PrimeNG, SCSS design tokens                         |
| Hosting          | AWS S3 + CloudFront (OIDC-authenticated GitHub Actions deploys, CloudFront Functions for SPA routing)    |
| Content (CMS)    | AWS AppSync (GraphQL) + DynamoDB; in-app clerk editor at `/admin` with Cognito staff auth                |
| Backend services | AWS Lambda (weather proxy, payments proxy, contact updates, email alias routing)                         |
| Quality          | Vitest unit tests, Playwright e2e (smoke + regression), Trunk lint/format, WCAG AA accessibility         |
| CI/CD            | GitHub Actions (required CI gate, automatic production deploy on merge to `main`), Ansible orchestration; advisory Ollama PR/CI triage ([docs/ci-ollama-review.md](docs/ci-ollama-review.md)); ops observability ([docs/ops-observability.md](docs/ops-observability.md)) |

Key design goals: **non-technical clerks manage all content in-app** (no AWS console required), offline-first content caching for residents, and free-tier-friendly AWS architecture.

## Git Workflow

- Production deploys: **merges to `main` auto-deploy** after Site CI passes (S3 + CloudFront via GitHub Actions OIDC). Manual `npm run deploy:site` is break-glass only.
- Use short-lived feature branches and merge into `main` only when the change is build-safe.
- Keep deployable app changes in `src/`, `public/`, `package*.json`, `angular.json`, `tsconfig*`, and `scripts/generate-runtime-config.mjs`.
- Keep maintainer-facing docs and runbooks tracked in the repo under `docs/`, `README.md`, `CLERK-CMS-GUIDE.md`, `bot-training/`, and related operational paths.
- Do not commit local reports, temp logs, or machine-specific artifacts.
- GitHub Actions validates deployable paths (CSP parity, etc.). Production static hosting is S3 + CloudFront (see below).
- GitHub Actions uses targeted caches for npm, Playwright browsers, and Angular CLI build artifacts.

Detailed policy: [docs/git-workflow.md](docs/git-workflow.md)

Branch protection and required CI gate: [docs/github-branch-protection.md](docs/github-branch-protection.md)

## Runtime Baseline

- **Node.js `24.x` LTS only** for this app (Amplify, GitHub Actions, and `package.json` / `ensure-node-version` agree). **`engines.node` is `>=24.15.0 <25.0.0`** (with `.npmrc` `engine-strict=true`). Repo files pin **`24.16.0`** (`.nvmrc`, `.node-version`, **`volta`**, **`mise.toml`**, **asdf** `.tool-versions`) — see **[`docs/NODE_VERSION.md`](docs/NODE_VERSION.md)** for why the pin is an exact patch (not “whatever LTS says today”). **Do not use Node 22, 23, 25+, or odd majors** — Node 25+ has caused toolchain and native dependency issues with this stack.
- Use `nvm install && nvm use` (reads `.nvmrc`), **`mise install`**, **Volta**, **asdf**, Homebrew **`node@24`**, Windows **`.\scripts\setup-repo-node.ps1`**, or **Docker `node:24-slim`** (see [`docs/NODE_VERSION.md`](docs/NODE_VERSION.md) § Docker) so your shell `node` matches CI.

**Homebrew (recommended on macOS)** — install the LTS keg and make it the default `node` (the top-level `node` formula tracks the latest major, often v25+):

```bash
brew install node@24
brew unlink node       # only if `node -v` shows v25+ from /opt/homebrew/bin/node
brew link --overwrite --force node@24
hash -r
node -v   # expect v24.16.0 (matches .nvmrc)
```

If Homebrew relinks `node` to a newer major after `brew upgrade`, run **`brew unlink node && brew link --overwrite --force node@24`** again.

**nvm / fnm** (from repo root, reads `.nvmrc`):

```bash
nvm install && nvm use
node -v   # v24.16.0 (or any 24.15+ satisfying engines)
```

## Deployment Record — Current (June 2026+)

### S3 + CloudFront (Primary Hosting)

Frontend is statically hosted on S3 + CloudFront (Amplify Hosting app `d331voxr1fhoir` was permanently deleted after migration).

- **S3 bucket (origin):** `townofwiley-static-site` (us-east-2)
- **CloudFront distribution:** ID `E1NZ3XCY5CYR1J` → `d34qrz3qxoppc5.cloudfront.net`
  - Origin: S3 `townofwiley-static-site` (OAI; OAC E1UXALBLRIDL2E prepared + bucket policy updated for migration; complete in console if needed)
  - Viewer request Function: `townofwiley-spa-redirect` (handles Angular SPA deep links / 403→index.html rewrite)
  - Aliases: `townofwiley.gov`, `www.townofwiley.gov`
  - ACM certificate: `arn:aws:acm:us-east-1:570912405222:certificate/a7d4c19b-070a-478b-9f3a-7203e53fcf90` (us-east-1)
  - Default root: (none; SPA handled by function + pre-generated static route entrypoints)
- **DNS (Route 53, zone `Z088746831TMIL67NZ0VF` for `townofwiley.gov`):**
  - `townofwiley.gov` → A alias → `d34qrz3qxoppc5.cloudfront.net`
  - `www.townofwiley.gov` → A alias → `d34qrz3qxoppc5.cloudfront.net`
- **AWS account:** `570912405222` only. Default profile **`townofwiley`** (see `.vscode/settings.json`).
- **Build output:** `dist/townofwiley-app/browser` (same as before; `scripts/generate-static-route-entrypoints.mjs` populates route folders + 404.html for SPA).
- **Migration status (June 2026):** Frontend fully moved from Amplify Hosting (app `d331voxr1fhoir` deleted) to S3 + CloudFront. Site restored and hardened on 2026-06-02 after discovering artifacts were under `/browser/` prefix instead of bucket root. CustomErrorResponses added to prevent raw S3 errors. See git history around this date for details.
- **Deploy steps:**
  - **Automatic (normal):** merge to `main` with deployable app changes → Site CI builds and uploads artifact → `deploy-production` syncs to S3 + CloudFront invalidation. See [`docs/github-actions-production-deploy.md`](docs/github-actions-production-deploy.md).
  - **Manual (break-glass):**

  ```bash
  # From repo root with AWS_PROFILE (see scripts/agent-aws-env.sh)
  npm run deploy:site
  # or: bash scripts/deploy-static-site.sh
  # dry-run: npm run deploy:site:dry
  # GitHub: Actions → Deploy production (manual) on main
  ```

  For full orchestrated deploys (frontend + lambdas + IAM policy application from `infrastructure/iam/` JSONs + verification), use the Ansible entrypoints (now the consistent pipeline path):

  ```bash
  npm run ansible:deploy            # full (or -- --tags frontend etc.)
  npm run ansible:deploy:frontend
  npm run ansible:verify
  npm run ansible:check             # syntax/inventory validation (no AWS)
  ```

  The `scripts/ansible-deploy.sh` wrapper + root `ansible.cfg` hide sourcing and config details. See `ansible/README.md` and `package.json` scripts.

  The helper applies tiered Cache-Control (immutable for assets, no-cache for HTML/runtime-config) + invalidation.
  **Critical:** Output must be at the S3 **bucket root** (no `browser/` prefix). CloudFront origin has no OriginPath.
  Current hosting uses managed CachingOptimized policy + custom Response Headers Policy (CSP + security headers from customHttp.yml) + access logging. See manifest for IDs. OAC migration prepared (see SOT).

- **Hardening (applied June 2026):** CustomErrorResponses configured on the distribution so 403/404 serve `/index.html` (HTTP 200). This prevents raw S3 XML errors from ever being shown to visitors again.

- **Runtime config:** Served as static `runtime-config.js` from the S3 bucket (generated at build or via `scripts/generate-runtime-config.mjs` using current env / secrets).
- **CSP / headers:** Managed at CloudFront (or S3 origin) + `customHttp.yml` kept for dev server parity (`ng serve`) and historical reference. See `docs/third-party-csp-registry.md`.

**SPA routing note:** The CloudFront Function + static entrypoints ensure `/weather`, `/notices/foo`, etc. serve `index.html` (200) for client-side routing.

**Verification (live):**

```bash
curl -I https://townofwiley.gov/          # 200 + security headers
curl -I https://townofwiley.gov/weather   # 200 (SPA rewrite)
nslookup townofwiley.gov
```

### Historical Amplify Hosting (Decommissioned)

Old app ID `d331voxr1fhoir`, old targets (`d3fmdu29qcwosh.cloudfront.net`, `*.amplifyapp.com`) are no longer used. The `amplify.yml`, many `scripts/sync-amplify-*` scripts, and `docs/AMPLIFY_HOSTING_SOT.md` are retained **only** for build process reference, CSP patterns (now also in CloudFront Response Headers Policy), and legacy context. Hosting sync scripts are no-ops for prod. See deprecation notes in `docs/AWS_INFRASTRUCTURE_SOT.md` and `docs/AMPLIFY_HOSTING_SOT.md`. Current: S3+CF with managed cache policy, custom security/CSP headers policy, and logging (see manifest + this section).

### Route 53 (unchanged)

- Hosted zone: `townofwiley.gov`, ID `Z088746831TMIL67NZ0VF`
- Authoritative NS: `ns-360.awsdns-45.com`, `ns-1383.awsdns-44.org`, `ns-1718.awsdns-22.co.uk`, `ns-530.awsdns-02.net`

### AWS infrastructure (IaC SSOT)

Custom Lambdas, AppSync, DynamoDB, and remaining backends are defined in the repo and checked against live AWS (account **`570912405222`**, region **`us-east-2`**).

| Resource                                                  | SSOT in repo                                                                                                                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expected Lambdas, DynamoDB, S3, Function URL **AuthType** | [`infrastructure/aws-infrastructure.manifest.json`](infrastructure/aws-infrastructure.manifest.json)                                                                                                 |
| Amplify Gen2 / backend env var **names** (no secrets)     | [`infrastructure/amplify-branch-env.manifest.json`](infrastructure/amplify-branch-env.manifest.json) (still relevant for runtime-config and any remaining Amplify-managed AppSync/Cognito resources) |
| Hosting build + CSP origins + SPA rules                   | [`customHttp.yml`](customHttp.yml) (CSP SSOT for dev parity), [`docs/third-party-csp-registry.md`](docs/third-party-csp-registry.md), `scripts/generate-static-route-entrypoints.mjs`                |
| Operator runbook + deploy order                           | [`docs/AWS_INFRASTRUCTURE_SOT.md`](docs/AWS_INFRASTRUCTURE_SOT.md)                                                                                                                                   |
| Full product / AP tracker                                 | [`docs/post-development-inventory.md`](docs/post-development-inventory.md)                                                                                                                           |

**Verify live AWS matches the manifest:**

```bash
npm run verify:aws-infra
```

**Deploy contact / chatbot backends (after code review):**

```bash
python scripts/deploy-*.py   # see individual scripts
```

**Recent infra changes (June 2026):**

- Full migration of frontend hosting from Amplify to S3 `townofwiley-static-site` + CloudFront `E1NZ3XCY5CYR1J`.
- Legacy Amplify app `d331voxr1fhoir` deleted.
- Wiley Widget (Aurora, NAT, App Runner, separate Amplify app) fully decoupled and removed.
- All WAF rate-limit WebACLs removed; CloudWatch retention minimized to 1 day.
- Costs now free-tier safe. See [`docs/aws-cost-optimization-runbook.md`](docs/aws-cost-optimization-runbook.md) for details.

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

| Variable                             | Purpose                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `APPSYNC_CMS_ENDPOINT`               | AppSync GraphQL endpoint URL                                                                    |
| `APPSYNC_CMS_API_KEY`                | AppSync public-read API key                                                                     |
| `APPSYNC_CMS_REGION`                 | AWS region (e.g. `us-east-2`)                                                                   |
| `EASYPEASY_CHAT_URL`                 | Easy-Peasy bot embed URL                                                                        |
| `SEVERE_WEATHER_SIGNUP_API_ENDPOINT` | Lambda Function URL for alert signup                                                            |
| `SEVERE_WEATHER_SIGNUP_ENABLED`      | `true` / `false`                                                                                |
| `LOG_ENDPOINT`                       | Frontend log ingest endpoint                                                                    |
| `CONTACT_UPDATE_API_ENDPOINT`        | Lambda Function URL for contact updates (write)                                                 |
| `CONTACT_UPDATE_REVIEW_API_URL`      | JWT-protected staff review API for `/admin#updates`                                             |
| `CONTACT_UPDATE_REVIEW_PROXY_URL`    | **Deprecated** public proxy (use review API URL instead)                                        |
| `CLERK_SETUP_AWS_ACCOUNT_ID`         | Town AWS account ID shown on the unified `/admin` CMS hub                                       |
| `CLERK_SETUP_AMPLIFY_APP_ID`         | Amplify app ID used for the `/admin` CMS hub links                                              |
| `CLERK_SETUP_AWS_REGION`             | AWS region used to build `/admin` console links                                                 |
| `CLERK_SETUP_AWS_CONSOLE_URL`        | Optional direct AWS console URL for the `/admin` CMS hub                                        |
| `CLERK_SETUP_STUDIO_URL`             | Optional override for the AppSync Queries console URL shown under **Advanced (IT)** on `/admin` |

**Production builds are strict:** `npm run prebuild` / Amplify / GitHub Actions require every key in [`infrastructure/amplify-branch-env.manifest.json`](infrastructure/amplify-branch-env.manifest.json) (`requiredForProduction`). Missing vars fail the build with a clear error. Local `npm start` still allows empty values for optional dev work.

Verify live CMS after deploy: `npm run verify:runtime-config-cms`. API key rotation: [`docs/appsync-api-key-rotation-runbook.md`](docs/appsync-api-key-rotation-runbook.md).

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

## CMS and staff publishing

Homepage and resident-facing content is stored in **AWS AppSync (GraphQL)**. The old browser-local CMS workflow has been disabled. Amplify Studio / Data Manager was **decommissioned June 2026**.

Plain-language source of truth for staff:

- **Daily editing path:** https://townofwiley.gov/admin → task hub → **Edit content** (in-app forms)
- **Staff sign-in:** `/admin/login` (Cognito)
- **IT bulk GraphQL:** AppSync Queries console — link under **Advanced (IT)** → **Open content editor** on `/admin`
- Legacy `/clerk-setup` links redirect to `/admin` and preserve supported tab fragments
- Non-technical instructions: `CLERK-CMS-GUIDE.md`
- Model and route matrix (engineering): `docs/CMS-MODEL-ROUTE-MATRIX.md`
- AWS / AppSync operations checklist: `docs/CMS-STUDIO-OPERATIONS-CHECKLIST.md`
- Verify CMS + live site: `docs/CMS-VERIFY-STUDIO.md`
- Build-time check that the public GraphQL query matches schema auth: `npm run verify:public-cms-query` (also runs in `prebuild`)

The `/admin` page includes task-guided editing, document publishing uploads, CMS connection test, and IT inventory (AppSync Queries link).

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
- If CMS content changes to brand-new English text that is not yet covered by the translation map or bilingual CMS fields, that field will fall back to English until updated.

Plain-language staff guide:

- See [CLERK-CMS-GUIDE.md](CLERK-CMS-GUIDE.md) for the current staff workflow.

Current scope:

- **Staff publishing:** `/admin` in-app forms → AppSync GraphQL (Cognito)
- **Public read path:** AppSync GraphQL API with a runtime-injected read key
- **Models in use:** `SiteSettings`, `AlertBanner`, `Announcement`, `Event`, `OfficialContact`, `LeadershipRosterEntry`, `Business`, `PublicDocument`, `ExternalNewsLink`, `SiteCopy`, plus staff-only `EmailAlias`
- **`/admin` route:** unified operations hub with task cards, CMS connection proof, contact updates, and IT AppSync Queries link

Runtime configuration sources for the public CMS read path:

- `APPSYNC_CMS_REGION`
- `APPSYNC_CMS_ENDPOINT`
- `APPSYNC_CMS_API_KEY`
- `secrets/local/user-secrets.json -> cms.appSync`

Operational notes:

- Routine homepage and CMS content should be changed on **`/admin`**, not in source code.
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
- Meeting agendas and minutes on **`/meetings`** come from active **`PublicDocument`** rows with `sectionId: meeting-documents` (optional Spanish fields `titleEs`, `summaryEs`, `statusEs`). Upload via `/admin` document publishing.
- Staff workflow: `docs/CLERK-CMS-GUIDE.md` and `docs/town-document-publishing-guide.md`. Legacy HTML guides remain under `public/documents/archive/` as href targets.
- Ops one-time seed for former static guides: `npm run seed:public-documents` (after schema deploy).

Traceability:

- `src/app/document-hub/document-links.ts`
- `src/app/document-hub/document-hub.ts`
- `src/app/records-center/records-center.ts`
- [`docs/README.md`](docs/README.md) — documentation index and current status
- `docs/post-development-inventory.md` — post-build audit and AP remediation log
- `docs/town-document-publishing-guide.md`
- `src/app/app.ts`
- `docs/incomplete-items-reference.md`

## Utility Payments

The Town's preferred utility payment rollout path is now Paystar because it best fits the current RVS Mosaics setup and can be incorporated into the AWS Amplify-hosted site with the least friction.

Current implementation status:

- The public payment card still supports billing-help email as the fallback path.
- Hosted Paystar portal links via `resolveQuickPayHref()` on `/pay-bill` and `/services` (see `src/app/payments/paystar-quick-pay.ts`).
- CTAs are disabled when `PAYSTAR_PORTAL_URL` is empty; no in-browser API or proxy path.

Traceability:

- `src/app/payments/paystar-config.ts`
- `src/app/payments/paystar-quick-pay.ts`
- `src/app/resident-services/resident-services.ts`
- `docs/incomplete-items-reference.md`

Runtime configuration sources:

- `PAYSTAR_PORTAL_URL` (hosted portal URL; defaults in `scripts/lib/runtime-config-env.mjs`)

Recommended deployment path:

1. Set `PAYSTAR_PORTAL_URL` to the Town's live Paystar payment page.
2. Redeploy static site so `runtime-config.js` exposes the portal URL.

Operational note:

- Mapping inside `mapUpstreamJsonToTownLaunchResponse` and `buildUpstreamLaunchBody` are **scaffolds**; update them to match Paystar’s tenant OpenAPI when credentials are available.

## Town Email Aliases

The Town mail-routing path should use AWS-managed forwarding rather than personal mailbox rules so `townofwiley.gov` addresses stay under Town control even when the staff member's current inbox changes.

Selected AWS method:

- Receive inbound town mail through Amazon SES.
- Store the raw inbound message in S3.
- Trigger a Lambda forwarder from the S3 object-created event.
- Look up the destination inbox from a private **`EmailAlias`** record (staff-only CMS model).
- Forward the message to the staff member's current inbox by SES using a verified Town sender.

Why this is the best fit here:

- It supports alias-style forwarding such as `steve.mckitrick@townofwiley.gov -> bigessfour@gmail.com` without moving staff into a new mailbox system first.
- The routing data is managed on **`/admin`** → **Manage email forwarding** (or AppSync Queries for IT).
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
- The `EmailAlias` model uses DynamoDB table `EmailAlias-j7b2x3sh7rcezekekkxxiak7hi-main` on the Gen 1 AppSync API. See [gen1-production-bindings.json](./infrastructure/gen1-production-bindings.json) and [gen2-decommissioned.md](./docs/gen2-decommissioned.md).
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
2. Add the remaining `EmailAlias` records on **`/admin`** → **Manage email forwarding** for each Town mailbox alias.
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
- Optional Lambda retry tuning (see `infrastructure/nws-weather-proxy/index.mjs`): `NWS_RETRY_MAX_ATTEMPTS` (default `4`, min 2 max 8), `NWS_RETRY_BASE_MS` (default `1000`, exponential backoff base), `NWS_RETRY_MAX_DELAY_MS` (default `20000`, cap per wait including `Retry-After` for 429)

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

- **Town of Wiley** AWS account ID: **`570912405222`** (production site, Town Lambdas, IAM user `copilot`)
- **Code Platoon** AWS account ID: **`388691194728`** (separate from Town; wrong profile → `NoSuchEntity` for `copilot` in IAM)
- AWS region: `us-east-2`
- Amplify app ID: `d331voxr1fhoir`
- Amplify app name: `Townofwiley`
- Production branch: `main`
- Static build output: `dist/townofwiley-app/browser`

Expected runtime behavior:

1. If `NWS_PROXY_ENDPOINT` is set, the weather panel uses the AWS proxy.
2. If the proxy fails and browser fallback is enabled, the site retries against public `api.weather.gov` (with exponential backoff and `Retry-After` on 429, same policy as the Lambda proxy).
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

### Quick NWS Fix Checklist (AWS Amplify)

1. Amplify → Environment variables:
   - NWS_PROXY_ENDPOINT = your-lambda-function-url.lambda-url.us-east-2.on.aws/
   - NWS_ALLOW_BROWSER_FALLBACK = true
2. Lambda Console → NWS proxy function → Environment variables:
   - NWS_USER_AGENT = `townofwiley.gov/1.0 (your-email@domain.com)`
3. Lambda → Function URL → CORS: clear Allow Origins (let code handle it)
4. Run: npm run verify:nws-weather-proxy-aws
5. Redeploy Amplify (forces runtime-config.js update)

This is the #1 cause of "NWS unavailable" on the live site.

Homepage NWS alert banner:

- `HomepageWeatherAlertPrimer` uses the same `weather.apiEndpoint` as the weather panel when it is set (so the banner respects the AWS proxy and NWS `User-Agent` policy). If the proxy fails and `allowBrowserFallback` is true, it falls back to the public `api.weather.gov` chain. In development builds, proxy or NWS failures log a single `console.warn` from `[HomepageWeatherAlertPrimer]` to aid debugging.

Verify the deployed Lambda (requires AWS CLI credentials for account **570912405222**, region **us-east-2**):

```bash
export AWS_PROFILE=townofwiley
export NWS_WEATHER_LAMBDA_FUNCTION_NAME='your-nws-proxy-lambda-name'
./scripts/verify-nws-weather-proxy-aws.sh
```

This repository assumes **`townofwiley`** → **`570912405222`**. Use other profiles (**e.g. Code Platoon `388691194728`**) **outside** this workspace default; do not reuse them as the Wiley site profile.

The script checks caller identity, `NWS_USER_AGENT`, and lists [function URL configs](https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html#urls-cors). If your CLI profile points at another account, the script warns so you can switch profiles before trusting the output.

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

## Feature Completion Progress

This section tracks post-build remediation. **Source of truth:** [`docs/post-development-inventory.md`](docs/post-development-inventory.md) and [`docs/README.md`](docs/README.md). AP-03 (Paystar placeholder) merged 2026-05-22.

### 1. Functionality/Page Features (Target: 10/10)

- Specs documented in `docs/feature-completion-spec.md`.
- Build in progress: Payments, Docs Hub, Permits/Business Directory.
- Review pending: Tests, manual validation on staging.

### 2. Review (Target: 10/10)

- Pending: Expanded checklist and audits.

### 3. Building (Target: 10/10)

- Pending: Test coverage improvements.

### 4. UX/Aesthetics (Target: 10/10)

- Pending: Polish and accessibility fixes.

### 5. Overall "Done" Metrics (Target: 10/10)

- Pending: Full validation and log.

Final validation run: Pending. Current scores: Functionality 6/10 → progressing.
