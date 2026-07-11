# Town of Wiley — Terraform (scaffold)

This repo does **not** manage all AWS through Terraform today. Production uses **Amplify Gen1** (AppSync, Cognito, storage) plus **Python/Node deploy scripts** for integration Lambdas. See [docs/AWS_INFRASTRUCTURE_SOT.md](../../docs/AWS_INFRASTRUCTURE_SOT.md).

Terraform here is a **gradual IaC layer** for resources you want to adjust safely (tags, log retention, new small stacks) without replacing Amplify yet.

## Account and region

| Field | Value |
| ----- | ----- |
| **AWS account (Town)** | `570912405222` (see [`town-aws-account.json`](../town-aws-account.json)) |
| **Primary region** | `us-east-2` |
| **CLI profile** | `townofwiley` (see `npm run aws:configure-profile`) |

Plans **fail** if `aws sts get-caller-identity` is not account `570912405222`.

## Layout

```
infrastructure/terraform/
  bootstrap/state-backend/     # one-time S3 + DynamoDB lock table for remote state
  environments/town-production/  # main workspace (manifest-driven locals)
  modules/
    manifest-context/          # reads aws-infrastructure.manifest.json
    cloudwatch-log-retention/    # example: 1-day retention on Lambda log groups
```

## First-time setup

1. Sign in to AWS account **570912405222** (`aws sso login --profile townofwiley`).
2. Bootstrap remote state (once per account):

   ```bash
   cd infrastructure/terraform/bootstrap/state-backend
   terraform init
   terraform apply
   ```

3. Copy backend config and init the production workspace:

   ```bash
   cd infrastructure/terraform/environments/town-production
   cp backend.hcl.example backend.hcl   # edit if bucket name differs
   terraform init -backend-config=backend.hcl
   terraform plan
   ```

## npm scripts (from repo root)

```bash
npm run terraform:fmt
npm run terraform:town:validate
npm run terraform:town:plan    # requires AWS creds (npm run aws:login first)
npm run terraform:e2e:validate # fmt + validate + plan (no changes) + verify:aws-infra
```

Per [HashiCorp `terraform validate`](https://developer.hashicorp.com/terraform/cli/commands/validate) and [`terraform plan`](https://developer.hashicorp.com/terraform/cli/commands/plan): CI-style checks are **fmt → init → validate → plan** against live AWS. Credentials use `aws configure export-credentials` ([AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)) because `aws login` sessions are not read directly by the Terraform AWS provider.

## Adding resources

1. Extend [aws-infrastructure.manifest.json](../aws-infrastructure.manifest.json) (SSOT).
2. Add a module under `modules/` or a `.tf` file in `environments/town-production/`.
3. Prefer **import** for existing Lambdas/S3 (`terraform import`); do not recreate Amplify-managed CMS tables in Terraform without a migration plan.

## Guestbook (hello-from) destroy stack

One-shot IAM cleanup (Lambda/table already gone):

```bash
export AWS_PROFILE=steve   # account 570912405222
npm run terraform:guestbook:destroy
```

Stack: [`stacks/guestbook-decommission/`](stacks/guestbook-decommission/).

## Out of scope (for now)

- Full import of Amplify CloudFormation / AppSync schema
- Replacing `scripts/deploy-*.py` in one step — migrate one Lambda at a time if needed