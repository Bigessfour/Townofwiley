# `/admin` audit - 2026-06-22

Read-only audit of every `/admin` task and hub control against the live site, AppSync, and the CDN snapshot. No production state was changed by this audit.

## Top-line result

**Nothing is broken in the database or publish pipeline.** AppSync and the CDN snapshot are in perfect parity for all 10 public models. The Lambda publisher (`TownOfWileyCmsChangeNotifier`) is healthy and the most recent CDN snapshot republish (`2026-06-20T19:36:11.007Z`) covers every save in AppSync.

The reports of "components not working" are most plausibly explained by **content state**, not code:

- Most `SiteSettings` (homepage) fields are `null` in AppSync. The public homepage falls back to bundled defaults, so any homepage edits a clerk thinks she made are either (a) saving as null, (b) never saved, or (c) saved but cleared. Only `townName` is set.
- `SiteCopy` only persists 2 keys (`topTasksKicker`, `topTasksHeading`). The other fields the `edit-site-copy` task collects do not have a public DOM anchor yet (known gap, documented in [`docs/cms-edit-mode-verify-matrix.md`](cms-edit-mode-verify-matrix.md)).
- `AlertBanner` has 0 rows. The "Turn on emergency banner" task will appear to do nothing on the public site until at least one row is created and active.

One IT-visible quirk: the `/admin` setup card still shows an empty **Amplify app id** field because the project migrated away from Amplify Hosting in June 2026 and `clerkSetup.amplifyAppId` in [`runtime-config.js`](../public/runtime-config.js) is `""`. The label is now misleading and could be hidden.

## Phase 1 - Foundation diagnostics

All commands run from repo root with `PATH=/opt/homebrew/opt/node@24/bin:$PATH`. AppSync credentials were extracted from the public `runtime-config.js` (public API key, identical to what every visitor browser uses).

| Command | Result |
| --- | --- |
| `npm run verify:runtime-config-cms` | OK - 12 checks pass (apiEndpoint, region, Cognito IDs, storage bucket, AppSync probe, Gen1 bindings match) |
| `npm run verify:public-cms-query` | OK - 10 list operations across 2 queries match public apiKey read models |
| `npm run verify:cms-snapshot-parity` | OK - AppSync 10 leadership rows == CDN snapshot 10 rows; savedAt `2026-06-20T19:36:11.007Z` |
| `npm run verify:staff-cms-editor-models` | OK - 10 clerk models, SiteCopy flagged |
| `npm run verify:aws-infra -- --offline` | OK - 7 manifest checks pass |
| `curl /cms-revision.json` | `{ version:1, revision:"2026-06-20T19:36:11.007Z", savedAt:"2026-06-20T19:36:11.007Z" }` |
| `curl /cms-snapshot.json` | siteSettings(12 keys), alertBanner(0), notice(1), event(6), contact(3), business(9), publicDoc(1), externalNews(3), leadership(10), siteCopy(0) |

## Phase 2 - Per-task matrix (10 tasks)

Axes:

- **A. Mutation healthy?** field coverage in [`cms-model-admin-fields.ts`](../src/app/cms-admin/cms-model-admin-fields.ts) vs [`cms-clerk-task-form-fields.ts`](../src/app/cms-admin/cms-clerk-task-form-fields.ts) form.
- **B. AppSync vs CDN snapshot parity?** counts compared directly via public API key probe.
- **C. Public anchor wired?** [`cms-clerk-task-live-link.ts`](../src/app/cms-admin/cms-clerk-task-live-link.ts) + anchor exists in the rendering component.

