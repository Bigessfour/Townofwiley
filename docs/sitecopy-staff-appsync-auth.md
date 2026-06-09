# SiteCopy staff AppSync authorization (IT)

Clerks edit **SiteCopy** on `/admin` → **Edit navigation labels, headings, and Quick Tasks text**. The in-app editor calls `listSiteCopies` with **Cognito userPool** auth (`authMode: 'userPool'`). The public site reads the same model with the **API key** only.

If clerks see **Could not list SiteCopy** (or a staff sign-in message) while other tasks work, production **Gen 1 AppSync** (`j7b2x3sh7rcezekekkxxiak7hi`) likely does not yet expose `listSiteCopies` or **Staff** user-pool CRUD on `SiteCopy`.

## Deploy SiteCopy on Gen 1 (production API)

Production CMS data uses **Gen 1 AppSync** — see `src/app/clerk-setup/appsync-console-url.ts` and `infrastructure/gen1-production-bindings.json`. The repo ships an idempotent deploy helper:

```bash
source scripts/agent-aws-env.sh
aws sts get-caller-identity   # account 570912405222, profile townofwiley
python scripts/export-appsync-schema.py   # refresh scripts/gen1-appsync-schema.graphql
npm run deploy:gen1:sitecopy
```

Dry run (merge schema only, no AWS mutations):

```bash
npm run deploy:gen1:sitecopy -- --dry-run
```

The script:

1. Ensures DynamoDB table `SiteCopy-j7b2x3sh7rcezekekkxxiak7hi-main` and AppSync data source `SiteCopyTable`
2. Merges `scripts/sitecopy-gen1-schema-block.graphql` into the exported schema
3. Pushes schema to AppSync and clones resolvers from `ExternalNewsLink`

Required SDL auth on `SiteCopy` (mirrors other clerk-editable public models):

- `@aws_api_key` + `@aws_iam` + `@aws_cognito_user_pools` on the type and list/get fields
- Mutations: `@aws_iam` + `@aws_cognito_user_pools` (Staff group via Cognito)

## Verify with Staff JWT

In [Gen 1 AppSync Queries](https://us-east-2.console.aws.amazon.com/appsync/home?region=us-east-2#/j7b2x3sh7rcezekekkxxiak7hi/v1/queries), run with a **Staff userPool JWT** (not the API key):

```graphql
query ListSiteCopiesStaff {
  listSiteCopies(limit: 5) {
    items {
      id
      key
      valueEn
      active
    }
  }
}
```

## Verify runtime endpoint

Production `runtime-config.js` must point at the Gen 1 CMS API. After changing `APPSYNC_CMS_*` secrets, redeploy the static site and run `npm run verify:runtime-config-cms`.

## Repo contract check (no AWS credentials)

```bash
npm run verify:staff-cms-editor-models
```

Ensures every clerk-editable model (including **SiteCopy**) is listed in `infrastructure/cms-inventory.json` with `clerkEditorModel: true` and `staffUserPoolCrud: true`.

## Related

- [`admin-auth-runbook.md`](./admin-auth-runbook.md) — Cognito Staff group and Hosted UI
- [`CLERK-CMS-GUIDE.md`](./CLERK-CMS-GUIDE.md) — clerk task troubleshooting
- [`CMS-MODEL-ROUTE-MATRIX.md`](./CMS-MODEL-ROUTE-MATRIX.md) — SiteCopy routes
