# Gen 1 CMS & AWS operations checklist (manual)

Use this with [CMS-MODEL-ROUTE-MATRIX.md](./CMS-MODEL-ROUTE-MATRIX.md) and [gen2-decommissioned.md](./gen2-decommissioned.md). Staff bookmark: **https://townofwiley.gov/admin**.

**Routine verification:** [CMS-VERIFY-STUDIO.md](./CMS-VERIFY-STUDIO.md).

## Access & roles

- [ ] Every content editor is in Cognito group **Staff** (`us-east-2_DmY7BCBIp`) — see [admin-auth-runbook.md](./admin-auth-runbook.md).
- [ ] Editors use in-app `/admin` forms first; IT may use AppSync Queries console for API `j7b2x3sh7rcezekekkxxiak7hi`.

## Hosting & deploy

- [ ] Static site deploy green: `npm run deploy:static-site`.
- [ ] Live `public/runtime-config.js` includes Gen 1 `cms.appSync.apiEndpoint` (`327diwc6…`) — verify with `npm run verify:runtime-config-cms`.

## Storage & documents

- [ ] **Newsletter PDFs** uploaded under keys like `documents/newsletter/<file>.pdf`; `Announcement.attachmentKey` matches when `announcementKind` is `newsletter`.
- [ ] **PublicDocument** `href` / storage paths align with `/admin` → Document publishing (`sectionId`: `meeting-documents`, `financial-documents`, etc.).

## GraphQL & security

- [ ] **API key** rotated per [appsync-api-key-rotation-runbook.md](./appsync-api-key-rotation-runbook.md); update GitHub secrets `APPSYNC_CMS_*`, redeploy, run `npm run verify:runtime-config-cms`.
- [ ] **EventBridge reminder** deployed: `python scripts/deploy-appsync-key-rotation-reminder.py --sns-email <ops@email>`.
- [ ] **Presigned CMS uploads** on `/admin` (hero images → `https://townofwiley.gov/media/cms/hero/…`; PDFs → storage key). Lambda: `TownOfWileyCmsMediaUpload` — `npm run deploy:cms-media-upload`.
- [ ] **Monday key deletion** after rotation bake-in: `npm run verify:appsync-key-deletion-schedule` (expect one active key after schedule fires).

## Verification after changes

- [ ] On **https://townofwiley.gov/admin**, run **Test CMS Connection** — Connected.
- [ ] After **PublicDocument** save, open **/documents** and confirm the file card (hard refresh once if needed).
- [ ] Spot-check **homepage**, **/news**, **/documents**, **/contact** after CMS edits.

## Deprecated (do not use)

Amplify Gen 2, `gen2-main`, Amplify Data manager, and `amplify_outputs.json` — see [gen2-decommissioned.md](./gen2-decommissioned.md).
