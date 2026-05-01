# E2E feature map: AWS to resident interaction

This document ties major Town of Wiley web behavior to hosting, backends, and Playwright smoke coverage. It complements `e2e/support/public-routes.ts` and `e2e/specs/smoke/*.spec.ts`.

## Hosting and delivery

| Layer                        | Role                                                                                                                                                                                    | Resident-visible outcome                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **AWS Amplify**              | Builds the Angular app from `amplify.yml` (`npm ci`, `npm run build`), serves static assets from `dist/townofwiley-app/browser`, injects branch env vars, applies CSP and cache headers | Site HTML, JS bundles, `public/runtime-config.js` |
| **CloudFront / Amplify CDN** | Edge delivery of static files                                                                                                                                                           | Fast page loads                                   |
| **Angular SSR / prerender**  | `app.routes.server.ts` prerenders listed public routes (including `/`, `/services`, `/payments`, `/permits`, `/businesses`, documents, records, etc.)                                   | SEO-friendly shells; client hydrates              |

## Runtime configuration

| Source                                                                                         | Purpose                                                                 |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `public/runtime-config.js` (generated for local/E2E via `scripts/generate-runtime-config.mjs`) | CMS AppSync endpoint, weather proxies, Paystar mode/URLs, chatbot flags |
| `window.__TOW_RUNTIME_CONFIG_OVERRIDE__`                                                       | Playwright tests override payment/CMS without changing files            |

## Data and integrations

| Backend                        | AWS pieces                                                                                                                                                                     | User journey                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Site CMS (GraphQL)**         | AppSync API + API key (see `amplify/` backend), optional S3 for assets                                                                                                         | Home content, notices, meetings, business directory listings, contacts (clerk, town hall), document hub metadata |
| **Document hub uploads**       | AppSync mutations, S3 bucket (see CSP `connect-src` / README)                                                                                                                  | Staff/public document workflow from `/documents`                                                                 |
| **Weather**                    | NWS APIs via proxy; optional severe-weather signup Lambda + DynamoDB + SES (`scripts/deploy-severe-weather-backend.py`)                                                        | `/weather`, alert signup, bilingual delivery                                                                     |
| **Utility payments (Paystar)** | Config-driven: hosted portal URL and/or API endpoint (Lambda or third-party); `PaystarConnectionService` posts from the browser to configured `apiEndpoint` when `mode: 'api'` | `/services` billing help + portal button; `/payments` full form; E2E mocks `/e2e-mock-paystar`                   |
| **Site monitor**               | Lambda + EventBridge + DynamoDB (`scripts/deploy-site-monitor.py`)                                                                                                             | Operations email when admin/CMS unreachable (not a resident-facing click path)                                   |
| **Contact / mailto**           | Client-side `mailto:` prepared by resident forms                                                                                                                               | Issue reports, records requests, billing help                                                                    |

## Permits

- **No online permit workflow**: `/permits` explains that Wiley does not process permits on the site and directs users to the **city or Town Clerk’s office**, with optional CMS-driven clerk email/phone when present.

## Playwright smoke alignment

| Area                | Spec file                                 | Route(s)                | Notes                                 |
| ------------------- | ----------------------------------------- | ----------------------- | ------------------------------------- |
| Public route health | `public-route-health.spec.ts`             | `public-routes.ts` list | Includes `/payments`, `/permits`      |
| Payments            | `payments.spec.ts`                        | `/payments`             | API mode + route mocks; offline queue |
| Permits             | `permits.spec.ts`                         | `/permits`              | Clerk messaging + language toggle     |
| Business directory  | `business-directory.spec.ts`              | `/businesses`           | CMS + fallback listings; search       |
| Resident services   | `home.interactions.spec.ts` (and related) | `/services`             | Paystar portal when enabled           |

## End-to-end flow (example: utility payment)

1. Resident opens `https://townofwiley.gov` (or E2E `127.0.0.1:4300`) — Amplify serves the app.
2. Angular loads `runtime-config.js` — determines whether Paystar is `none`, `hosted`, or `api`.
3. Resident navigates to **Resident services** (`/services`) or **Payment form** (`/payments`).
4. Browser calls configured Paystar URL (hosted redirect or `HttpClient` POST/GET). Errors surface in-page; optional receipt when API returns a reference id.
5. Staff-side configuration and Lambdas (if used) live in AWS accounts documented in `README.md` deploy sections.

This map is descriptive; exact resource names and ARNs belong in runbooks or AWS consoles, not in the repo.