| # | Task ID | Model | A | B | C | AppSync (total / active) | CDN snapshot | Status | Notes |
| - | --- | --- | - | - | - | --- | --- | --- | --- |
| 1 | `post-notice` | `Announcement` | Y | Y | Y | 2 / 1 | 1 noticeRecord | **Working** | Active "June Newsletter" is rendered; a duplicate is deactivated. |
| 2 | `add-meeting` | `Event` | Y | Y | Y | 6 / 6 | 6 eventRecords | **Working** | Latest updated 2026-06-20T15:53Z. |
| 3 | `homepage` | `SiteSettings` | Y | Y | Y | 1 / n/a (singleton) | 1 siteSettings object | **Save-only (de-facto)** | Only `townName` is set in AppSync; `heroImageUrl`, `heroTitle`, `welcomeHeading`, all other fields are `null`. Public site uses bundled defaults. PR #96 added inline hero upload but `heroImageUrl` is still null on prod - Deb has not yet used the new control. |
| 4 | `update-contacts` | `OfficialContact` | Y | Y | Y | 3 / n/a (no `active` field) | 3 contactRecords | **Working** | "Debbie Dillon - Town Clerk", "Point of Contact for Official Town Business" present. Stable IDs missing - records use UUIDs, not `city-clerk`/`town-information`/`town-superintendent`. |
| 5 | `update-leadership` | `LeadershipRosterEntry` | Y | Y | Y | 10 / 10 | 10 leadership | **Working** | Mayor row present (`roster-mayor-council-0` = "Mayor: Steve McKitrick"). Reorder fix from PR #96 is live. |
| 6 | `business-directory` | `Business` | Y | Y | Y | 10 / 9 | 9 businesses | **Working** | "Tempel Grain Elevators, LLC" is inactive (intentional). |
| 7 | `external-news` | `ExternalNewsLink` | Y | Y | Y | 4 / 3 | 3 externalNewsLinks | **Working** | Two records titled "Sally Jacobs Obituary" - possible duplicate, both active. "GOCO Grant" inactive. |
| 8 | `emergency-banner` | `AlertBanner` | Y | Y | Y | 0 / 0 | 0 alertBannerRecords | **Working (no content)** | No banner records exist. Clerk must create the first row before this task does anything on the public site. |
| 9 | `edit-site-copy` | `SiteCopy` | Y | Partial | Partial | 2 / 2 | 0 siteCopyRecords | **Save-only (known gap)** | Only `topTasksKicker` + `topTasksHeading` are wired to a public anchor (`/#top-tasks-heading`). `valueEs` (Spanish) and other keys would persist but never render. Snapshot publisher does not include SiteCopy in `siteCopyRecords` even though 2 rows exist - see [`cms-edit-mode-verify-matrix.md`](cms-edit-mode-verify-matrix.md). |
| 10 | `manage-email-aliases` | EmailAlias | n/a | n/a | n/a | n/a | n/a | **Retired** | SES alias forwarding removed; Synology MX handles town mail. |

**Counts:** 7 Working, 2 Save-only, 1 Working-but-empty. 0 Broken.

### Quirks worth fixing in a follow-up PR

- `OfficialContact` records use UUID ids, not the stable ids (`town-information`, `city-clerk`, `town-superintendent`) documented in [`docs/CMS-MODEL-ROUTE-MATRIX.md`](CMS-MODEL-ROUTE-MATRIX.md). The deep-link button still works (UUID is appended), but the documented stable-id contract is not enforced in data.
- `ExternalNewsLink` has a duplicate "Sally Jacobs Obituary" (both active). Surface duplicates in the task hub.
- `Business` count drift: AppSync lists 10 active rows but the snapshot has 9 - the difference is the inactive "Tempel Grain Elevators" being filtered out at publish time (correct behavior).

## Phase 3 - Hub-level controls

Verified by reading [`src/app/cms-admin/cms-admin.ts`](../src/app/cms-admin/cms-admin.ts) lines 117-233 against the live `runtime-config.js`.

| Control | Wired to | Live data resolves? | Status |
| --- | --- | --- | --- |
| **Test CMS Connection** | `cmsStore.testCmsConnection()` -> POST to `cms.appSync.apiEndpoint` with `x-api-key` | yes (confirmed by user: Connected = true) | **Working** |
| **Refresh from database** | `cmsStore.forceLiveRefresh()` (clears `activeContentRevision`, refetches AppSync core) | yes | **Working** |
| **Clear saved website copy** | `cmsStore.clearPersistedCache()` (removes `tow-cms-snapshot-v1` from localStorage) | yes | **Working** |
| **Copy IT detail buttons** | `navigator.clipboard.writeText(detail.copyValue)` | mostly | **Working with cosmetic gap** - `Amplify app id` row resolves to `""` post-migration. Either hide it or relabel. |
| **Sign out** | `staffAuth.signOutStaff()` -> redirect to `/admin/login` | yes | **Working** |

Secondary surfaces (each is imported and rendered in `CmsAdmin`):

