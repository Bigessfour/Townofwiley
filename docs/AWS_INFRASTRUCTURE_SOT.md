# AWS infrastructure — single source of truth (SOT)

Canonical reference for **custom AWS resources** in account **`570912405222`** (Town of Wiley). Hosting details remain in [AMPLIFY_HOSTING_SOT.md](./AMPLIFY_HOSTING_SOT.md).

When Lambdas, DynamoDB, Function URL auth, or Amplify branch env keys change, update the manifests and this doc in the same PR.

---

## Manifest files (repo SSOT)

| File | Purpose |
| ---- | ------- |
| [infrastructure/aws-infrastructure.manifest.json](../infrastructure/aws-infrastructure.manifest.json) | Expected Lambdas, DynamoDB, S3 buckets, Amplify app id, Function URL **AuthType**, deployment order |
| [infrastructure/amplify-branch-env.manifest.json](../infrastructure/amplify-branch-env.manifest.json) | Required **names** of Amplify `main` branch env vars for `runtime-config.js` (no secret values in git) |
| [amplify.yml](../amplify.yml) | BuildSpec Node pin, `npm ci`, artifact path |
| [customHttp.yml](../customHttp.yml) | CSP, HSTS, cache-control for Amplify Hosting |
| [scripts/amplify-spa-rewrite-rules.json](../scripts/amplify-spa-rewrite-rules.json) | SPA rewrites |
| [amplify/backend/](../amplify/backend/) | AppSync schema, Cognito, Storage (Amplify Gen1 CloudFormation) |

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
2. **Hosting SSOT** — `npm run amplify:sync-hosting` (buildSpec + `customHttp.yml` + SPA rules).
3. **Severe weather** — `python scripts/deploy-severe-weather-backend.py`
4. **Email alias** — `python scripts/deploy-email-alias-router.py`
5. **Contact write** — `python scripts/deploy-contact-update-backend.py` (DynamoDB + write Lambda, public Function URL `NONE`)
6. **Contact review** — `python scripts/deploy-contact-updates-review.py` (Function URL **`AWS_IAM`** only)
7. **Amplify env** — Set `CONTACT_UPDATE_API_ENDPOINT` and other keys per [amplify-branch-env.manifest.json](../infrastructure/amplify-branch-env.manifest.json); redeploy **`main`**.
8. **Verify** — `npm run verify:aws-infra` and [AP-01b](./amplify-deployment-runbook.md) (`/runtime-config.js` on production).

---

## Lambda Function URL auth (AWS docs)

Per [Control access to Lambda function URLs](https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html):

| Function | AuthType (SSOT) | Rationale |
| -------- | ----------------- | --------- |
| NWS proxy, severe weather signup, Easy Peasy chat | `NONE` | Public proxies; restrict with CORS + **WAF (AP-16)** |
| Contact update **write** | `NONE` | Public resident form; client + Lambda sanitization (AP-06) |
| Contact update **review** | **`AWS_IAM`** | PII; admin must use SigV4 proxy (AP-05b/c) |
| Paystar proxy (if deployed) | `NONE` | Optional; hosted-only may omit Lambda |

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

## Related inventory items

| AP ID | Topic |
| ----- | ----- |
| AP-01b | Prod `runtime-config.js` vs Amplify env |
| AP-05 | Contact review Lambda IAM + admin proxy |
| AP-06 | Contact payload sanitization |
| AP-16 | WAF on public Function URLs |
| AP-17 | S3 upload AV / metadata |
| AP-19 | AppSync API key rotation |

Full tracker: [post-development-inventory.md](./post-development-inventory.md).
