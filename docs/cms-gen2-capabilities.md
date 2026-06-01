# Gen 2 CMS capabilities (Town of Wiley)

**Source of truth:** `amplify/data/resource.ts`, live inventory from AWS CLI, and `/admin` → **Content inventory** tab.

## Refresh AWS inventory

```bash
source scripts/agent-aws-env.sh
npm run amplify:gen2:discover-cms
```

Writes:

- `infrastructure/gen2-cms-inventory.json` (committed after IT review)
- `public/gen2-cms-inventory.json` (served to `/admin` for DynamoDB counts)

## Gen 2 production bindings

| Resource | Value |
|----------|--------|
| AppSync API | `x7poehudqvamneqni5s6e2cjxy` → `fpm2ifkbfnb7…` |
| DynamoDB suffix | `x7poehudqvamneqni5s6e2cjxy-NONE` |
| Data manager | [Amplify Console — main / Data](https://us-east-2.console.aws.amazon.com/amplify/apps/d331voxr1fhoir/branches/main/data) |
| Documents S3 | `amplify-d331voxr1fhoir-mai-documentsbucket…` |

## Models (parity with Gen 1)

All Gen 1 `@model` types are deployed in Gen 2. Public site reads nine models via API key (`PUBLIC_CMS_QUERY` in `site-cms-content.ts`). **EmailAlias** is staff-only (no public read).

See [`CMS-MODEL-ROUTE-MATRIX.md`](./CMS-MODEL-ROUTE-MATRIX.md) for route mapping.

## Admin hub (`/admin`)

| Tab | Purpose |
|-----|---------|
| Setup & credentials | Amplify/AWS links, connection test, task map |
| **Content inventory** | Hero preview, live AppSync vs DynamoDB counts, empty-state warnings |
| Document publishing | PublicDocument `sectionId` guide |
| Contact updates | Resident PII (API Gateway, not AppSync) |

## Not in Data Manager

- Navigation/footer copy (`APP_COPY` in code — deploy to change)
- PayStar, weather, chatbot (`runtime-config.js` / Amplify env — redeploy `main`)
- Static archive HTML under `public/documents/archive/`

## Troubleshooting: “I had announcements in Studio but Data manager looks empty”

### 1. Wrong console (most common)

| Console | Shows |
|---------|--------|
| **Gen 1** hosted Studio (`us-east-2.admin.amplifyapp.com/...`) | Legacy API `327diwc6…` / tables `*-j7b2x3…-main` |
| **Gen 2** Amplify Console → app → branch **`main`** → Data manager | Production API `fpm2ifkbfnb7…` / tables `*-x7poehud…-NONE` |

The public site and `/admin` inventory read **Gen 2 only**. Old Studio rows are not visible in Gen 2 until copied.

```bash
source scripts/agent-aws-env.sh
npm run amplify:gen2:compare-cms    # Gen1 vs Gen2 DynamoDB counts
npm run amplify:gen2:migrate-cms  # copy Gen1 → Gen2 when Gen1 is higher
npm run amplify:gen2:discover-cms # refresh public/gen2-cms-inventory.json
```

### 2. Wrong Amplify branch

Each Hosting branch that runs `ampx pipeline-deploy` can have **separate** DynamoDB tables. Production CMS is branch **`main`**, not `gen2-main`.

### 3. “News” is not a separate model

| Resident-facing | Data manager model |
|-----------------|-------------------|
| Bulletins on `/news` | `Announcement` (`announcementKind` blank, `active` true) |
| Town newsletter block | `Announcement` (`announcementKind` = `newsletter`) |
| Regional headline links | `ExternalNewsLink` |

There is no `NewsStory` table. PDF newsletters also need **`attachmentKey`** (S3 path), not a public URL.

### 4. Data manager shows rows but `/news` does not

The site filters `Announcement` with `active: true` and (for bulletins) **date not before today** (UTC). Same-day `YYYY-MM-DD` can disappear later the same day; use `newsletter` kind, empty date, or tomorrow’s date.

### 5. Staff auth vs public API key

- **Residents** read via API key in `runtime-config.js`.
- **Data manager** uses your **AWS Console** login (IAM), not `/admin/login` Cognito.
- **EmailAlias** is staff-only (no public API key read).

AWS reference: [Manage Data with Amplify console](https://docs.amplify.aws/angular/build-a-backend/data/manage-with-amplify-console/) — select the **branch**, then **Data** → **Data manager**.

## Related

- [`CLERK-CMS-GUIDE.md`](./CLERK-CMS-GUIDE.md) — clerk workflows
- [`CMS-VERIFY-STUDIO.md`](./CMS-VERIFY-STUDIO.md) — five-minute verification
- [`amplify-gen2-migration-plan.md`](./amplify-gen2-migration-plan.md) — migration status
