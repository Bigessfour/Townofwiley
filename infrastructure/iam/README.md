# IAM policy snippets (Town of Wiley)

**AWS accounts (do not confuse them):**

| Account ID         | Organization                                                       |
| ------------------ | ------------------------------------------------------------------ |
| **`570912405222`** | **Town of Wiley** — site, Lambdas, IAM user **`copilot`**, Amplify |
| **`388691194728`** | **Code Platoon** — separate training/personal AWS usage            |

Town of Wiley workloads and IAM user **`copilot`** live only in **`570912405222`**.

## `copilot` user — read Town Lambda CloudWatch logs

The `copilot` IAM user needs log read actions to run `aws logs tail` / `FilterLogEvents` without `AccessDeniedException`.

**Policy file:** [copilot-cloudwatch-logs-read-policy.json](./copilot-cloudwatch-logs-read-policy.json)
Scoped to Town Lambda log groups (`TownOfWiley*`, `townofwiley*`, `amplify-townofwiley*`) in **us-east-2**, AppSync API logs (`/aws/appsync/apis/*`), and **us-east-1** email-alias Lambda logs.

**Optional — Lambda read for `npm run verify:nws-proxy-aws`:** [copilot-lambda-read-verify-policy.json](./copilot-lambda-read-verify-policy.json)
Lets the same IAM user call `lambda:ListFunctions` and read configuration / function URLs for `arn:aws:lambda:us-east-2:570912405222:function:TownOfWiley*`. Use **`aws lambda list-functions --region us-east-2`** so discovery stays in the primary region. Apply with a **different** policy name so it does not replace the logs policy.

## `copilot` user — CloudFront (Amplify CDN)

For optional `/weather*` cache behaviors and invalidations on the Amplify-managed distribution (`d1tkcm7820z9y8.cloudfront.net` per domain association), attach the AWS managed policy **`CloudFrontFullAccess`** (`arn:aws:iam::aws:policy/CloudFrontFullAccess`) to user **`copilot`**.

**Verify (account administrator):**

```bash
aws iam list-attached-user-policies --user-name copilot \
  --query "AttachedPolicies[?PolicyName=='CloudFrontFullAccess']"
aws iam simulate-principal-policy \
  --policy-source-arn "arn:aws:iam::570912405222:user/copilot" \
  --action-names cloudfront:ListDistributions cloudfront:UpdateDistribution cloudfront:CreateInvalidation
```

All evaluations should be **`allowed`**. Prefer repo [`customHttp.yml`](../../customHttp.yml) + `npm run amplify:sync-headers` for `/weather*` `Cache-Control`; use [`scripts/configure-cloudfront-weather-cache.sh`](../../scripts/configure-cloudfront-weather-cache.sh) only when an explicit behavior is required.

**Infrastructure SSOT verification:** `npm run verify:aws-infra` (see [docs/AWS_INFRASTRUCTURE_SOT.md](../../docs/AWS_INFRASTRUCTURE_SOT.md)) compares live resources to [infrastructure/aws-infrastructure.manifest.json](../aws-infrastructure.manifest.json). Requires the same read permissions plus `amplify:GetApp`, `amplify:GetBranch`, `dynamodb:DescribeTable`, and `s3:GetPublicAccessBlock` on Town buckets.

### Apply (account administrator)

Replace nothing if your account ID is already `570912405222`.

```bash
aws iam put-user-policy \
  --user-name copilot \
  --policy-name TownOfWileyCloudWatchLogsRead \
  --policy-document file://infrastructure/iam/copilot-cloudwatch-logs-read-policy.json \
  --region us-east-2
```

`iam` is global; `--region` is optional here.

```bash
aws iam put-user-policy \
  --user-name copilot \
  --policy-name TownOfWileyLambdaReadVerify \
  --policy-document file://infrastructure/iam/copilot-lambda-read-verify-policy.json
```

### Troubleshooting `NoSuchEntity` / “user … copilot cannot be found”

