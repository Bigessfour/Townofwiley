# AWS infrastructure — single source of truth (SOT)

Canonical reference for **custom AWS resources** in account **`570912405222`** (Town of Wiley).

**Current frontend hosting (June 2026+):** S3 `townofwiley-static-site` (us-east-2) + CloudFront `E1NZ3XCY5CYR1J` (`d34qrz3qxoppc5.cloudfront.net`) with SPA Function, OAI (OAC prepared), custom Response Headers Policy (ID 22d4bac1... with CSP + security headers), managed CachingOptimized, access logging to townofwiley-cf-logs, ACM cert (us-east-1), Route 53 A aliases. Legacy Amplify Hosting app `d331voxr1fhoir` deleted. See [README.md](../README.md) "Deployment Record" (updated deploy with cache controls) and historical notes in [AMPLIFY_HOSTING_SOT.md](./AMPLIFY_HOSTING_SOT.md). Manifest has latest IDs.

When Lambdas, DynamoDB, Function URL auth, or backend env keys change, update the manifests and this doc in the same PR.

---

## Manifest files (repo SSOT)

| File                                                                                                  | Purpose                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [infrastructure/aws-infrastructure.manifest.json](../infrastructure/aws-infrastructure.manifest.json) | Expected Lambdas, DynamoDB, S3 buckets, Function URL **AuthType**, deployment order (Amplify app id retained for legacy backend references)                |
| [infrastructure/amplify-branch-env.manifest.json](../infrastructure/amplify-branch-env.manifest.json) | Required **names** of env vars for `runtime-config.js` (no secret values in git; still relevant for any Amplify-managed AppSync/Cognito or runtime config) |
| [amplify.yml](../amplify.yml)                                                                         | Historical BuildSpec (Node pin, `npm ci`, artifact path); no longer used by Amplify Hosting                                                                |
| [customHttp.yml](../customHttp.yml)                                                                   | CSP, HSTS, cache origins (SSOT for local `ng serve` parity + historical reference)                                                                         |
| [scripts/amplify-spa-rewrite-rules.json](../scripts/amplify-spa-rewrite-rules.json)                   | Historical SPA rewrites                                                                                                                                    |
| [amplify/backend/](../amplify/backend/)                                                               | Legacy / current AppSync schema, Cognito, Storage references (Gen2 stacks now `amplify-townofwiley-main-d1245-*`)                                          |

**Verify live AWS matches repo:**

```bash
export AWS_PROFILE=townofwiley
export AWS_DEFAULT_REGION=us-east-2
npm run verify:aws-infra
```

Options: `--skip-s3`, `--skip-amplify`, `--skip-amplify-env`.

---

## Deployment order (operators)

Execute in order after code changes; skip steps that do not apply to your PR.

1. **Amplify backend** — `amplify push` or Studio (GraphQL, Auth, Storage).
2. **Hosting SSOT (historical)** — `npm run amplify:sync-hosting` (now no-op for prod S3+CF; CSP/cache rules live in CloudFront Response Headers Policy + object metadata on deploy; see README deploy steps and manifest). `customHttp.yml` remains SSOT for dev parity (`ng serve`) and reference.
3. **NWS weather proxy** — `python scripts/deploy-nws-weather-proxy.py` (handler-only Function URL CORS; sets `NWS_PROXY_ENDPOINT` on Amplify `main`)
4. **Severe weather** — `python scripts/deploy-severe-weather-backend.py`
5. **Email alias** — `python scripts/deploy-email-alias-router.py`
6. **Contact write** — `python scripts/deploy-contact-update-backend.py` (DynamoDB + write Lambda, public Function URL `NONE`)
7. **Contact review** — `python scripts/deploy-contact-updates-review.py` (Function URL **`AWS_IAM`** only)
8. **Contact review proxy** — `python scripts/deploy-contact-updates-review-proxy.py --review-function-url <IAM_URL>` → set **`CONTACT_UPDATE_REVIEW_PROXY_URL`** on Amplify `main` (maps to `contactUpdate.reviewProxyEndpoint` in `runtime-config.js`)
9. **Amplify env** — Set `CONTACT_UPDATE_API_ENDPOINT`, proxy URL, and other keys per [amplify-branch-env.manifest.json](../infrastructure/amplify-branch-env.manifest.json); redeploy **`main`**.
10. **Verify** — `npm run verify:aws-infra` and [AP-01b](./amplify-deployment-runbook.md) (`/runtime-config.js` on production).