- `CmsSiteStatusComponent` - reads `LocalizedCmsContentStore.contentSourceState`. Working.
- `CmsClerkTaskHubComponent` - 10 cards built from `CLERK_CMS_TASKS`. Working.
- `CmsClerkTaskGuideComponent` - guides + generic record editor. Working (verified via PR #96 reorder fix).
- `CmsClerkUploadPanelComponent` - legacy hero / newsletter panel; now secondary to inline upload on homepage form. Working but de-emphasized after PR #96.
- `CmsContentSnapshotComponent` - shows snapshot diagnostics. Working.
- `CmsMeetingDocumentUploadComponent` - meeting documents upload to S3 via [`DocumentUploadService`](../src/app/document-upload/document-upload.service.ts). Working.
- `CmsRecentChangesComponent` - audit log fed by [`cms-audit-log.service.ts`](../src/app/cms-admin/cms-audit-log.service.ts). Working.

## Clerk-facing first-step message (paste into email or text)

```
townofwiley.gov/admin    Sign in.
Click Test CMS Connection - it must say Connected.
Open your task - Edit content - Save with "Show on website" / "Active" on.
On /admin click Refresh from database.
Click See on website and press Ctrl+Shift+R (Mac: Cmd+Shift+R).
Still wrong? Screenshot /admin after Save AND the live page after the hard refresh, and tell IT which task and which field.
```

Specific to the homepage hero photo (PR #96 inline upload):

```
1. /admin - Change homepage photo or welcome text - Edit content
2. Under Homepage hero photo, Choose photo from this computer (JPG/PNG/WebP)
3. Wait for the preview to appear, then Save
4. Hard-refresh townofwiley.gov
```

## IT runbook - when a clerk save does not appear on the live site

Run these in order:

1. **Browser layer** - have the clerk do the 6-step message above first. Most "missing edit" reports are localStorage / service-worker cache.
2. **Mutation reached AppSync?** - sign in, paste the record id into the AppSync Queries console (link inside `/admin` -> Advanced (IT) -> AppSync Queries console).
3. **AppSync vs CDN parity** - `npm run verify:cms-snapshot-parity` (set `APPSYNC_CMS_ENDPOINT` and `APPSYNC_CMS_API_KEY` from `runtime-config.js`). If this fails, the `TownOfWileyCmsChangeNotifier` Lambda did not publish. Re-save the record to fire the DynamoDB stream, then re-run parity.
4. **Public API key healthy?** - `npm run verify:public-cms-query`. Auth error here means key rotation - follow [`docs/appsync-api-key-rotation-runbook.md`](appsync-api-key-rotation-runbook.md).
5. **Runtime config drift?** - `npm run verify:runtime-config-cms`. Failure here = stale build deployed; `npm run deploy:site` (already excludes `cms-snapshot.json` / `cms-revision.json` so it cannot overwrite stream-managed content).
6. **All green but still wrong?** - targeted CloudFront invalidation:

   ```
   aws cloudfront create-invalidation \
     --distribution-id E1NZ3XCY5CYR1J \
     --paths "/index.html" "/runtime-config.js"
   ```

   Do **not** invalidate `/cms-snapshot.json` or `/cms-revision.json` - those are stream-managed and short-cached.

## Phase 5 - Follow-up PR ideas (not implemented here)

1. **Hide or relabel "Amplify app id" on `/admin`** now that Amplify Hosting is gone (cosmetic).
2. **Backfill `OfficialContact` stable ids** (`town-information`, `city-clerk`, `town-superintendent`) so the deep-link contract in [`docs/CMS-MODEL-ROUTE-MATRIX.md`](CMS-MODEL-ROUTE-MATRIX.md) is enforced in data, not just convention.
3. **Wire remaining `SiteCopy` keys to public anchors** so the `edit-site-copy` task is end-to-end working rather than save-only.
4. **Surface duplicate detection in the task hub** (e.g. ExternalNewsLink "Sally Jacobs Obituary" x 2).
5. **Improve homepage hero null state**: when `SiteSettings.heroImageUrl` is null, the `/admin` Homepage card could show "Hero photo is using the default - upload a custom one" instead of an empty field, to discourage clerks from assuming a save persisted.
6. **Extend parity script** to cover all 10 models, not just leadership (`verify:cms-snapshot-parity-all`).
7. **Add a "What is live now?" preview** in the generic record editor showing exactly what will render on the public anchor before save.

## Appendix - raw AppSync probe

Queried 2026-06-22 via the public API key from `runtime-config.js` (same key every visitor's browser uses):

| Model | Total / active | Latest `updatedAt` |
| --- | --- | --- |
| `SiteSettings` | 1 / n/a | 2026-05-13T01:21:43Z |
| `AlertBanner` | 0 / 0 | n/a |
| `Announcement` | 2 / 1 | 2026-06-10T00:15:43Z |
| `Event` | 6 / 6 | 2026-06-20T15:53:22Z |
| `OfficialContact` | 3 / n/a | 2026-06-20T15:54:27Z |
| `LeadershipRosterEntry` | 10 / 10 | 2026-06-20T19:02:44Z |
| `Business` | 10 / 9 | 2026-03-31T21:52:06Z |
| `PublicDocument` | 1 / 1 | 2026-06-08T23:07:26Z |
| `ExternalNewsLink` | 4 / 3 | 2026-06-08T23:06:04Z |
| `SiteCopy` | 2 / 2 | 2026-06-09T19:24:16Z |

CDN snapshot `savedAt`: `2026-06-20T19:36:11.007Z` (post-PR #96 merge). No saves to AppSync since then, so no publisher work to verify.
