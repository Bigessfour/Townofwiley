# Amplify Gen 2 migration plan (Town of Wiley)

Operational runbook for moving from **Amplify Gen 1** (Studio + `amplify push`) to **Gen 2** (TypeScript CDK + `npx ampx pipeline-deploy`).

| Item | Value |
|------|--------|
| AWS account | `570912405222` |
| Amplify app | `d331voxr1fhoir` |
| Gen 1 env / stack | `main` / `amplify-townofwiley-main-d1245` |
| Gen 2 Hosting branch | `gen2-main` |
| Region | `us-east-2` |

## What changed for staff

| Gen 1 | Gen 2 |
|-------|--------|
| **Amplify Studio** → Data Manager | **Amplify Console** → app → branch → **Data** → **Data manager** |
| `amplify push` / Studio deploy | Git push to `gen2-main` + Hosting build (`ampx pipeline-deploy`) |
| `amplifyconfiguration.json` | `amplify_outputs.json` (build artifact; not committed) |

Clerk guide: [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md). Admin hub: https://townofwiley.gov/admin

**Data manager URL (Gen 2):**

`https://us-east-2.console.aws.amazon.com/amplify/apps/d331voxr1fhoir/branches/gen2-main/data`

## Repository layout

| Path | Role |
|------|------|
| `amplify/auth`, `data`, `storage`, `backend.ts` | Gen 2 backend (branch `gen2-main`) |
| `gen1-amplify-backend/` | Archived Gen 1 `amplify/backend` on `gen2-main` only |
| `amplify.yml` | Backend `pipeline-deploy` + Angular frontend build |
| `scripts/copy-amplify-branch-env.sh` | Copy Hosting env vars between branches |

On **`main`**, Gen 1 files remain under `amplify/backend/` until merge/cutover.

## Hosting deploy fixes (`gen2-main` job failures)

| Issue | Fix |
|-------|-----|
| `npm ci --prefix amplify` EUSAGE | Commit **`amplify/package-lock.json`**; keep **`amplify/.npmrc`** (`legacy-peer-deps=true`) and **`overrides`** in `amplify/package.json` for `@aws-cdk/toolkit-lib` (npm ci vs nested CDK toolkit versions). |
| Gen 1 `amplify pull` on `gen2-main` | Clear Gen 1 backend link: `aws amplify update-branch --app-id d331voxr1fhoir --branch-name gen2-main --backend-environment-arn ""` (branch `backend` becomes `{}`). **Do not** run this on `main`. |
| `ampx pipeline-deploy` in CodeBuild | Set **`export CI=1`**; invoke **`npx --prefix amplify ampx pipeline-deploy`** (CLI is under `amplify/`, not repo root). |
| Invalid `branchName` in `defineData` | Removed; not a valid `DataProps` field — shared DynamoDB for models is automatic per migration docs until refactor. |
| Frontend missing CMS outputs | After backend deploy, assert **`amplify_outputs.json`** exists before `generate-runtime-config.mjs --strict`. |

Sync Console buildSpec after editing `amplify.yml`: `npm run amplify:sync-buildspec`.

## Prerequisites (done in this effort)

- [x] CDK bootstrap: `npx aws-cdk bootstrap aws://570912405222/us-east-2`
- [x] IAM managed policy `TownOfWileyGen2StackRefactor` attached to user `copilot` ([infrastructure/iam/README.md](../infrastructure/iam/README.md))
- [x] Amplify CLI **14.4+** (`amplify gen2-migration`)
- [x] `enablegen2migration: true` in `amplify/cli.json` (on branches that keep Gen 1 metadata)
- [x] `amplify/backend/api/townofwiley/custom-roles.json` for IAM auth during refactor
- [x] Hosting branch **`gen2-main`** created; env vars copied from `main`

## Blocker: automated `gen2-migration assess`

`amplify gen2-migration assess` reads **`#current-cloud-backend.zip`** from S3, not only local files. Production storage never had `storage/documents/cli-inputs.json` until we attempted a push; **override migration** for storage requires an interactive `amplify update storage` (not available in CI/agent shells).

**Mitigation on `gen2-main`:** hand-authored Gen 2 backend matching [schema.graphql](../gen1-amplify-backend/backend/api/townofwiley/schema.graphql) in `amplify/data/resource.ts`.

Before production **refactor**, complete storage override migration on a maintainer workstation:

```bash
amplify env checkout main
amplify update storage   # accept migration for resource "documents"
amplify push
npm run amplify:gen2:assess
```

## npm scripts

| Script | Command |
|--------|---------|
| `npm run amplify:gen2:assess` | `amplify gen2-migration assess` |
| `npm run amplify:gen2:lock` | `amplify gen2-migration lock` |
| `npm run amplify:gen2:generate` | `amplify gen2-migration generate` |
| `npm run amplify:gen2:refactor` | `amplify gen2-migration refactor --to <stack>` |
| `npm run amplify:gen2:retain` | `amplify gen2-migration retain` |

Requires global **`@aws-amplify/cli@14.4.0`** or newer.

## Cutover sequence (maintenance window)

Run from a machine with Amplify CLI 14.4+ and admin AWS credentials.

### 1. Validate `gen2-main` build

1. Push branch `gen2-main` to GitHub.
2. Confirm Amplify build succeeds (backend + frontend).
3. Open `https://gen2-main.d331voxr1fhoir.amplifyapp.com` — smoke CMS, `/admin`, staff login, contact updates.
4. `npm run verify:aws-infra`

### 2. Lock Gen 1 (`main` checkout with Gen 1 backend)

```bash
git checkout main
amplify env checkout main
amplify pull
npm run amplify:gen2:lock
```

Pause auto-deploys to `main`. Clerks stop using Studio.

### 3. Stack refactor

```bash
npm run amplify:gen2:assess   # note Gen 2 root stack name
npm run amplify:gen2:refactor -- --to <Gen2RootStackName>
```

### 4. Post-refactor deploy

On `gen2-main`, uncomment `postRefactor()` in [amplify/backend.ts](../amplify/backend.ts), push, wait for green build.

### 5. Domain cutover

Point `townofwiley.gov` to Hosting branch **`gen2-main`** (Amplify Console → Hosting → Domain management).

Verify live `/runtime-config.js` and `/admin` CMS test.

### 6. Decommission Gen 1

After 24–48h stable:

```bash
git checkout main
npm run amplify:gen2:retain
# Delete Gen 1 root CloudFormation stack per AWS decommission docs — not `amplify env remove` blindly
```

## Rollback

- **Before refactor:** disable `gen2-main`, keep domain on `main`.
- **After refactor:** use AWS stack-refactor rollback; coordinate with AWS support if needed.

## References

- [Migrate Gen 1 → Gen 2 (Angular)](https://docs.amplify.aws/angular/start/migrate-to-gen2/migrate-existing-app/)
- [Feature matrix](https://docs.amplify.aws/angular/start/migrate-to-gen2/feature-matrix/)
- [amplify-deployment-runbook.md](./amplify-deployment-runbook.md)
- [AMPLIFY_HOSTING_SOT.md](./AMPLIFY_HOSTING_SOT.md)
