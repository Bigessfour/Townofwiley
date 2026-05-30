# Gen 1 Amplify backend (archived on `gen2-main`)

This folder holds the former `amplify/backend/` tree from Amplify Gen 1 (AppSync, Cognito, S3 CloudFormation).

- **Production `main` branch** still uses the live paths under `amplify/backend/` until cutover completes.
- **`gen2-main` branch** uses TypeScript Gen 2 under `amplify/auth`, `amplify/data`, `amplify/storage`, and `amplify/backend.ts`.

To run Gen 1 CLI commands (`amplify push`, `amplify gen2-migration lock`) against production, check out branch **`main`**, not `gen2-main`.

See [docs/amplify-gen2-migration-plan.md](../docs/amplify-gen2-migration-plan.md).
