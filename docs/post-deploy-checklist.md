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
# Spot-check: /, /meetings, /weather, /pay-bill, /services, /records, /documents,
# /accessibility, /privacy, /contact, /news, /businesses, EN + ES toggle
```

## Amplify redeploy

1. **Commit pushed to `main`** (or the branch connected to production).
2. **Amplify Console** → app **townofwiley** → branch **main** → confirm build started (or **Redeploy this version** on last green build).
3. Wait for **Provision → Build → Deploy → Verify** all green.
4. **Cache:** if styles look stale, invalidate CloudFront (if custom distribution) or hard-refresh; Amplify Hosting cache headers are in `customHttp.yml` — no manual step unless you changed CSP/cache rules.
5. **Smoke production:** `https://townofwiley.gov/` — hero, nav, search, pay bill link, weather panel (scroll), footer contact.

## Environment / runtime (unchanged by theme, still verify after any release)

| Area | What to confirm |
|------|-----------------|
| **Runtime config** | `public/runtime-config.json` generated at build; strict vars set in Amplify branch env (see `infrastructure/amplify-branch-env.manifest.json`). |
| **CMS** | AppSync endpoint + API key; homepage notices/meetings populate (or fallback banner). |
| **Weather** | NWS proxy URL; `/weather` and homepage deferred weather load forecasts. |
| **Severe weather signup** | `/weather` signup form; `SEVERE_WEATHER_SIGNUP_*` env vars. |
| **Pay bill** | Paystar portal URL or placeholder message on `/pay-bill`. |
| **Chatbot** | “Ask Wiley” FAB + dialog when `EASYPEASY_*` configured. |
| **CSP** | No console CSP violations on homepage (third-party: fonts, NWS, Paystar, etc.). |

## Quick regression targets

- Mobile menu + language toggle
- Header search → `#search-panel` results
- Quick task cards → `/pay-bill`, `/services#issue-report`, etc.
- Document hub `/documents` (standalone layout with site bar)
- Clerk **admin** `/admin` and **clerk-setup** (unchanged chrome; not full public header)

## Amplify console — watch list

See [design-system.md](./design-system.md) and [amplify-deployment-runbook.md](./amplify-deployment-runbook.md) for full detail. Highlights:

1. **Build failure — `generate:runtime-config:strict`** — missing branch env secrets; fix in Amplify → Environment variables, rebuild.
2. **Build failure — Node version** — project requires Node **24.x**; build image must match `.nvmrc` / `amplify.yml`.
3. **SSR/prerender warnings** — weather runtime during prerender may log errors; confirm production page still hydrates (known pattern in dev build logs).
4. **CSP / custom headers** — if you edited `customHttp.yml`, run `npm run amplify:sync-headers` and redeploy; compare live CSP with `npm run verify:live-csp-vs-repo` when needed.
5. **404 on new assets** — hero WebP (`/hero-wiley.webp`) must be in `public/` at build time; run `npm run assets:hero` before commit if source photo changed.
6. **Paystar / proxy CORS** — payment and weather flows depend on Lambda/API URLs in runtime config; test `/pay-bill` after env changes.
7. **Cost / limits** — AppSync, Lambda, CloudFront as usual; no extra services from CSS-only deploys.

## Rollback

Amplify → branch **main** → select previous successful deployment → **Redeploy this version**.
