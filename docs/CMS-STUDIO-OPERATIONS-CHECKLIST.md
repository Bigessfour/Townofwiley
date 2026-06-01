# Amplify Console (Gen 2) & AWS operations checklist (manual)

Use this with [amplify-gen2-migration-plan.md](./amplify-gen2-migration-plan.md) and [CMS-MODEL-ROUTE-MATRIX.md](./CMS-MODEL-ROUTE-MATRIX.md). Staff bookmarks: **https://townofwiley.gov/admin** (links to Console Data manager).

**Routine verification:** [CMS-VERIFY-STUDIO.md](./CMS-VERIFY-STUDIO.md) (name kept for history — steps use Console Data manager, not Gen 1 Studio).

## Access & roles

- [ ] Every content editor has accepted a **Studio invitation** (email from AWS).
- [ ] Roles match need: **manage-only** vs full access per [Studio team access](https://docs.amplify.aws/gen1/angular/tools/console/) docs.
- [ ] Editors know to use **Data Manager** (data browser) for CRUD on `SiteSettings`, `Announcement`, `PublicDocument`, etc.

## Hosting & preview

- [ ] **Branch previews** (Amplify Hosting) used for risky content or schema changes before merging to `main`.
- [ ] Production branch deploy shows **green** build; `public/runtime-config.js` on the live host includes `cms.appSync.region`, `apiEndpoint`, and `apiKey` (keys redacted in docs—verify in browser Network tab or Amplify env only).

## Storage & documents

- [ ] **Newsletter PDFs** uploaded under keys like `documents/newsletter/<file>.pdf`; `Announcement.attachmentKey` matches that key when `announcementKind` is `newsletter`.
- [ ] **PublicDocument** `href` / storage paths align with the section map on `/admin` → Document publishing (`sectionId` values: `meeting-documents`, `financial-documents`, etc.).

## GraphQL & security

- [ ] **API key** for public CMS read is rotated per [appsync-api-key-rotation-runbook.md](./appsync-api-key-rotation-runbook.md); update Amplify **and** GitHub secrets `APPSYNC_CMS_*`, redeploy `main`, run `npm run verify:runtime-config-cms`.
- [ ] **EventBridge reminder** deployed: `python scripts/deploy-appsync-key-rotation-reminder.py --sns-email <ops@email>`.
- [ ] **EmailAlias** is never given `public` + `apiKey` + `read` in schema (staff-only in Studio).

## Verification after changes

- [ ] On **https://townofwiley.gov/admin**, run **Test CMS Connection** and confirm success.
- [ ] After each **PublicDocument** save, open **/documents** and confirm the file card appears in the correct section (hard refresh once if needed).
- [ ] Spot-check **homepage**, **/news**, **/documents**, and **/contact** after CMS edits.

## Gen 2 note

Production cutover targets Hosting branch **`gen2-main`** and Console **Data manager**. Gen 1 Studio is deprecated after cutover; see [amplify-gen2-migration-plan.md](./amplify-gen2-migration-plan.md).
