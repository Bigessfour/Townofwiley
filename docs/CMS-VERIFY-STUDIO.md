# CMS activity: Verify Gen 1 AppSync and live content

Use this checklist when onboarding staff, after AWS changes, or if the public site shows **bundled fallback** text instead of live content.

**Production CMS:** Gen 1 AppSync `j7b2x3sh7rcezekekkxxiak7hi` only — see [`gen2-decommissioned.md`](./gen2-decommissioned.md).

## Prerequisites

- Staff can sign in at https://townofwiley.gov/admin (Cognito **Staff** group).
- IT can open the **AppSync Queries** console for API `j7b2x3sh7rcezekekkxxiak7hi`.

## Steps (about 5 minutes)

### 1. Confirm AppSync console opens (Gen 1)

1. Open `/admin` and copy **Content editor URL**, or use:
   [AppSync Queries — j7b2x3sh7rcezekekkxxiak7hi](https://us-east-2.console.aws.amazon.com/appsync/home?region=us-east-2#/j7b2x3sh7rcezekekkxxiak7hi/v1/queries)
2. Confirm models **SiteSettings**, **Announcement**, **OfficialContact**, **PublicDocument** appear in the schema explorer.

**If access is denied:** IT must fix IAM (see [CMS-STUDIO-OPERATIONS-CHECKLIST.md](./CMS-STUDIO-OPERATIONS-CHECKLIST.md)).

### 2. Confirm you can read live records (no edit required)

1. Open **SiteSettings** and confirm at least one record exists with expected town/hero fields.
2. Open **OfficialContact** and confirm rows exist whose **`id`** is exactly `town-information` and `city-clerk` (see [CMS-MODEL-ROUTE-MATRIX.md](./CMS-MODEL-ROUTE-MATRIX.md)).
3. Optionally open **Announcement** or **PublicDocument** and confirm lists load without errors.

### 3. Confirm the public website can reach AppSync

1. Open [https://townofwiley.gov/admin](https://townofwiley.gov/admin).
2. In **CMS Connection Status**, click **Test CMS Connection**.
3. Expect status **Connected**.

**If connection fails:** verify GitHub/user secrets (`APPSYNC_CMS_*`), run `npm run generate:runtime-config:strict`, redeploy static site, then `npm run verify:runtime-config-cms`. IT follows [CMS-STUDIO-OPERATIONS-CHECKLIST.md](./CMS-STUDIO-OPERATIONS-CHECKLIST.md).

### 4. Confirm runtime config matches Gen 1 SSOT

```bash
npm run verify:runtime-config-cms
curl -s https://townofwiley.gov/runtime-config.js | grep -A3 '"cms"'
```

Expect endpoint host `327diwc6cvdqjocdudvrdv7wwu.appsync-api.us-east-2.amazonaws.com`.

### 5. Optional public spot-check

After `/admin` looks healthy, open the homepage and one other route (e.g. **/news**) and confirm recent CMS edits appear after a normal refresh.

## Record outcome

- Date: **___**
- AppSync Queries reachable: Yes / No
- `/admin` Test CMS Connection: Connected / Failed
- Notes: **___**

## Related documents

- [CMS-STUDIO-OPERATIONS-CHECKLIST.md](./CMS-STUDIO-OPERATIONS-CHECKLIST.md)
- [CMS-MODEL-ROUTE-MATRIX.md](./CMS-MODEL-ROUTE-MATRIX.md)
- [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md)
- [gen2-decommissioned.md](./gen2-decommissioned.md)
