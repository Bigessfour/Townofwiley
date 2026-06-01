# CMS activity: Verify the CMS is functioning in Amplify Studio

Use this checklist when onboarding staff, after AWS changes, or if the public site shows **bundled fallback** text instead of live content. Reference: [Amplify Studio (Gen 1)](https://docs.amplify.aws/gen1/angular/tools/console/) — Data Manager is the supported place to confirm and edit CMS records.

## Prerequisites

- You can sign in to **hosted Amplify Studio** (use the **Open Amplify Studio Data Manager** or **Open Studio Home** button on [https://townofwiley.gov/admin](https://townofwiley.gov/admin), or your saved Studio URL).
- You have a role that can open **Data** / **Data Manager** and see models (not access denied).

## Steps (about 5 minutes)

### 1. Confirm Studio loads and Data Manager opens

1. Open Studio from `/admin` (recommended) or your bookmark.
2. From the Studio home environment for the **main** backend, open **Data Manager** (sometimes labeled **Content** / **Data** depending on Studio UI version).
3. Confirm you see models such as **SiteSettings**, **Announcement**, **OfficialContact**, **PublicDocument** — not an empty list and not an error page.

**If access is denied:** stop here; your IT contact must fix **Studio invitations** or IAM/role permissions (see [CMS-STUDIO-OPERATIONS-CHECKLIST.md](./CMS-STUDIO-OPERATIONS-CHECKLIST.md)).

### 2. Confirm you can read live records (no edit required)

1. Open **SiteSettings** and confirm at least one record exists with expected town/hero fields.
2. Open **OfficialContact** and confirm rows exist whose **`id`** is exactly `town-information` and `city-clerk` (required for footer, permits, and services — see [CMS-MODEL-ROUTE-MATRIX.md](./CMS-MODEL-ROUTE-MATRIX.md)).
3. Optionally open **Announcement** or **PublicDocument** and confirm lists load without errors.

**If lists are empty but the site looks fine:** the site may be using **fallback** bundled copy; still verify step 3 below.

### 3. Confirm the public website can reach AppSync (same API as Studio)

1. Open [https://townofwiley.gov/admin](https://townofwiley.gov/admin).
2. In **CMS Connection Status**, click **Test CMS Connection**.
3. Expect status **Connected** (and no red error guidance).

**If connection fails:** the live site may not receive CMS updates until **Amplify environment variables** (`APPSYNC_CMS_ENDPOINT`, `APPSYNC_CMS_API_KEY`, `APPSYNC_CMS_REGION`) are correct and a **new deploy** has regenerated `runtime-config.js`. IT follows [CMS-STUDIO-OPERATIONS-CHECKLIST.md](./CMS-STUDIO-OPERATIONS-CHECKLIST.md).

### 4. Confirm the homepage is reading Studio (not only fallback)

1. On `/admin`, read the gray **CMS status** line under the header (persistence summary).
2. You want wording that indicates content is **coming from Amplify Studio through AppSync**, not that runtime config is missing or the site is showing **bundled fallback** only.

### 5. Optional quick public spot-check

After Studio and `/admin` both look healthy, open the homepage and one other route (e.g. **/news** or **/documents**) and confirm recent Studio edits appear after a normal refresh (not required for every verification).

## Record outcome

- Date: **\*\***\_\_\_**\*\***
- Studio Data Manager reachable: Yes / No
- `/admin` Test CMS Connection: Connected / Failed
- Notes: **\*\***\_\_\_**\*\***

## Related documents

- [CMS-STUDIO-OPERATIONS-CHECKLIST.md](./CMS-STUDIO-OPERATIONS-CHECKLIST.md) — broader AWS and hosting checks.
- [CMS-MODEL-ROUTE-MATRIX.md](./CMS-MODEL-ROUTE-MATRIX.md) — models, routes, and stable contact IDs.
- [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md) — day-to-day editing tasks.
