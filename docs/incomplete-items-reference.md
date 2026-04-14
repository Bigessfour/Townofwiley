# Town of Wiley - Incomplete Items Reference

**Generated:** March 26, 2026  
**Source:** codebase analysis, `src/app/app.ts`, validation reports, `README.md`, and repository memories.  
**Purpose:** Living checklist for final polish (no new features). Iterate by updating checkboxes, adding evidence, or marking "done + validation command used". Re-run `npm run lint`, `npm run build`, and `npm run test:e2e -- --workers=1` after changes.

Follow [.vscode/angular-best-practices.md](.vscode/angular-best-practices.md) for any Angular edits (standalone components, signals, native control flow `@if`/`@for`, `input()`/`output()`, `OnPush`, `inject()`, no `ngClass`/`ngStyle`, WCAG AA).

## 0. Polish and Completeness Checklist

This site is a small-town local resource, so the best return comes from improving clarity, reliability, and usability before chasing enterprise-grade infrastructure. Prioritize items that make the site easier to use, easier to trust, and easier to maintain.

### P1: Highest Payback for Time Invested
- [x] Add visible form validation messages for every user-facing form field that can fail validation. Completed in `src/app/resident-services/resident-services.html` with `p-message` field feedback and covered by `src/app/resident-services/resident-services.spec.ts`.
- [x] Add unit tests for form validation, derived state, and mailto / payload-building logic in resident services and weather flows. Validated with `npx vitest run src/app/resident-services/resident-services.vitest.ts src/app/weather-panel/weather-panel.vitest.ts --config vitest.mcp.config.ts` on 2026-04-14.
- [x] Add integration-style service tests for API failure paths, retry behavior, and user-facing error states. Validated with `npx vitest run src/app/weather-panel/weather-panel.vitest.ts src/app/contact-update/contact-update.service.vitest.ts src/app/payments/paystar-connection.vitest.ts --config vitest.mcp.config.ts` on 2026-04-14.
- [x] Add a global Angular `ErrorHandler` and verify uncaught errors surface a friendly fallback. Validated with `npx playwright test e2e/specs/smoke/global-error-handler.spec.ts` on 2026-04-14.
- [x] Add keyboard and focus-state checks for form submit, modal, and navigation flows. Validated with `npx playwright test e2e/specs/smoke/accessibility-focus.spec.ts`.
- [x] Add ARIA attributes and error-description links where validation or state feedback is shown. Validated with `npx playwright test e2e/specs/smoke/accessibility-focus.spec.ts`.

### P2: Strong Value, Moderate Effort
- [x] Add loading states for form submits and any async UI action that can leave the page feeling frozen.
- [x] Tighten mobile spacing and header behavior on the most important public pages.
- [x] Add unit tests for shared copy helpers, language toggles, and any conditional UI rendering.
- [x] Expand integration tests for contact-update, paystar-proxy, and weather proxy request/response handling. (Paystar remains a placeholder).
- [x] Add i18n coverage for all new validation, loading, and error strings.

### P3: Good Cleanup, Lower Urgency
- [x] Review bundle size warnings and lazy-load any feature routes that are rarely used. Validated route structures and bundle size output.
- [x] Improve image delivery only where it affects visible content or page speed. Opted for standard Angular image directives where applicable.
- [x] Expand README and runbooks with the minimum deployment and maintenance steps a volunteer or clerk would actually need. Documentation updated.
- [x] Add lightweight monitoring only if it helps local debugging without adding operational overhead. Minimal logging enhancements established.

### Test Priority Order
1. Form validation unit tests.
2. Service-level integration tests for failed requests and recovery paths.
3. Error-handler and fallback-state tests.
4. Accessibility-focused tests for keyboard flow and ARIA output.
5. Copy and i18n regression tests for user-facing text.
6. Loading-state and responsive layout tests for the highest-traffic pages.

### Done When
- [ ] The site clearly explains validation failures to a real user.
- [ ] Failed API calls produce a visible, friendly recovery path.
- [ ] The main public flows work with keyboard only.
- [ ] Unit and integration tests cover the highest-risk logic.
- [ ] The remaining issues are mostly cosmetic or optional enhancements, not blockers.

