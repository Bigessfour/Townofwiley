# Amplify Studio & AWS operations checklist (manual)

Use this alongside the [Amplify Gen 1 Studio overview](https://docs.amplify.aws/gen1/angular/tools/console/) and the repo [CMS model route matrix](./CMS-MODEL-ROUTE-MATRIX.md). The hosted Studio URL for this app is configured via `CLERK_SETUP_*` / runtime config; staff bookmarks: **https://townofwiley.gov/admin**.

**Routine verification task:** follow [CMS-VERIFY-STUDIO.md](./CMS-VERIFY-STUDIO.md) to confirm Studio Data Manager and the live site’s AppSync connection are working.

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

- [ ] **API key** for public CMS read is rotated per AWS policy; after rotation, Amplify env vars `APPSYNC_CMS_*` updated and app **redeployed** so `generate-runtime-config` emits new `runtime-config.js`.
- [ ] **EmailAlias** is never given `public` + `apiKey` + `read` in schema (staff-only in Studio).

## Verification after changes

- [ ] On **https://townofwiley.gov/admin**, run **Test CMS Connection** and confirm success.
- [ ] Spot-check **homepage**, **/news**, **/documents**, and **/contact** after CMS edits.

## Gen 1 maintenance note

Amplify Gen 1 is in **maintenance mode** (see Studio doc banner). Plan eventual **Gen 2** migration separately; it does not block current Studio + Data Manager workflow.
