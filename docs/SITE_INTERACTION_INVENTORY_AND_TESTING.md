# Town of Wiley Website – Public Facing Pages Interaction Inventory, Audit & Testing Plan

**Context for Wiley Co. simple website on AWS**
The public site is hosted on **S3 + CloudFront** (`townofwiley.gov`), with serverless backend (AppSync, DynamoDB, Lambda, SES, SNS) and CI/CD via GitHub Actions.

## Public Facing Pages (from `app.routes.ts`)

1. `/` (Homepage)
2. `/news` (legacy `/notices` redirects here)
3. `/meetings` (includes meeting agendas/minutes archive)
4. `/weather`
5. `/services` (Resident Services)
6. `/businesses` (Business Directory)
7. `/pay-bill`
8. `/permits` (clerk guidance; not in mega menu panel links)
9. `/news`
10. `/contact`
11. `/accessibility`
12. `/privacy`
13. `/terms`

**Legacy redirects (no standalone pages):**

- `/records` → `/contact` (clerk assistance callout)
- `/documents` → `/meetings` (meeting documents archive)

## Page-by-Page Interaction Inventory (Top → Bottom)

**All pages share**: Header (logo, PrimeNG megamenu, language switcher, Wiley Search, mobile drawer, alerts, chatbot toggle) + Footer links.

**Status summary**: Navigation is covered by Playwright smoke, inventory, and megamenu specs. Records/document hub pages were removed June 2026; redirects and clerk/meetings destinations replace them.

## Testing Inventory & CI Coverage

**Existing**:

- Playwright E2E (`e2e/`) – smoke, accessibility (axe), responsive, megamenu link integrity, homepage navigation, forms, chatbot, weather signup.
- Vitest unit tests.
- GitHub Actions CI → lint, unit, infra, E2E.

**Inventory E2E suite**: Controls in [`e2e/specs/inventory/`](../e2e/specs/inventory/) (IDs in [`e2e/support/interaction-inventory.ts`](../e2e/support/interaction-inventory.ts)).

**How to maintain**:

- After menu or copy changes, run `/copy` skill (`.cursor/skills/copy/SKILL.md`) or sync `APP_COPY` ↔ `e2e/support/site-content.ts` ↔ megamenu tests manually.
- Run locally: `npm run test:e2e:smoke`, `npm run test:e2e:inventory`.

**Document owner**: Bigessfour (maintainer). Last updated: June 11, 2026.