That error almost always means **either** the CLI is using the **wrong AWS account** (for example CodePlatoon), **or** the Town account has **no IAM user literally named `copilot`**.

1. Confirm the account:

   ```bash
   aws sts get-caller-identity
   ```

   For Town of Wiley policies, **`Account` must be `570912405222`**. If not, switch profile first, e.g. `export AWS_PROFILE=townofwiley`, then retry. Ensure **`[townofwiley]`** in `~/.aws/credentials` (or SSO/role wired to `townofwiley`) resolves to account **`570912405222`** — not Code Platoon (**`388…`**).

2. List IAM user names in **that** account:

   ```bash
   aws iam list-users --output table
   ```

3. If your operator user is named something other than `copilot`, replace **`--user-name copilot`** with the **exact** user name from the list (or create user `copilot` in IAM in **570912405222** if you intend to match this repo’s docs).

### Configure this machine (best practice — keys **not** in the repo)

Long-term access keys belong in the [AWS CLI shared files](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) under **`~/.aws/`** with mode **`600`**, not in the git workspace (see root `.gitignore`).

1. In **IAM → Users → `copilot` → Security credentials**, copy **one** access key ID and its **secret** (or **Create access key** if you no longer have the secret).
2. From the repo root, run the interactive helper (input is hidden for the secret). The default profile name is **`townofwiley`** (Town of Wiley **570912405222**, matches `.vscode/settings.json`); use a different **`AWS_PROFILE_NAME`** only if your machine uses another local alias (must still resolve to Wiley’s account).

   ```bash
   bash scripts/configure-aws-cli-profile.sh
   ```

   Or use **`npm run aws:configure-profile`**.

3. Confirm:

   ```bash
   export AWS_PROFILE=townofwiley AWS_DEFAULT_REGION=us-east-2
   aws sts get-caller-identity
   ```

   Expect **`"Account": "570912405222"`**.

Optional: store the secret in **macOS Passwords / Keychain** as a backup; still keep `~/.aws/credentials` as what the CLI reads.

### Full NWS weather Lambda check (Lambda API + CORS + optional live `curl`)

Apply **`TownOfWileyLambdaReadVerify`** above (policy file `copilot-lambda-read-verify-policy.json`) so `copilot` is not **logs only** for this check. Then:

```bash
export AWS_PROFILE=townofwiley AWS_DEFAULT_REGION=us-east-2
export NWS_WEATHER_LAMBDA_FUNCTION_NAME='your-nws-weather-proxy-lambda-name'
npm run verify:nws-proxy-aws
```

### Verify (logs)

```bash
export AWS_PROFILE=townofwiley AWS_DEFAULT_REGION=us-east-2
aws logs tail /aws/lambda/TownOfWileySevereWeatherBackend --since 1h --format short | tail -20
```

## Gen 2 migration — CloudFormation stack refactor

Required for `amplify gen2-migration refactor` (see [docs/amplify-gen2-migration-plan.md](../../docs/amplify-gen2-migration-plan.md)).

**Policy file:** [gen2-stack-refactor-policy.json](./gen2-stack-refactor-policy.json)
**Managed policy name:** `TownOfWileyGen2StackRefactor` (`arn:aws:iam::570912405222:policy/TownOfWileyGen2StackRefactor`)

Do **not** use `put-user-policy` for `copilot` — inline policy quota is full. Attach the managed policy:

```bash
aws iam attach-user-policy \
  --user-name copilot \
  --policy-arn arn:aws:iam::570912405222:policy/TownOfWileyGen2StackRefactor
```

Account administrators using the root user or a role with `AdministratorAccess` already have these actions.

### Remove (if needed)

```bash
aws iam delete-user-policy --user-name copilot --policy-name TownOfWileyCloudWatchLogsRead
aws iam delete-user-policy --user-name copilot --policy-name TownOfWileyLambdaReadVerify
aws iam detach-user-policy --user-name copilot --policy-arn arn:aws:iam::570912405222:policy/TownOfWileyGen2StackRefactor
```