---

## Lambda Function URL auth (AWS docs)

Per [Control access to Lambda function URLs](https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html):

| Function                                          | AuthType (SSOT) | Rationale                                                    |
| ------------------------------------------------- | --------------- | ------------------------------------------------------------ |
| NWS proxy, severe weather signup, Easy Peasy chat | `NONE`          | Public proxies; restrict with CORS + **WAF (AP-16)**         |
| Contact update **write**                          | `NONE`          | Public resident form; client + Lambda sanitization (AP-06)   |
| Contact update **review**                         | **`AWS_IAM`**   | PII; never expose URL to browsers                            |
| Contact update **review proxy**                   | `NONE`          | Origin-restricted; signs IAM review URL server-side (AP-05b) |
| Paystar proxy (if deployed)                       | `NONE`          | Optional; hosted-only may omit Lambda                        |

Deploy scripts encode auth type. **`npm run verify:aws-infra`** fails if live `AuthType` drifts.

---

## Amplify branch environment variables

Values belong in **Amplify Console** (branch `main`) or `secrets/local/user-secrets.json` for local builds only. Never commit API keys or endpoints with secrets to git.

Required keys for production are listed in [amplify-branch-env.manifest.json](../infrastructure/amplify-branch-env.manifest.json). After changes:

1. Redeploy `main`.
2. Hard-refresh browsers (see [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md)).
3. Compare live `https://www.townofwiley.gov/runtime-config.js` to expected shape ([AP-01b](./amplify-deployment-runbook.md)).

---

## IAM operator policies

Read-only verification policies for the `copilot` IAM user: [infrastructure/iam/README.md](../infrastructure/iam/README.md).

---

## CloudWatch logging and alarms

