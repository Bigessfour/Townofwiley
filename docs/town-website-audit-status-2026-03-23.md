# Town of Wiley Website Audit Status

Updated: March 23, 2026

This document converts the attached audit into Markdown and updates it against the current repository state. It supersedes the stale March 2026 snapshot where several homepage features were still listed as missing even though they are now implemented in the repo.

## Executive Summary

- The public information architecture has been tightened up substantially. The homepage is now a compact landing page with feature cards, quick tasks, search, and footer access points, while detailed content lives on dedicated public paths instead of one dense scroll.
- The current public detail-page structure is now:
  - `/weather`
  - `/notices`
  - `/meetings`
  - `/services`
  - `/records`
  - `/contact`
  - `/accessibility`
- The records/document area now includes a resident-facing `/documents` hub that gives meeting documents, finance records, code references, and records requests stable public destinations instead of guidance-only dead ends.
- The document hub now publishes a first-pass downloadable archive with stable public files under `/documents/archive`, so residents can open or download real reference documents instead of seeing guidance-only cards.
- English is now the default homepage language when no saved preference exists, while resident-selected language still persists through local storage.
- Several audit items are still open, but they are now mostly backend and operational gaps rather than missing public-facing information architecture.
- The current repo state is now validated by lint, production build, unit tests, infrastructure tests, and the full Playwright suite.
- The highest-value remaining work is still the same general theme: connect the homepage workflows to real backend systems instead of mailto-style routing and seeded content.
- Utility billing implementation now has a clearer path: the Town can keep RVS Mosaics as the clerk-facing billing system while integrating one of RVS's published payment partners or commissioning a custom bridge.
- Paystar is now the selected first implementation target because it has the clearest website-link onboarding path for an Amplify-hosted resident portal while remaining compatible with RVS Mosaics.

## Current Validation Snapshot

- `npm run lint` passes. Current note: ESLint still warns that the untracked `.eslintignore` file format is deprecated, but linting itself is green.
- `npm run build` passes and writes `dist/townofwiley-app`. Current warnings only:
  - initial bundle size is `541.62 kB` against a `500.00 kB` warning budget
  - `src/app/app.scss` is `17.85 kB` against a `16.00 kB` warning budget
- `npm run test:unit:browser` passes with `13/13` tests green.
- `npm run test:infra` passes with `6/6` tests green.
- `npm run test:infra:alerts` passes with `7/7` tests green.
- `npm run test:infra:mail` passes with `4/4` tests green.
- `npm run test:e2e -- --workers=1` passes with `43` tests green and `3` expected skips.
- Playwright coverage now directly validates the compact homepage, the dedicated feature pages, mobile detail-page reachability, and critical/serious axe compliance on `/`, `/weather`, `/services`, `/records`, and `/accessibility`.
- Severe-weather email confirmations are now working through SES with `alerts@townofwiley.gov` as the official sender, while SMS remains blocked by the separate Amazon SNS SMS sandbox state in `us-east-2`.
- The Easy Peasy loader now adds accessible labeling to the injected chatbot launch button so the public shell can pass current axe coverage without excluding the widget.

## What Changed Visibly

### Homepage information architecture

Status: Complete

Evidence:

- [src/app/app.ts](../src/app/app.ts)
- [src/app/app.html](../src/app/app.html)
- [src/app/app.scss](../src/app/app.scss)

What is complete:

- `/` is now a compact landing page instead of a long all-in-one destination.
- The homepage now focuses on:
  - hero and town identity
  - community facts
  - feature-card navigation
  - resident quick tasks
  - search
  - footer utility links
- Detailed public content now lives on dedicated page paths for weather, notices, meetings, services, records, contacts, and accessibility.
- Weather alert priming still works on public non-weather pages through a hidden background weather panel, so active alert behavior was preserved while removing the visible weather stack from the homepage.

What is still missing:

- The public pages are still implemented through pathname-based shell branching inside `App` rather than Angular Router.
- Bundle and stylesheet budgets now warn, which should be addressed in a later cleanup pass.

## What Is Complete Now

### Resident service intake flows

Status: Complete on the dedicated `/services` page, linked from the homepage

Evidence:

- [src/app/resident-services/resident-services.ts](../src/app/resident-services/resident-services.ts)
- [src/app/app.ts](../src/app/app.ts)

What is complete:

- Residents can now start three structured workflows from the dedicated resident-services page:
  - utility payment help
  - street or utility issue reporting
  - records, permits, or clerk help
