# CMS activity: Verify Gen 2 Data manager and live AppSync

Use this checklist when onboarding staff, after AWS changes, or if the public site shows **bundled fallback** text instead of live content. Reference: [Manage Data with Amplify console](https://docs.amplify.aws/angular/build-a-backend/data/manage-with-amplify-console/) (Gen 2 **Data manager** on branch **`main`**).

## Prerequisites

- You can sign in to the **AWS Amplify Console** (link from [https://townofwiley.gov/admin](https://townofwiley.gov/admin) → **Content editor URL**, or historical [main branch Data](https://us-east-2.console.aws.amazon.com/amplify/apps/d331voxr1fhoir/branches/main/data) — note: hosting app `d331voxr1fhoir` deleted June 2026 after S3+CF migration; use current AppSync API or Studio links for the `townofwiley-main` backend if the old URL no longer resolves).
- You have IAM permission for Amplify app `d331voxr1fhoir`, branch **`main`**, Data manager (not access denied).

## Steps (about 5 minutes)

### 1. Confirm Data manager opens on branch `main`

1. Open `/admin` and copy **Content editor URL**, or use the [main / Data](https://us-east-2.console.aws.amazon.com/amplify/apps/d331voxr1fhoir/branches/main/data) link.
2. In Amplify Console: app → branch **`main`** → **Data** → **Data manager** (not Gen 1 `admin.amplifyapp.com` Studio).
3. Confirm models **SiteSettings**, **Announcement**, **OfficialContact**, **PublicDocument** appear in the table dropdown.

**If access is denied:** stop here; IT must fix IAM (see [CMS-STUDIO-OPERATIONS-CHECKLIST.md](./CMS-STUDIO-OPERATIONS-CHECKLIST.md)).

**If lists look empty but you used to see many rows in old Studio:** run `npm run amplify:gen2:compare-cms` and `npm run amplify:gen2:migrate-cms` (see [cms-gen2-capabilities.md](./cms-gen2-capabilities.md)).

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
