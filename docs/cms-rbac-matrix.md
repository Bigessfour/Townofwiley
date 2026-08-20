# CMS role-based access (Cognito groups)

**Status:** Task hub gating shipped in-app; Gen 1 `@auth` schema push is IT-owned (Amplify backend not in this repo).

## Groups

| Cognito group | Purpose |
| ------------- | ------- |
| `Staff` | Full clerk CRUD on all public CMS models |
| `Council` | Read/update leadership roster only |

## In-app matrix (`cms-clerk-tasks.ts`)

| Task | `requiredGroups` |
| ---- | ---------------- |
| All standard clerk tasks | *(default — Staff only)* |
| Update elected officials & town administration | `Staff`, `Council` |
| Manage email forwarding | `Staff` only |

Task hub hides cards when the signed-in user is not in an allowed group. `Staff` always sees every task.

## AppSync `@auth` (Gen 1 — IT push required)

After verifying `npm run verify:public-cms-query`, apply schema rules in Amplify Console / `amplify push`:

- **Public reads:** keep `apiKey` read on all 10 public models (no regression).
- **Staff writes:** `userPools` groups `Staff` — create/update/delete on public models.
- **Council:** `userPools` group `Council` — create/update/delete on `LeadershipRosterEntry` only.

Rollback: restore prior `@auth` from last known good schema export; re-run verify scripts.

## Verification

```bash
npm run verify:public-cms-query
npm run verify:runtime-config-cms
npm run test:unit:browser
```

Sign in as Council test user (when provisioned): only leadership task visible on `/admin`.