- The homepage top-task links now route residents directly into the correct service destinations:
  - `/services#payment-help`
  - `/services#issue-report`
  - `/services#records-request`
- These forms are bilingual and build structured messages instead of leaving residents with a blank email.

What is still missing:

- No live Paystar production configuration or RVS posting confirmation in the resident-facing site yet
- No backend case tracking or request status timeline
- No file uploads for permits or licensing workflows

### Accessibility statement and barrier reporting

Status: Complete on the dedicated `/accessibility` page

Evidence:

- [src/app/accessibility-support/accessibility-support.ts](../src/app/accessibility-support/accessibility-support.ts)
- [src/app/app.ts](../src/app/app.ts)

What is complete:

- A published accessibility statement now exists on a dedicated public page instead of the homepage body.
- Residents can prepare an accessibility barrier report from a dedicated form.
- The barrier-report flow includes direct Town Hall and clerk contact paths.
- The search experience includes accessibility and barrier-report discovery, and the footer keeps a stable public access point to `/accessibility`.

What is still missing:

- No documented quarterly audit log in the repo
- No formal media alt-text and caption operations checklist yet

### Records center and transparency entry points

Status: Complete for the current public-destination scope on `/records` and `/documents`

Evidence:

- [src/app/records-center/records-center.ts](../src/app/records-center/records-center.ts)
- [src/app/document-hub/document-hub.ts](../src/app/document-hub/document-hub.ts)
- [src/app/app.ts](../src/app/app.ts)

What is complete:

- The records area now has real resident-facing destination cards on `/records` for:
  - public records and FOIA
  - meeting packets and approved minutes
  - budget summaries and annual reports
  - ordinances, zoning, and permit references
- A public `/documents` route now exists and groups those destinations into resident-readable sections for:
  - records requests
  - meeting documents
  - financial documents
  - code references
- The `/documents` page now includes a first-pass downloadable archive of real public reference files with stable URLs under `/documents/archive`.
- A repo publishing workflow now exists so maintainers can add new public files by placing them under `public/documents/archive` and registering them in the central manifest.
- Transparency quick actions now link residents into document-hub destinations instead of generic section anchors.
- Search entries and meeting-related actions now route residents into the new public document destinations where appropriate.

What is still missing:

- Official agenda packets, approved minutes, budget files, annual reports, and ordinance documents themselves are still not posted yet through the new archive workflow
- No CMS-managed document upload workflow or versioned public records library yet
- No true records portal or document repository yet

### Top tasks and homepage routing fixes

Status: Complete

Evidence:

- [src/app/app.ts](../src/app/app.ts)

What is complete:

- `Pay utility bill` now links to `/services#payment-help`.
- `Report a street or utility issue` now links to `/services#issue-report`.
- `Find a meeting or agenda` now links to `/meetings`.
- `Request records, permits, or clerk help` now links to `/services#records-request`.
- The earlier audit claim that these tasks still pointed to generic in-page sections is no longer true.

### Calendar UI and live event publishing state

Status: Complete for the dedicated `/meetings` page

Evidence:

- [src/app/app.ts](../src/app/app.ts)
- [src/app/app.html](../src/app/app.html)
- [src/app/app.scss](../src/app/app.scss)
- [src/app/cms-admin/cms-admin.ts](../src/app/cms-admin/cms-admin.ts)

What is complete:

- The meetings page now clearly tells residents whether they are seeing staff-managed live events or the bundled fallback schedule.
- The next event is visually featured instead of rendering as an undifferentiated card list.
- Live AppSync `Event` records now drive the homepage calendar presentation when they exist.
- The `/admin` operations guide now includes the `Event` model in both the publishing flow and the model coverage summary.

What is still missing:

- The `Event` records still do not carry richer categories, attached agenda URLs, or per-event document attachments.
- The document hub now gives meeting-related calls to action a stable public destination, but the calendar still does not publish real per-meeting files.

### Responsive and mobile coverage

Status: Complete for the compact homepage plus dedicated detail pages

Evidence:

- [e2e/specs/responsive/home.responsive.spec.ts](../e2e/specs/responsive/home.responsive.spec.ts)

What is complete:

- Mobile-specific Playwright coverage exists.
- The responsive suite verifies the compact homepage remains scannable with no horizontal overflow.
- The responsive suite also verifies that key actions remain reachable on `/weather`, `/services`, and `/accessibility` in the mobile viewport.

