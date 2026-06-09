# Amplify Gen 2 — decommissioned (do not use)

**Status:** Retired June 2026. Gen 2 AppSync, Gen 2 Cognito staff pool, Amplify Hosting `ampx` deploy path, and `amplify_outputs.json` are **removed from AWS and this repo**.

## Production CMS (Gen 1 only)

| Resource | Value |
| -------- | ----- |
| AppSync API | `j7b2x3sh7rcezekekkxxiak7hi` (`townofwiley-main`) |
| GraphQL endpoint | `https://327diwc6cvdqjocdudvrdv7wwu.appsync-api.us-east-2.amazonaws.com/graphql` |
| Staff Cognito pool | `us-east-2_DmY7BCBIp` |
| Bindings SSOT | [`infrastructure/gen1-production-bindings.json`](../infrastructure/gen1-production-bindings.json) |
| Runtime verify | `npm run verify:runtime-config-cms` |

## Retired Gen 2 identifiers (never configure again)

- AppSync: `x7poehudqvamneqni5s6e2cjxy`, `fpm2ifkbfnb7hphqsck6dj66wq`, `iydm63w5bbf73aun6p5bc7psoy`
- Cognito: `us-east-2_pkewJMUJF`
- Hosting branch: `gen2-main`, Amplify app `d331voxr1fhoir` (hosting deleted)
- Build artifact: `amplify_outputs.json` (ignored; not used by `generate-runtime-config.mjs`)

## If you see a Gen 2 endpoint in a local build

1. Unset stale shell env: `APPSYNC_CMS_*`, delete any local `amplify_outputs.json`.
2. Set secrets from Gen 1: `npm run secrets:sync-runtime` (see [`docs/amplify-deployment-runbook.md`](./amplify-deployment-runbook.md)).
3. Regenerate: `npm run generate:runtime-config:strict`
4. Verify: `npm run verify:runtime-config-cms`

## Removed documentation

These files were deleted to prevent misconfiguration:

- `docs/amplify-gen2-migration-plan.md`
- `docs/amplify-gen2-migration-assess-main.md`
- `docs/cms-gen2-capabilities.md`
- `docs/gen1-decommission-evaluation.md` (superseded by this note + Gen 1 SSOT)

## Staff CMS editing

- Primary: in-app forms at https://townofwiley.gov/admin (after Cognito **Staff** group sign-in)
- IT fallback: AppSync Queries console for API `j7b2x3sh7rcezekekkxxiak7hi` — see [`docs/CLERK-CMS-GUIDE.md`](./CLERK-CMS-GUIDE.md)
