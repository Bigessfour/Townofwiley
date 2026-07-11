# Post-deploy checklist — Town of Wiley site

Use after merging design-system / layout changes to `main` and before announcing the release.

## Local verification

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"   # macOS Homebrew Node 24
cd "/path/to/TOW Wiley Website"

npm ci
npm run lint
npm run test:vitest
npm run test:unit:browser
npm run build
npm run test:e2e:smoke
```

Optional visual pass:

```bash
npm run start
# Spot-check: /, /meetings, /weather, /pay-bill, /services, /contact (via /records redirect),
# /meetings (via /documents redirect), /permits, /accessibility, /privacy, /news, /businesses, EN + ES toggle
```

## Production deploy (S3 + CloudFront)

Frontend hosting is **S3 `townofwiley-static-site` + CloudFront `E1NZ3XCY5CYR1J`** (Amplify Hosting app decommissioned June 2026). See [README.md](../README.md) § Deployment Record and [github-actions-production-deploy.md](./github-actions-production-deploy.md).

1. **Merge to `main`** when **`site-ci / CI gate (merge required)`** is green.
2. **Automatic deploy (normal):** push/merge to `main` with app changes → Site CI → `deploy-production` (OIDC → S3 + CloudFront invalidation + homepage/CSP smoke).
3. **Manual break-glass:**
   ```bash
   source scripts/agent-aws-env.sh
   npm run deploy:site
   ```
   Use `--skip-build` only if you already ran `npm run build` with production env/secrets.
4. **Cache:** if anything still looks stale after invalidation, hard-refresh (`Ctrl+Shift+R`) or check `https://www.townofwiley.gov/runtime-config.js` for the expected payload. If the CMS fallback banner persists with a valid `cms.appSync.apiKey`, unregister the site service worker once (DevTools → Application → Service Workers → Unregister) so an old cached `runtime-config.js` is not reused.
5. **Smoke production:** `https://townofwiley.gov/` — hero, **forest header / MegaMenu**, search, pay bill link, weather panel (scroll), footer contact; EN/ES toggle.
6. **Ops (optional):** if `TOW_OPS_SNS_TOPIC_ARN` is configured, confirm site-monitor still healthy; see [ops-observability.md](./ops-observability.md).

## Environment / runtime (unchanged by theme, still verify after any release)

| Area                      | What to confirm                                                                                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Runtime config**        | `public/runtime-config.json` generated at build; strict vars set in Amplify branch env (see `infrastructure/amplify-branch-env.manifest.json`).                                                    |
| **CMS**                   | AppSync endpoint + API key; homepage notices/meetings populate (or fallback banner).                                                                                                               |
| **Weather**               | NWS proxy URL; `/weather` and homepage deferred weather load forecasts.                                                                                                                            |
| **Severe weather signup** | `/weather` signup form; `SEVERE_WEATHER_SIGNUP_*` env vars.                                                                                                                                        |
| **Pay bill**              | Hosted Paystar portal live on `/pay-bill` and `/services` (`https://secure.paystar.io/pay/town-of-wiley-utilitybill`; override via `PAYSTAR_PORTAL_URL` / `PAYSTAR_MODE=none`).                    |
| **Resident intake**       | `CONTACT_UPDATE_API_ENDPOINT` set → billing assistance POST persists to DynamoDB; clerk sees rows at `/admin#updates` (print/CSV). See [resident-intake-runbook.md](./resident-intake-runbook.md). |
| **Chatbot**               | “Ask Wiley” FAB + dialog when `EASYPEASY_*` configured.                                                                                                                                            |
| **CSP**                   | No console CSP violations on homepage (third-party: fonts, NWS, Paystar, etc.).                                                                                                                    |

## Quick regression targets

- Mobile menu + language toggle
- Header search → `#search-panel` results
- Quick task cards → `/pay-bill`, `/services#issue-report`, etc.
- Document hub `/documents` (standalone layout with site bar)
- Clerk **admin** `/admin` and **clerk-setup** (unchanged chrome; not full public header)

## Watch list (post-Amplify Hosting)

See [design-system.md](./design-system.md) and [github-actions-production-deploy.md](./github-actions-production-deploy.md). Highlights:

1. **Build failure — `generate:runtime-config:strict`** — missing GitHub Actions secrets for production build; fix secrets, re-run Site CI.
2. **Build failure — Node version** — project requires Node **24.x** (`.nvmrc` / Site CI `NODE_VERSION`).
3. **SSR/prerender warnings** — weather runtime during prerender may log errors; confirm production page still hydrates.
4. **CSP / custom headers** — if you edited `customHttp.yml`, keep `angular.json` parity (`npm run verify:custom-http-yaml`); live probe via deploy post-steps / `npm run verify:live-csp-vs-repo`.
5. **404 on new assets** — hero WebP (`/hero-wiley.webp`) must be in `public/` at build time; run `npm run assets:hero` before commit if source photo changed.
6. **Paystar / proxy CORS** — payment and weather flows depend on Lambda/API URLs in runtime config; test `/pay-bill` after env changes.
7. **Cost / limits** — AppSync, Lambda, CloudFront as usual; ops SNS/S3 optional and low-volume ([ops-observability.md](./ops-observability.md)).

## Rollback

1. **Preferred:** Actions → previous green **Deploy production** / re-run deploy of last known good `main` commit, or merge a revert PR.
2. **Break-glass:** check out last good tag/commit, `source scripts/agent-aws-env.sh && npm run deploy:site`.
3. CloudFront may take 1–2 minutes after invalidation; hard-refresh if needed.
