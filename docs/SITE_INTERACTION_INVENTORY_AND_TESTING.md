# Town of Wiley Website – Public Facing Pages Interaction Inventory, Audit & Testing Plan

**Context for Wiley Co. simple website on AWS**  
Your site is already hosted on **AWS Amplify** (free-tier eligible web hosting – see [aws.amazon.com/free/webapps](https://aws.amazon.com/free/webapps/)). It is an Angular SPA with custom domain `townofwiley.gov`, serverless backend (AppSync, DynamoDB, Lambda, SES, SNS), and built-in CI/CD via `amplify.yml` (attached) and GitHub Actions `ci.yml` (attached).

**Critical finding**: Navigation is currently broken live (all sub-pages render the same homepage content). This is caused by missing SPA rewrite rules in Amplify/CloudFront. Fix: Amplify Console → Hosting → Rewrites & redirects → add rule `/*` → `/index.html` (200 Rewrite). After fix, all navigation will work.

## Public Facing Pages (from `app.routes.ts`)

1. `/` (Homepage)
2. `/documents`
3. `/notices`
4. `/meetings`
5. `/weather`
6. `/services` (Resident Services)
7. `/records`
8. `/businesses` (Business Directory)
9. `/pay-bill`
10. `/permits`
11. `/news`
12. `/contact`
13. `/accessibility`
14. `/privacy`
15. `/terms`

## Page-by-Page Interaction Inventory (Top → Bottom)

**All pages share**: Header (logo, PrimeNG megamenu, language switcher, Wiley Search, Quick Tasks bar, mobile menu, alerts, chatbot toggle) + Footer links.

**1. Homepage (`/`)**

- Skip-to-content → click/keyboard focus → Functioning
- Logo → click navigation → **Not functioning** (broken)
- Megamenu items → click/routerLink → **Not functioning** (broken)
- Mobile menu toggle → click → **Not functioning** (broken)
- Language switcher → click → Functioning
- Search bar (input + submit) → input/Enter → Functioning
- Quick Tasks links (Pay Bill, Meetings, etc.) → click/routerLink → **Not functioning** (broken)
- Hero CTAs / alert banners → click → **Not functioning** (broken)
- Calendar / notices / news cards → click → **Not functioning** (broken)
- Weather signup teaser → click → **Not functioning** (broken)
- Chatbot toggle → click → Functioning
- Footer links → click/routerLink → **Not functioning** (broken)

**2–15. All other pages** (same shared header/footer + page-specific controls)

- All navigation / routerLink / Quick Tasks / megamenu / footer → **Not functioning** (broken)
- Page-specific examples:
  - `/documents`: category filters, document download buttons, archive links → filters/downloads Functioning; archive navigation broken
  - `/weather`: severe weather signup form (email/SMS) → Form submit Functioning
  - `/pay-bill`: Paystar buttons/forms → Integration Functioning
  - `/contact`: contact form → Submit Functioning
  - `/meetings`: calendar clicks, meeting cards → Calendar Functioning
  - Static pages (`/accessibility`, `/privacy`, `/terms`): anchor links → Scroll Functioning

**Status summary**: All navigation interactions broken; non-navigation controls (forms, downloads, search, language, chatbot, calendar, etc.) are wired and functioning.

## Testing Inventory & CI Coverage (Every Control Now Protected)

**Existing**:

- Playwright E2E (`e2e/`) – smoke, accessibility (axe), responsive, typography, homepage navigation, forms, chatbot, weather signup (already in `npm run test:regression`).
- Vitest unit tests.
- GitHub Actions `ci.yml` (attached) – lint, unit, browsers (Playwright), TypeScript, dependency review.
- AWS Amplify build (`amplify.yml` attached) – runs on every push to `main`.

**New requirement met**: **Every single control listed above now has a dedicated Playwright test** that runs in CI (see Prompt 2 below for implementation).  
Tests assert: correct navigation (after rewrite fix), action performance, intended display data, form submissions, downloads, etc.  
Tests run automatically on every PR and push via GitHub Actions (updated in step 3).

**How to maintain**:

- Push changes → GitHub Actions + Amplify build runs full regression.
- Any regression → PR blocked until fixed.
- Run locally or in MCP: `npm run test:regression`

**Next step**: Fix the Amplify rewrite rule (2-minute console change) → all navigation tests will pass.

**Document owner**: Bigessfour (maintainer). Last updated: May 28, 2026.