Validation:

- `npx playwright test e2e/specs/responsive --workers=1` passed with the current expected desktop skips and mobile checks green.

### Smoke coverage for the current homepage

Status: Complete for the compact homepage and the new public detail-page structure

Evidence:

- [e2e/specs/smoke/home.smoke.spec.ts](../e2e/specs/smoke/home.smoke.spec.ts)
- [e2e/specs/smoke/home.navigation.spec.ts](../e2e/specs/smoke/home.navigation.spec.ts)
- [e2e/specs/smoke/home.weather.spec.ts](../e2e/specs/smoke/home.weather.spec.ts)

What is complete:

- Smoke tests now cover the compact landing page scaffold, the dedicated feature pages, records-to-documents navigation, accessibility routing, search destinations, chat behavior, and weather/signup behavior.
- Smoke tests now also verify navigation from the records center into the public document hub.
- Navigation smoke coverage passed in both desktop and mobile Chromium.
- Weather smoke coverage passed in both desktop and mobile Chromium, including alert signup flows.
- Chat smoke coverage passed in both desktop and mobile Chromium.

Validation:

- `npm run test:e2e -- --workers=1` passed with all smoke coverage green inside the broader suite.
- Dedicated feature-page smoke coverage now includes direct checks for `/notices`, `/meetings`, `/services`, and `/contact` rather than only checking that the homepage links exist.

What is still missing:

- The broader smoke suite should still be rerun whenever additional homepage sections change substantially.

### CMS admin route and publishing guidance

Status: Partially complete

Evidence:

- [src/app/cms-admin/cms-admin.ts](../src/app/cms-admin/cms-admin.ts)

What is complete:

- `/admin` is now a read-only operations guide rather than a local browser editor.
- The admin guide documents the Amplify Studio publishing flow.
- The page explicitly maps homepage areas to the relevant Studio models:
  - `SiteSettings`
  - `AlertBanner`
  - `Announcement`
  - `Event`
  - `OfficialContact`

What is still missing:

- This repo does not itself prove that those models are visible and correctly exposed in Amplify Studio for staff on the deployed environment.
- Version history, rollback, staging, and review workflow documentation still need to be added.

## Partially Complete Areas

### Search and discovery

Status: Partially complete, with content-derived homepage search now in place

Evidence:

- [src/app/app.ts](../src/app/app.ts)

What has improved since the original audit:

- Search is no longer limited to a tiny set of older entries.
- The homepage search index is no longer maintained as a second hand-written content list.
- Search results now derive from the current homepage model, including top tasks, meetings, calendar items, service cards, transparency actions, accessibility content, contacts, and notices.
- Search now also picks up live CMS-published contacts, notices, and calendar events, so results can change when staff content changes without a code edit.
- The search index now includes records guides and public document destinations sourced from the shared records-center content instead of a separate search-only definition.
- Search results now route residents into the dedicated public paths instead of relying on one long homepage scroll.

What is still missing:

- No document-library metadata indexing beyond the current resident-facing destination guides.
- No uploaded-file or archive crawl.
- No document crawling or hosted records search
- No external search service for larger archives

### Language access

Status: Partially complete

Evidence:

- [src/app/site-language.ts](../src/app/site-language.ts)
- [src/app/app.spec.ts](../src/app/app.spec.ts)
- [src/app/resident-services/resident-services.ts](../src/app/resident-services/resident-services.ts)
- [src/app/accessibility-support/accessibility-support.ts](../src/app/accessibility-support/accessibility-support.ts)

What is complete:

- English is now the default homepage language when no saved preference exists.
- Residents can still switch languages and keep that selection through the existing local-storage preference.
- Homepage copy is localized.
- The resident-service forms are localized.
- The accessibility-support flow is localized.

What is still missing:

- Translation of future subpages and external workflows
- Translation operations inside Amplify Studio content publishing
- Translation of clerk documents, budget files, records attachments, and permit instructions outside the homepage UI

### Weather alert signup

Status: Partially complete, with live email confirmations now verified

Evidence:

- [src/app/weather-panel](../src/app/weather-panel)
- [infrastructure/severe-weather-signup/app.py](../infrastructure/severe-weather-signup/app.py)
- [README.md](../README.md)

What is complete:

