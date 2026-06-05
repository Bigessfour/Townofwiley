# Gen 1 decommission evaluation (Town of Wiley)

**Date context:** After Gen 2 `main` Hosting deploy (stack `amplify-d331voxr1fhoir-main-branch-82345f229c`) and CMS DynamoDB migration (`npm run amplify:gen2:migrate-cms`).

## Verdict

**Repo + clerk UI cutover to Gen 2 COMPLETE** (all hardcodes, /admin, runtime fallbacks, tests, docs now treat x7poehudqvamneqni5s6e2cjxy / Gen2 as current; j7b2... and d331 explicitly legacy; gen1-amplify-backend/ removed).

**Prod runtime + full decommission pending:** Production public CMS still served from Gen1 until secrets updated + redeploy + data copy verification (see amplify-gen2-migration-plan.md). Do not delete Gen 1 stacks yet.

## Resource matrix

| Resource                                          | Gen 1 (legacy)                   | Gen 2 (production `main`)                                    | Safe to delete Gen 1?                                                                    |
| ------------------------------------------------- | -------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| AppSync API `townofwiley-main` (`j7b2x3…` legacy) | `327diwc6…`                      | `fpm2ifkbfnb7…` (`x7poehud…` current in code/docs)           | **No** — keep until data cutover + retain + stack delete; repo code/docs already on Gen2 |
| DynamoDB CMS tables (`*-j7b2x3…-main`)            | Had source data; copied to Gen 2 | `*-x7poehud…-NONE` active                                    | **No** — backup/archive first; 48h after stable Gen 2                                    |
| Cognito pool `us-east-2_DmY7BCBIp`                | Staff users lived here           | `us-east-2_pkewJMUJF` (empty until invite)                   | **No** — until staff sign-in verified on Gen 2                                           |
| S3 `townofwiley-documents-storage-main`           | Legacy uploads                   | `amplify-d331voxr1fhoir-mai-documentsbucket…`                | **No** — sync/copy objects if any CMS files reference old bucket                         |
| CF stack `amplify-townofwiley-main-d1245`         | Gen 1 Amplify backend            | Replaced by Gen 2 branch stack                               | **No** — delete only via [migration retain](amplify-gen2-migration-plan.md)              |
| Amplify branch env `APPSYNC_*`                    | Gen1 URL (legacy)                | Gen2 via amplify_outputs or secrets (code now defaults Gen2) | Repo cutover done; update prod secrets + outputs for runtime                             |
| Email alias Lambda table env                      | Was `EmailAlias-j7b2x3…-main`    | Must be `EmailAlias-x7poehud…-NONE`                          | Fix with `npm run amplify:gen2:configure-clerk`                                          |

## Clerk / admin checklist (Gen 2)

1. `npm run amplify:gen2:configure-clerk` — Staff group + Gen 2 IAM role on Cognito; EmailAlias Lambda → Gen 2 table.
2. `npm run amplify:gen2:configure-clerk -- --invite-staff` — Create Gen 2 users for Gen 1 staff emails (new temp passwords).
3. Staff sign in at https://www.townofwiley.gov/admin/login — must use **Gen 2** pool (runtime-config already exposes it).
4. **Test CMS Connection** on `/admin` — should hit Gen 2 AppSync (public API key read).
5. **Contact updates** tab — still uses API Gateway + JWT (unchanged); not Gen 1 AppSync.

Bindings SSOT: [`infrastructure/gen2-production-bindings.json`](../infrastructure/gen2-production-bindings.json).

## When Gen 1 can be deleted

All must be true:

1. Gen 2 production stable **48+ hours** (CMS, `/admin`, documents, email aliases).
2. Staff confirmed on Gen 2 Cognito (no one on Gen 1 pool).
3. `npm run amplify:gen2:lock` → `refactor` → `postRefactor` per [amplify-gen2-migration-plan.md](amplify-gen2-migration-plan.md) **or** AWS-supported retain path for orphaned Gen 1 stack.
4. `npm run amplify:gen2:retain` then delete Gen 1 root stack **`amplify-townofwiley-main-d1245`** per AWS docs (not `amplify env remove` alone).
5. Remove unused AppSync API `j7b2x3…` only if AWS refactor did not already replace it.

## Optional cleanup (not Gen 1 delete)

- Merge `gen2-main` preview stack / branch if redundant with `main`.
- Update Amplify Console branch env vars to drop stale `APPSYNC_CMS_*` Gen 1 values (build uses `amplify_outputs.json` today).
- Update [`infrastructure/aws-infrastructure.manifest.json`](../infrastructure/aws-infrastructure.manifest.json) `appsync` section after decommission.
