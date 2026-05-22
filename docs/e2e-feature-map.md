# E2E feature map: AWS to resident interaction

**Last updated:** 2026-05-22  
This document ties major Town of Wiley web behavior to hosting, backends, and Playwright smoke coverage. It complements `e2e/support/public-routes.ts` and `e2e/specs/smoke/*.spec.ts`. Status slices: [`post-development-inventory.md`](post-development-inventory.md).

## Hosting and delivery

| Layer                        | Role                                                                                                                                                                                                                   | Resident-visible outcome                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **AWS Amplify**              | Builds the Angular app from `amplify.yml` (`npm ci`, `npm run build`), serves static assets from `dist/townofwiley-app/browser`, injects branch env vars; hosting headers (CSP, cache) from repo-root `customHttp.yml` | Site HTML, JS bundles, `public/runtime-config.js` |
| **CloudFront / Amplify CDN** | Edge delivery of static files                                                                                                                                                                                          | Fast page loads                                   |
| **Angular SSR / prerender**  | `app.routes.server.ts` prerenders listed public routes (including `/`, `/services`, `/payments`, `/permits`, `/businesses`, documents, records, etc.)                                                                  | SEO-friendly shells; client hydrates              |

## Runtime configuration

| Source                                                                                         | Purpose                                                                 |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `public/runtime-config.js` (generated for local/E2E via `scripts/generate-runtime-config.mjs`) | CMS AppSync endpoint, weather proxies, Paystar mode/URLs, chatbot flags |
| `window.__TOW_RUNTIME_CONFIG_OVERRIDE__`                                                       | Playwright tests override payment/CMS without changing files            |

## Data and integrations

| Backend                        | AWS pieces                                                                                                                                                                                                                                                                                                                                                    | User journey                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Site CMS (GraphQL)**         | AppSync API + API key (see `amplify/` backend), optional S3 for assets                                                                                                                                                                                                                                                                                        | Home content, notices, meetings, business directory listings, contacts (clerk, town hall), document hub metadata |
| **Document hub uploads**       | AppSync mutations, S3 bucket (see CSP `connect-src` / README)                                                                                                                                                                                                                                                                                                 | Staff/public document workflow from `/documents`                                                                 |
| **Weather**                    | NWS APIs via proxy; optional severe-weather signup Lambda + DynamoDB + SES (`scripts/deploy-severe-weather-backend.py`)                                                                                                                                                                                                                                       | `/weather`, alert signup, bilingual delivery                                                                     |
| **Utility payments (Paystar)** | Browser uses hosted portal `href` only via `resolveQuickPayHref()` (`src/app/payments/paystar-quick-pay.ts`). **No `PaystarConnectionService` injection in production UI.** CTAs disabled when `portalUrl` empty (AP-03, PR #30). Town proxy + Embedded Session scaffold in `infrastructure/paystar-proxy/` remain for a future embedded/API path (AP-02 blocked). | `/services` + `/pay-bill`; E2E `enablePaystarHostedWithoutPortal` in `payments.spec.ts` |
| **Site monitor**               | Lambda + EventBridge + DynamoDB (`scripts/deploy-site-monitor.py`)                                                                                                                                                                                                                                                                                            | Operations email when admin/CMS unreachable (not a resident-facing click path)                                   |
| **Contact / mailto**           | Client-side `mailto:` prepared by resident forms                                                                                                                                                                                                                                                                                                              | Issue reports, records requests, billing help                                                                    |

## Permits

- **No online permit workflow**: `/permits` explains that Wiley does not process permits on the site and directs users to the **city or Town Clerk’s office**, with optional CMS-driven clerk email/phone when present.

## Playwright smoke alignment

| Area                | Spec file                                 | Route(s)                | Notes                                 |
| ------------------- | ----------------------------------------- | ----------------------- | ------------------------------------- |
| Public route health | `public-route-health.spec.ts`             | `public-routes.ts` list | Includes `/payments`, `/permits`      |
| Payments            | `payments.spec.ts`                        | `/pay-bill`             | Hosted Paystar: `enablePaystarHostedWithoutPortal` (disabled CTA, no placeholder `paystar.io` href). Bill-pay early-access uses `enableBillPayApi` + route mocks (separate from Paystar). Dead `enablePaystarApi` removed (AP-24a). |
| Permits             | `permits.spec.ts`                         | `/permits`              | Clerk messaging + language toggle     |
| Business directory  | `business-directory.spec.ts`              | `/businesses`           | CMS + fallback listings; search       |
| Resident services   | `home.interactions.spec.ts` (and related) | `/services`             | Paystar portal when `portalUrl` set   |
| Paystar no portal   | `payments.spec.ts`                        | `/pay-bill`, `/services`| Disabled CTA; no placeholder href     |

## Future smoke coverage (gaps)

1. Resident services form submissions and panel toggles
2. Business directory contact actions (call, map, external site)
3. Accessibility barrier report submit flow
4. Records center CMS-driven links
5. News/external links; chat dialog keyboard coverage

## End-to-end flow (example: utility payment)

1. Resident opens `https://townofwiley.gov` (or E2E `127.0.0.1:4300`) — Amplify serves the app.
2. Angular loads `runtime-config.js` — determines whether Paystar is `none`, `hosted`, or `api`.
3. Resident navigates to **Resident services** (`/services`) or **Payment form** (`/payments`).
4. When `portalUrl` is set, browser opens the hosted Paystar portal; when unset, portal CTA is disabled (bilingual notice). API/embedded paths remain scaffold-only until AP-02/AP-10 close.
5. Staff-side configuration and Lambdas (if used) live in AWS accounts documented in `README.md` deploy sections.

This map is descriptive; exact resource names and ARNs belong in runbooks or AWS consoles, not in the repo.
