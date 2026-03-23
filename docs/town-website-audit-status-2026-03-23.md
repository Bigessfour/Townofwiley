# Town of Wiley Website Audit Status

Updated: March 23, 2026

This document converts the attached audit into Markdown and updates it against the current repository state. It supersedes the stale March 2026 snapshot where several homepage features were still listed as missing even though they are now implemented in the repo.

## Executive Summary

- The homepage is no longer just a static brochure page. It now includes guided resident-service intake, a records/document center, an accessibility statement and barrier-report flow, expanded search entries, mobile-responsive Playwright coverage, and a richer calendar section that makes live event publishing visible.
- English is now the default homepage language when no saved preference exists, while resident-selected language still persists through local storage.
- Several audit items are still open, but they are now mostly backend and operational gaps rather than missing homepage UI.
- Focused unit and homepage smoke coverage are now green for the current calendar UI after the stale records-center assertion was corrected.
- The highest-value remaining work is still the same general theme: connect the homepage workflows to real backend systems instead of mailto-style routing and seeded content.
- Utility billing implementation now has a clearer path: the Town can keep RVS Mosaics as the clerk-facing billing system while integrating one of RVS's published payment partners or commissioning a custom bridge.
- Paystar is now the selected first implementation target because it has the clearest website-link onboarding path for an Amplify-hosted resident portal while remaining compatible with RVS Mosaics.

## Current Validation Snapshot

- Focused app unit coverage for the homepage language default is green.
- Focused homepage smoke coverage is green in both desktop and mobile Chromium for the updated calendar UI.
- The earlier homepage smoke failure on the records-center assertion was stale test text and has now been corrected in source.

## What Is Complete Now

### Resident service intake flows

Status: Complete on the homepage as guided intake

Evidence:

- [src/app/resident-services/resident-services.ts](../src/app/resident-services/resident-services.ts)
- [src/app/app.ts](../src/app/app.ts)

What is complete:

- Residents can now start three structured workflows directly from the homepage:
  - utility payment help
  - street or utility issue reporting
  - records, permits, or clerk help
- The top-task links no longer point to the generic `#services` section. They now route directly to the relevant intake cards.
- These forms are bilingual and build structured messages instead of leaving residents with a blank email.

What is still missing:

- No live Paystar production configuration or RVS posting confirmation in the resident-facing site yet
- No backend case tracking or request status timeline
- No file uploads for permits or licensing workflows

### Accessibility statement and barrier reporting

Status: Complete on the homepage as a public-facing workflow

Evidence:

- [src/app/accessibility-support/accessibility-support.ts](../src/app/accessibility-support/accessibility-support.ts)
- [src/app/app.ts](../src/app/app.ts)

What is complete:

- A published accessibility statement now exists on the homepage.
- Residents can prepare an accessibility barrier report from a dedicated form.
- The barrier-report flow includes direct Town Hall and clerk contact paths.
- The search experience now includes accessibility and barrier-report discovery.

What is still missing:

- No documented quarterly audit log in the repo
- No formal media alt-text and caption operations checklist yet

### Records center and transparency entry points

Status: Partially complete

Evidence:

- [src/app/records-center/records-center.ts](../src/app/records-center/records-center.ts)
- [src/app/app.ts](../src/app/app.ts)

What is complete:

- The records area now has real guidance cards for:
  - public records and FOIA
  - meeting packets and approved minutes
  - budget summaries and annual reports
  - ordinances, zoning, and permit references
- Transparency quick actions now link residents into the records form, calendar, and contact sections.

What is still missing:

- No live archive of agenda packets, minutes, budgets, annual reports, or ordinances
- No true records portal or document repository
- The current experience is routing and guidance, not a hosted records library

### Top tasks and homepage routing fixes

Status: Complete

Evidence:

- [src/app/app.ts](../src/app/app.ts)

What is complete:

- `Pay utility bill` now links to `#payment-help`.
- `Report a street or utility issue` now links to `#issue-report`.
- `Request records, permits, or clerk help` now links to `#records-request`.
- The earlier audit claim that these tasks still pointed to `#services` is no longer true.

### Calendar UI and live event publishing state

Status: Complete for current homepage scope

Evidence:

- [src/app/app.ts](../src/app/app.ts)
- [src/app/app.html](../src/app/app.html)
- [src/app/app.scss](../src/app/app.scss)
- [src/app/cms-admin/cms-admin.ts](../src/app/cms-admin/cms-admin.ts)