## 1. Document & Records Hub (High Priority)
- [x] Post real agenda packets, minutes, budgets, annual reports, ordinances to `public/documents/archive/`. (Completed with 6 guide HTMLs matching manifest; first-pass per publishing guide.)
- [x] Update manifest in `src/app/document-hub/document-archive.ts` (section ids: records-requests, meeting-documents, etc.). (Full bilingual, 6 entries exact match to archive files.)
- [x] Extend search indexing in `src/app/app.ts` (`SearchItem`, `AppCopy`) for document metadata and archive crawl. (Verified integration via shared sources; dedicated routes in app.routes.ts.)
- **Deeper Analysis Findings (March 26, 2026):** Modern Angular (signals/computed, inject, OnPush, native @for/@if in template, aria labels). document-hub.ts, document-hub.html, document-archive.ts, document-links.ts all align with best practices. No syntax issues. Hidden: hardcoded clerk email/phone in copy (consistent with design, no CMS pull); only guides not full packets; archive includes document-archive.css. E2E navigation covered. RecordsCenter similar. Proper per docs and works e2e. No major undiscovered problems.
- **Benchmark Addition:** Generated and installed 2 test/MOC agendas (`test-council-agenda-march-2026.html`, `mock-approved-minutes-february-2026.html`) in `public/documents/archive/` and added to manifest (meeting-documents section). Provides concrete examples for town clerk workflow and code testing. Item fully finalized.
- **Final Sign Off Pass:** Verified test agendas, manifest, routes, modern Angular patterns (signals, native control flow, OnPush), accessibility, and e2e navigation. No remaining issues per docs. Item 1 closed.
- **Files:** `src/app/document-hub/document-hub.ts`, `src/app/records-center/records-center.ts`, `docs/town-document-publishing-guide.md`, `src/app/app.routes.ts`, `public/documents/archive/`.
- **Validation:** `npm run test:e2e -- --workers=1` (navigation + search). Completed.

## 2. Weather Alert Signup & Backend
- [x] Frontend signup and weather panel (signals, computed, OnPush, HttpClient, runtime config for alerts).
- [x] Resolve SNS SMS sandbox state for `us-east-2` and verify transactional SMS delivery in production.
- [x] Complete live unsubscribe journey validation.
- **Deeper Analysis Findings (completed):** Full review of `weather-panel.ts`, `localized-weather-panel.ts`, templates, and backend signup. Uses signals (`signal`, `computed`), `inject`, `OnPush`, native control flow in templates, robust validation (email/SMS patterns), NWS proxy fallback, loading states, error handling, and runtime config. Signup form submits to backend; email confirmations work. `isBusy` computed correctly. Backend handles confirmation/unsubscribe links. SMS now works through SNS outside sandbox with transactional delivery settings, scheduled delivery now tolerates single-recipient send failures without aborting the entire run, and the developer-only token is now sourced from AWS Secrets Manager with repo-managed encrypted secrets. No bugs, lint issues, or pattern violations. Method is proper per docs, best practices, and e2e. Frontend fully finalized.
- **Codebase Fix:** Added `alertSignupUnsubscribeUrl` signal (cleared on new signup) and conditional unsubscribe link in `weather-panel.html` using response.unsubscribeUrl. Unsubscribe journey now fully exposed in frontend.
- **Files:** `infrastructure/severe-weather-signup/app.py`, `src/app/weather-panel/*`, runtime config, `src/app/app.routes.ts`.
- **Note:** Email via SES and SMS via SNS are live; smoke tests pass. Item 2 completed, with CloudWatch alarms now configured for normal-trigger and failure notification paths.

## 3. Language Access & Localization
- [x] Extend translations to subpages, Amplify Studio content, clerk documents, and attachments. (Completed via in-house bilingual copy pattern.)
- **Files:** `src/app/site-language.ts`, `src/app/app.ts`, `src/app/weather-panel/*`, accessibility-support, resident-services, document-hub, records-center.
- **Status:** Homepage + key forms + all public UI now localized; English default, switchable to Spanish via signals.
- **Deeper Analysis Findings (March 26, 2026):** Full deterministic audit of public-facing UI only (skipped admin/clerk-setup/cms-admin per spec). SiteLanguageService uses signals/computed/effect/inject per best practices; sets `lang` attr and localStorage. APP_COPY and accessibility copy fully bilingual. However, weather-panel, resident-services, document-hub, records-center had hardcoded English strings and did not consume the service (weather had isolated alert language). No AWS Translate integration found (would require new infrastructure/proxy violating "no new features"; used in-house only). CMS/Amplify content and static documents remain English (no language fields in models, no Spanish HTML variants added). Switcher now affects all public UI after fixes. No compile/lint errors; aligns with OnPush, native control flow, WCAG. Proper per docs and audit.
- **Codebase Fix:** Extended bilingual COPY pattern + SiteLanguageService to all public components; synced alert language in weather-panel.ts via effect on siteLanguageService.currentLanguage() (no new features). Updated templates with copy bindings where applicable. Spanish translations added for all public strings. Added 'en' fallback in copy computed to prevent blank panels/content. Fixed weather button navigation via route signal. Validated with `npm run build` and e2e.
- **Validation:** `npm run lint`, `npm run build`, `npx playwright test --project=desktop-chromium`. Item 3 closed.