Per [AWS Lambda logging](https://docs.aws.amazon.com/lambda/latest/dg/typescript-logging.html), [AppSync monitoring](https://docs.aws.amazon.com/appsync/latest/devguide/monitoring.html), and [Amplify Hosting metrics](https://docs.aws.amazon.com/amplify/latest/userguide/monitoring-with-cloudwatch.html):

| Resource                             | Log / metric location                                                   | Repo / ops                                                                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Custom Lambdas                       | `/aws/lambda/<FunctionName>`                                            | Deploy scripts grant `logs:*`; retention via configure script                                                                    |
| Amplify backend Lambdas              | `/aws/lambda/amplify-townofwiley-main--…`                               | Set retention in Console or configure script                                                                                     |
| AppSync GraphQL (`townofwiley-main`) | `/aws/appsync/apis/<apiId>`                                             | Enable in configure script (`ERROR` field logs)                                                                                  |
| (Historical) Amplify Hosting SPA     | `AWS/AmplifyHosting` metrics (no longer used); build transcripts legacy | [AMPLIFY_HOSTING_SOT.md](./AMPLIFY_HOSTING_SOT.md) § 1.a (retained for reference only)                                           |
| Account audit                        | CloudTrail → S3 (+ optional CloudWatch Logs)                            | **Not in repo** — create multi-Region trail (see [AWS_AMPLIFY_HOSTING_CHANGE_ALERTS.md](./AWS_AMPLIFY_HOSTING_CHANGE_ALERTS.md)) |

**Apply or repair Town of Wiley logging (account admin):**

```bash
export AWS_PROFILE=townofwiley AWS_DEFAULT_REGION=us-east-2
python scripts/configure-townofwiley-cloudwatch-logging.py
# or: npm run configure:cloudwatch-logging
```

The script is idempotent: sets **1-day** retention on manifest Lambdas (default; override with `--log-retention-days`), enables AppSync CloudWatch logs (`ERROR` by default; use `--appsync-field-log-level INFO` during incidents only), subscribes **`TownOfWileyOpsAlerts`**, and creates Lambda **Errors** + CloudFront **5xxErrorRate** alarms. Confirm pending SNS email subscriptions after each run.

**Verify retention after configure:**

```bash
npm run verify:aws-infra
```

Log groups checked: manifest Lambdas, AppSync `/aws/appsync/apis/<apiId>`, and Amplify backend Lambdas listed in [aws-infrastructure.manifest.json](../infrastructure/aws-infrastructure.manifest.json) `cloudWatch.amplifyBackendLogGroups`. Skip with `npm run verify:aws-infra -- --skip-log-retention`.

**Gap — CloudTrail:** As of May 2026 the Town account had **no trails**. Add a multi-Region trail before relying on CloudWatch alone for API audit history. **Apply (free):** `npm run configure:free-tier-security` — see [aws-free-tier-security.md](./aws-free-tier-security.md).

---

## Hybrid deployment model (why Amplify + scripts)

| Layer                      | Tooling                                                                                                                              | Owns                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **Public site + CMS read** | S3+CloudFront (E1NZ3XCY5CYR1J); CMS backend Gen 1 AppSync (`j7b2x3sh7rcezekekkxxiak7hi`) | Angular build, AppSync, Cognito, S3 documents, CloudFront response headers |
| **Integration Lambdas**    | Python/Node deploy scripts (`scripts/deploy-*.py`)                                                                                   | NWS weather proxy, contact updates, email alias router                         |

This is intentional for a small municipal team: Amplify ships the SPA; scripts deploy stateless Lambdas without a second full IaC stack. **Guardrails:** [aws-infrastructure.manifest.json](../infrastructure/aws-infrastructure.manifest.json), `npm run verify:aws-infra`, and this runbook. A future **CDK-only-for-Lambdas** track is optional (see inventory AP IDs); do not block AP-05/AP-16 on that migration.

---

## WAF and rate limits (AP-16)

**June 2026:** Regional WAF Web ACLs were **removed** to stay within the ~$15–25/mo budget. Public Function URLs (`AuthType: NONE`) rely on CORS, optional Lambda reserved concurrency (`npm run configure:free-tier-security -- --try-lambda-concurrency`), and **API Gateway throttling** on the contact-review JWT API.

Re-enable WAF only after city council approves recurring spend (~$5+/mo per ACL). See [aws-free-tier-security.md](./aws-free-tier-security.md).

---

## Related inventory items

| AP ID  | Topic                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------- |
| AP-01b | Prod `runtime-config.js` vs Amplify env                                                                 |
| AP-05  | Contact review Lambda IAM + admin proxy                                                                 |
| AP-06  | Contact payload sanitization                                                                            |
| AP-16  | WAF on public Function URLs                                                                             |
| AP-17  | S3 upload AV / metadata                                                                                 |
| AP-19  | AppSync API key rotation ([appsync-api-key-rotation-runbook.md](./appsync-api-key-rotation-runbook.md)) |
| CMS audit | DynamoDB streams → `TownOfWileyCmsChangeNotifier` + `TownOfWileyCmsAuditLog` — `npm run deploy:cms-change-notifier` |
| CMS PITR | `npm run enable:cms-dynamodb-pitr` on tables in [cms-inventory.json](../infrastructure/cms-inventory.json) |
| AppSync WAF | `npm run deploy:appsync-waf` — rate limit + AWS managed rules on API `j7b2x3sh7rcezekekkxxiak7hi` |

Full tracker: [post-development-inventory.md](./post-development-inventory.md).

---

## Cost optimization

Monthly spend guardrails and Aurora/S3 tuning: [aws-cost-optimization-runbook.md](./aws-cost-optimization-runbook.md). Discovery: `npm run aws:optimize:discover`.