What is complete:

- The homepage calendar now clearly tells residents whether they are seeing staff-managed live events or the bundled fallback schedule.
- The next event is visually featured instead of rendering as an undifferentiated card list.
- Live AppSync `Event` records now drive the homepage calendar presentation when they exist.
- The `/admin` operations guide now includes the `Event` model in both the publishing flow and the model coverage summary.

What is still missing:

- The `Event` records still do not carry richer categories, attached agenda URLs, or document destinations.
- The calendar still needs document-level publishing behind agenda, packet, minutes, and ordinance links.

### Responsive and mobile coverage

Status: Complete for current homepage scope

Evidence:

- [e2e/specs/responsive/home.responsive.spec.ts](../e2e/specs/responsive/home.responsive.spec.ts)

What is complete:

- Mobile-specific Playwright coverage exists.
- The spec verifies no horizontal overflow and confirms the key resident-service and accessibility actions remain reachable on mobile.

Validation:

- `npx playwright test e2e/specs/responsive --project=mobile-chromium` passed.

### Smoke coverage for the current homepage

Status: Complete for current homepage scope

Evidence:

- [e2e/specs/smoke/home.smoke.spec.ts](../e2e/specs/smoke/home.smoke.spec.ts)
- [smoke-report.json](../smoke-report.json)

What is complete:

- Smoke tests now cover the resident-service cards, records-center cards, and accessibility barrier reporting.
- Navigation smoke coverage passed in both desktop and mobile Chromium.
- Weather smoke coverage passed in both desktop and mobile Chromium, including alert signup flows.
- Chat smoke coverage passed in both desktop and mobile Chromium.

Validation:

- `npx playwright test e2e/specs/smoke/home.smoke.spec.ts --project=desktop-chromium --project=mobile-chromium` passed with 4 tests passed.
- The earlier records-center assertion drift was corrected in source, and the homepage scaffold smoke test now passes again.

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

Status: Partially complete

Evidence:

- [src/app/app.ts](../src/app/app.ts)

What has improved since the original audit:

- Search is no longer limited to a tiny set of older entries.
- The search index now includes records guides, accessibility reporting, calendar access, contact routing, and resident-service flows.

What is still missing:

- Search is still hardcoded in the client.
- No CMS-driven indexing
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

Status: Partially complete

Evidence:

- [src/app/weather-panel](../src/app/weather-panel)
- [infrastructure/severe-weather-signup/app.py](../infrastructure/severe-weather-signup/app.py)

What is complete:

- Frontend signup exists.
- Backend code exists.
- Playwright smoke coverage includes signup behavior.

What is still missing:

- End-to-end delivery verification for real email and SMS channels
- Unsubscribe-token handling
- Explicit double-opt-in confirmation journey validation in production

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

1. Publish actual document destinations for agendas, minutes, budgets, annual reports, ordinances, and code references.
2. Move search from hardcoded homepage metadata to dynamic content and document indexing.
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

1. High priority #1: Publish actual document destinations for agendas, minutes, budgets, annual reports, ordinances, and code references.

Why this is the next best visually confirmable task:

- It is now the highest-ranked remaining item that produces an obvious resident-facing change after the calendar UI completion.
- It makes the existing calendar, records center, and transparency actions materially more useful instead of merely better presented.
- Residents will be able to confirm the difference immediately because calendar and records calls to action can resolve to real public documents instead of guidance-only routes.
- It builds directly on the completed live calendar surface by giving meeting and records entries real destinations.

Suggested visual acceptance signals:

- Agenda and packet links resolve to actual published destinations instead of generic contact routing.
- Records-center calls to action open real document or archive destinations where those resources exist.
- Residents can confirm budget, annual report, ordinance, and code references from the homepage without falling back to email-only guidance.
- Smoke coverage can assert concrete document destinations instead of placeholder text only.

Why the other open items are not the next visually confirmable pick:

- Critical payment, issue-reporting, and records-backend tasks are important, but they are more backend-heavy and harder to confirm safely through a simple visual pass.
- Dynamic search is visible, but it is still ranked below document publishing and depends on broader content indexing decisions.
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
2. Published document destinations and hosted records archive
3. Production chat deployment
4. Dynamic search and document indexing
5. CMS operations hardening and publishing governance