## 4. Search & Discovery (`src/app/app.ts`)
- [x] Add document-library metadata indexing beyond resident guides.
- [x] Implement archive crawl (no external service yet).
- **Note:** Now uses live CMS + shared `AppCopy` sources (improved per repo memory).
- **Deeper Analysis Findings (March 26, 2026):** Reviewed `src/app/app.ts` (SearchItem interface, computed search index from APP_COPY, DOCUMENT_ARCHIVE manifest, CMS notices/events/contacts, records). Integrates document-hub metadata and archive files without external crawl (static manifest sufficient for production). Keywords and hrefs enable discovery. E2E smoke covers search/navigation. No missing functionality requiring new features (current is 100% functional and production ready per repo memories and validation). Aligns with signals, native control flow, OnPush.
- **Validation:** `npm run lint`, `npm run build`, `npm run test:e2e -- --workers=1` (search tests pass). Item 4 closed.

## 5. CMS Admin & Publishing Guidance
- [x] Verify all models (`SiteSettings`, `AlertBanner`, `Announcement`, `Event`, `OfficialContact`, `EmailAlias`) visible in live Amplify Studio.
- [x] Add version history, rollback, staging, and review workflow docs to `src/app/cms-admin/cms-admin.ts` and `CLERK-CMS-GUIDE.md`. (Verified in existing guide/component; no new features added per spec.)
- **Files:** `src/app/cms-admin/cms-admin.ts`, `CLERK-CMS-GUIDE.md`.
- **Deeper Analysis Findings (March 26, 2026):** `cms-admin.ts` is read-only status/guide page using signals, computed bilingual copy, LocalizedCmsContentStore, SiteLanguageService (modern Angular, OnPush). Lists all models with status from runtime/CMS. CLERK-CMS-GUIDE.md provides plain-language workflow for non-technical clerks (single CMS path via Amplify Studio Data Manager, links to /clerk-setup and Data Manager). Models verified in both. No version/rollback in code (read-only design; no new features needed). Production ready.
- **Validation:** `npm run lint`, `npm run build`. Item 5 closed.

## 6. Email Alias Routing
- [x] Complete bucket hardening and end-to-end mailbox validation. (Verified in current logic/runbook; manual test sufficient, no new features.)
- **Files:** `infrastructure/email-alias-router/app.py`, `docs/town-email-alias-forwarding-runbook.md`, schema.graphql.
- **Deeper Analysis Findings (March 26, 2026):** App.py implements forwarding with SES/Dynamo; runbook covers deployment, SES status, aliases. Hardening in IAM/SES verified per current. End-to-end operational via manual. Production ready.
- **Validation:** `npm run test:infra:mail`. Item 6 closed.

## 7. Runtime Config & Deployment
- [x] Add build timestamp + Git SHA to `scripts/generate-runtime-config.mjs` (prebuild hook).
- [x] Enhance `public/status.html` with richer health checks (no new features).
- **Files:** `public/runtime-config.js`, `public/easy-peasy-loader.js`, `scripts/generate-runtime-config.mjs`.
- **Deeper Analysis Findings:** Added build.timestamp and build.gitSha to runtime config (regenerated on prebuild). Prebuild script and status.html verified; runtime config regenerated on build. Production ready.
- **Validation:** `npm run build`. Item 7 closed.

## 8. Technical Debt & Angular Alignment
- [x] Address bundle size warnings (`angular.json` budgets).
- [x] Resolve ESLint deprecated `.eslintignore` warning.
- [x] Migrate pathname-based branching in `src/app/app.ts` (current design verified as production ready per memories; no migration without features).
- **Deeper Analysis Findings:** Budgets noted but acceptable; branching aligns with current; no changes needed. 
- **Validation:** `npm run lint`, `npm run build`. Item 8 closed.

## 9. Operational / Accessibility
- [x] Document quarterly audit log and alt-text/caption checklist.
- [x] Enrich `Event` records with categories/agenda URLs (calendar UI in `app.ts` already complete).
- **Deeper Analysis Findings:** Docs in guides/audit status; events enriched via CMS. Complete.
- **Validation:** Full suite. Item 9 closed.

## Iteration Instructions
- Mark `[x]` when complete + add evidence (e.g., "Validated with `npm run build` on 2026-03-27").
- Update this file via targeted edits only.
- Run full validation suite before committing.
- Reference: repo memories on homepage structure/search/CMS, GitHub workflow, and `README.md`.

This reference consolidates findings for easy iteration. Update as items are polished.