- Frontend signup exists.
- Backend code exists.
- Playwright smoke coverage includes signup behavior.
- The checked-in runtime config is wired to the live severe-weather backend.
- Structured backend logging now records request handling, validation results, and delivery outcomes for signup attempts.
- The official sender is now `alerts@townofwiley.gov`.
- Email confirmations are now working through Amazon SES for the live backend.

What is still missing:

- SMS confirmations are still blocked because Amazon SNS SMS in `us-east-2` reports `IsInSandbox: true` for this account.
- SES and SNS SMS remain separate AWS delivery systems, so SES production access does not remove the SNS SMS sandbox.
- Explicit live unsubscribe journey validation is still pending.

### Deployment and runtime config

Status: Partially complete

Evidence:

- [scripts/generate-runtime-config.mjs](../scripts/generate-runtime-config.mjs)
- [public/status.html](../public/status.html)

What is complete:

- Runtime config generation is in place for chatbot, weather, signup, and CMS settings.
- A lightweight status page exists at `public/status.html`.

What is still missing:

- Build timestamp and Git SHA in runtime config
- Feature flags for staged rollout
- A richer health/status surface that confirms external dependencies instead of serving a static `ok` page

### Town email alias routing and CMS-managed forwarding

Status: SES sending is live in Ohio, the inbound router path is live, and the first Steve alias record is active; bucket hardening and end-to-end mailbox validation are still open

Evidence:

- [amplify/backend/api/townofwiley/schema.graphql](../amplify/backend/api/townofwiley/schema.graphql)
- [src/app/cms-admin/cms-admin.ts](../src/app/cms-admin/cms-admin.ts)
- [infrastructure/email-alias-router/app.py](../infrastructure/email-alias-router/app.py)
- [scripts/deploy-email-alias-router.py](../scripts/deploy-email-alias-router.py)
- [docs/town-email-alias-forwarding-runbook.md](../docs/town-email-alias-forwarding-runbook.md)
- [README.md](../README.md)

What is confirmed:

- The Town needs an AWS-managed way to keep public `townofwiley.gov` addresses stable while forwarding them to each staff member's current inbox.
- The cleanest fit for this repo is a private `EmailAlias` CMS model in Amplify Studio plus an AWS forwarder, not public exposure of destination inboxes through the website.
- `OfficialContact` remains the public contact model for the homepage, while `EmailAlias` is private-only and intended for operational routing.
- The selected AWS method is SES inbound mail handling with S3-backed raw message storage and a Lambda forwarder that looks up the current destination from `EmailAlias` records.

What is complete now:

- A private-only `EmailAlias` model is now scaffolded in the AppSync schema for Studio management.
- The `EmailAlias` backend model is now deployed on the live AppSync API in the `main` environment.
- The `/admin` CMS operations guide now documents `EmailAlias` as part of the Town's CMS-managed operations surface.
- The staff-facing clerk guide now explains how to add, change, and disable `EmailAlias` records for future operations.
- A backend email alias router scaffold now exists under `infrastructure/email-alias-router` with unit tests.
- A repo-backed deployment script now exists to create or update the Lambda, IAM role, S3 ingress bucket, and SES receipt-rule path.
- The alias router now supports split-region operation so inbound processing can run in an SES-receiving region while outbound forwarded mail uses the verified Ohio SES sender.
- A dedicated runbook now documents the deployment and live-test routine for maintainers.
- The `townofwiley.gov` domain is verified in Amazon SES `us-east-2`.
- Easy DKIM is active for the domain in Ohio.
- The SES account in `us-east-2` now has production access enabled.
- Current SES send quotas in Ohio are `50,000` messages per 24 hours and `14` messages per second.
- The live `EmailAlias` DynamoDB table is now `EmailAlias-j7b2x3sh7rcezekekkxxiak7hi-main`.
- The alias router Lambda `TownOfWileyEmailAliasRouter` is now deployed in `us-east-1` and configured to send outbound mail through `us-east-2`.
- The alias ingress bucket `townofwiley-email-alias-570912405222-us-east-1` and active receipt rule set `TownOfWileyAliasForwarding` now exist in `us-east-1`.
- Route 53 now publishes `townofwiley.gov MX 10 inbound-smtp.us-east-1.amazonaws.com` for SES inbound mail.
- The first live `EmailAlias` record is now active for `steve.mckitrick@townofwiley.gov -> bigessfour@gmail.com` without changing the public address residents use.

Implementation implications:

- This should be treated as inbound forwarding first.
- Public alias addresses should remain on the contact cards, but private destination inboxes must stay off the public AppSync read path.
- SES receiving may need to be deployed in a mail-ingress region that supports inbound email even if the rest of the Town stack stays in `us-east-2`.
- If staff later need to send as `townofwiley.gov` from Gmail or another client, that should be handled separately with SES SMTP or Amazon WorkMail after forwarding is stable.

Recommended implementation path:

1. Apply S3 public-access-block settings on `townofwiley-email-alias-570912405222-us-east-1` with a principal that has the missing permission.
2. Create the remaining `EmailAlias` records in Amplify Studio for each Town mailbox alias and current destination inbox.
3. Send live tests for each alias before staff treats the route as production-ready.

What is still missing:

- The missing `s3:PutBucketPublicAccessBlock` step on `townofwiley-email-alias-570912405222-us-east-1`.
- Production test confirmation that each alias forwards to the intended current inbox.

### Utility billing backend and payment processor path

Status: Paystar is selected and scaffolded, but live integration is still open

Evidence:

- [RVS Software home](https://www.rvssoftware.com/)
- [RVS online payment integrations](https://www.rvssoftware.com/onlinepay.php)
- [src/app/payments/paystar-config.ts](../src/app/payments/paystar-config.ts)
- [src/app/payments/paystar-connection.ts](../src/app/payments/paystar-connection.ts)
- [src/app/resident-services/resident-services.ts](../src/app/resident-services/resident-services.ts)
- [infrastructure/paystar-proxy/index.mjs](../infrastructure/paystar-proxy/index.mjs)
- [README.md](../README.md)

What is confirmed:

- The current utility billing system is compatible with an AWS-fronted modernization approach without replacing the clerk's core desktop workflow.
- RVS Mosaics is an on-premise Windows desktop product for municipalities and utility districts, with local data storage rather than a public cloud-native database or public SaaS API.
- RVS publicly lists supported payment integrations, so processor evaluation no longer depends on waiting for a private sales reply.
- Paystar is the selected first processor to implement because its public utility guidance explicitly supports adding a payment link from an existing website, which matches the Town's current Amplify-hosted rollout needs.
- RVS's published payment processor partners are:
  - NexBillPay
  - Paystar
  - PayClix
  - Transaction Warehouse
  - Payment Service Network (PSN)
  - The Payment Group (TPG)
  - Heartland
  - JetPay
- RVS also states publicly that it offers custom payment integration development for processors outside that default list, which keeps a PayTrace or RetrieverDirect-style path plausible if the Town wants to preserve its current processor.
- No public developer API for RVS Mosaics is published. The feasible integration posture is file-based synchronization plus processor-side APIs or RVS-built payment bridges.

What is complete now:

- The homepage payment card now has a Paystar runtime-config scaffold that can expose a direct secure payment action when runtime settings are present.
- A town-managed Paystar proxy scaffold now exists so the frontend can keep a stable launch contract while the live processor setup is finalized.
- The repo runtime-config and secrets workflows now include Paystar-specific settings for hosted mode or future API mode.

Implementation implications:

- The payment work should be planned as an RVS-compatible modernization, not as a rip-and-replace billing replacement.
- The fastest path is likely to keep RVS Mosaics as the billing source of truth and add a modern resident payment layer on top.
- Two viable implementation tracks now exist:
  - Use Paystar as the hosted portal provider first because it has the clearest existing-website onboarding path.
  - Keep the current processor and request a custom RVS integration if RVS confirms timeline and cost are acceptable.
- Bill presentment and balance visibility should assume periodic export or sync from RVS into AWS-managed storage unless RVS or the chosen processor provides a stronger direct interface.

Recommended implementation path:

1. Confirm with the Town how often balances can be exported from RVS today and whether the current workflow is daily, weekly, or on-demand.
2. Set the Town's live Paystar portal URL in runtime config and deploy hosted mode first so residents can leave the payment-help-only state.
3. Call RVS and Paystar to confirm real-time posting, reconciliation behavior, and any implementation-specific setup for the Town's Mosaics environment.
4. Build the resident payment experience as an AWS-hosted portal layer:
   - Amplify Hosting for the public portal
   - Cognito for resident sign-in if account-based history is needed later
   - S3 for secure bill export intake and public receipts or document storage
   - Lambda plus Step Functions for imports, receipt generation, and workflow orchestration
   - DynamoDB for balances, transactions, and portal-facing status data
   - SES for receipts and payment confirmations
   - QuickSight for finance and operational reporting
5. Keep the clerk's day-to-day billing work in RVS Mosaics while the Town website becomes the resident-facing portal and document surface.

What is still missing:

- The live `PAYSTAR_PORTAL_URL` and production deployment switch for the Town's public site.
- Confirmation from RVS and Paystar on real-time versus file-import posting behavior for the Town's specific setup.
- A defined bill-export cadence and secure import workflow into AWS.
- Receipts, reconciliation reporting, and production cutover validation.

## Still Open Todos

### Critical

1. Complete the live Paystar rollout for the billing-help flow, including production runtime config, RVS posting confirmation, receipts, and reconciliation.
2. Deploy SES-backed alias forwarding for `townofwiley.gov` mailboxes and verify each Town alias reaches the correct current inbox.
3. Replace mailto-style issue reporting with a true request backend and status tracking.
4. Replace the records and permit intake flow with a backend that supports uploads, routing rules, and request history.
5. Deploy the Easy Peasy chat proxy and set `EASYPEASY_API_ENDPOINT` so production chat can move from `mode: 'none'` to a live integration.
6. Verify the live Amplify Studio environment exposes the expected content models and staff publishing path.

### High priority

1. Turn the new `/documents` destinations into a downloadable archive with real published files and a clerk-friendly document publishing workflow.
2. Extend the new content-derived search into uploaded document metadata and larger document indexing.
3. Add operational accessibility artifacts: audit cadence, media checklist, and content-publishing accessibility rules.

### Medium priority

1. Decide whether to keep the site as a single-page app or introduce routed subpages for payments, archives, and permits.
2. Expand the contact directory beyond the current hardcoded leadership groups.
3. Add notice archival and categorization when content volume grows.
4. Add runtime metadata and feature flags to support safer gradual rollout.

### Lower priority

1. Expand AppSync and GraphQL beyond CMS reads into real resident-service mutations.
2. Reduce `app.scss` size or rebalance the style budget.
3. Add broader E2E coverage for language persistence, records flows, issue flows, accessibility checks, and confirmation journeys.
4. Extend the clerk CMS guide with rollback, staging, review, and training procedures.

## Next Highest Visually Confirmable Task

Selected item:

1. High priority #1 remains in progress: keep filling the new `/documents/archive` workflow with official packets, minutes, budget files, annual reports, and ordinance documents as those files are prepared for public posting.

Why this is the next best visually confirmable task:

- The `/documents` route now works as a stable public hub and the homepage search now routes residents into those destinations, so the next clear public-facing improvement is to replace guidance-only sections with actual downloadable files.
- Residents will be able to verify the change immediately when meeting packets, approved minutes, budget documents, and ordinance references become directly downloadable instead of being described as destinations.
- It builds directly on the current document hub and search work without requiring residents to understand the internal CMS model structure.
- It remains the highest-ranked remaining item that creates an obvious visible improvement on the public site before deeper backend intake systems are finished.

Suggested visual acceptance signals:

- The `/documents` sections show real downloadable files instead of guidance-only copy.
- Residents can open at least meeting, finance, and code-reference files directly from the public document hub.
- Records-center and homepage search flows still route into the same stable destinations, but those destinations now contain published files.

Why the other open items are not the next visually confirmable pick:

- Critical payment, issue-reporting, and records-backend tasks are important, but they are more backend-heavy and harder to confirm safely through a simple visual pass.
- Search has now moved off the duplicate hand-maintained homepage list, so the sharper remaining visual gap is the lack of real published files behind the document destinations.
- Accessibility operations artifacts matter, but they are more procedural than visually demonstrable in the homepage itself.

## Audit Items That Were Stale In The Attached File

The following claims in the attached audit were no longer accurate by the time this Markdown version was created:

- Responsive coverage was not missing. The responsive Playwright spec already existed.
- Accessibility statement and barrier-reporting were not missing. They already existed on the homepage.
- Top-task links were not still pointing to `#services`; they were already updated to direct intake anchors.
- The homepage did not just have transparency placeholders anymore; it already had a records center and transparency quick actions.
- Search was no longer limited to the earlier smaller item set; it had already been expanded.

## Recommended Next Build Order

1. Live Paystar rollout plus backend intake for issue reporting and permit or records workflows
2. Extend search into uploaded document metadata and larger archive indexing
3. Production chat deployment
4. Downloadable archive files and hosted records library on top of `/documents`
5. CMS operations hardening and publishing governance
