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

## Related

- [`CLERK-CMS-GUIDE.md`](./CLERK-CMS-GUIDE.md) — clerk workflows
- [`CMS-VERIFY-STUDIO.md`](./CMS-VERIFY-STUDIO.md) — five-minute verification
- [`amplify-gen2-migration-plan.md`](./amplify-gen2-migration-plan.md) — migration status
