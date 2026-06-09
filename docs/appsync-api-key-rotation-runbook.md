# AppSync CMS API key rotation

Public CMS reads use an **AppSync API key** embedded in `runtime-config.js` at build time. Keys expire on the **Gen 1 production API** `townofwiley-main` (`j7b2x3sh7rcezekekkxxiak7hi`). Rotate before expiry so the site does not fall back to bundled content.

**Related:** [amplify-deployment-runbook.md](./amplify-deployment-runbook.md), [CMS-STUDIO-OPERATIONS-CHECKLIST.md](./CMS-STUDIO-OPERATIONS-CHECKLIST.md), [gen2-decommissioned.md](./gen2-decommissioned.md), [infrastructure/gen1-production-bindings.json](../infrastructure/gen1-production-bindings.json).

## Automated reminder

Deploy the EventBridge + Lambda + SNS checker (weekly; alerts when a key expires within 30 days):

```bash
export AWS_PROFILE=townofwiley
export AWS_REGION=us-east-2
python scripts/deploy-appsync-key-rotation-reminder.py --sns-email wileytown@centurytel.net
```

Confirm the SNS email subscription in your inbox after the first deploy.

## Rotation procedure

| Step | Action |
| ---- | ------ |
| 1 | List keys: `aws appsync list-api-keys --api-id j7b2x3sh7rcezekekkxxiak7hi --region us-east-2` |
| 2 | Create replacement: `aws appsync create-api-key --api-id j7b2x3sh7rcezekekkxxiak7hi --expires $(date -u -v+365d +%s)` (macOS) or use Console |
| 3 | Update **GitHub repository secrets** and local user-secrets: `APPSYNC_CMS_API_KEY` = new value |
| 4 | Redeploy static site: `npm run deploy:static-site` |
| 5 | Verify live config: `curl -s https://townofwiley.gov/runtime-config.js` — `cms.appSync.apiKey` non-empty (do not paste key into tickets) |
| 6 | Verify GraphQL: `npm run verify:runtime-config-cms` |
| 7 | Spot-check https://townofwiley.gov/meetings#calendar after a Studio or `/admin` edit |
| 8 | After 24–48h bake-in, delete the old key: `aws appsync delete-api-key --api-id j7b2x3sh7rcezekekkxxiak7hi --id <old-key-id>` |
| 9 | Log evidence (date, deploy id, verifier) in your ops ticket |

## Completeness checks (post-rotation)

| # | Check | How |
| - | ----- | --- |
| 1 | Build fails on missing keys | Clear `APPSYNC_CMS_API_KEY` on a test branch → strict build fails; restore |
| 2 | New key in prod `runtime-config.js` | Step 5 above (compare prefix only in logs) |
| 3 | `listSiteSettings` returns data | `npm run verify:runtime-config-cms` |
| 4 | Calendar entry visible | `/admin` Event + `/meetings#calendar` |

## Strict build

Production builds require keys in `amplify-branch-env.manifest.json` → `requiredForProduction`:

- Local/CI: `node scripts/generate-runtime-config.mjs --strict` (in `npm run prebuild`)
- GitHub Actions: repository secrets in [amplify-deployment-runbook.md](./amplify-deployment-runbook.md)

CMS endpoint defaults to Gen 1 from `infrastructure/gen1-production-bindings.json` when env is unset; **API key must always be supplied via secrets**.

## GitHub Actions secrets

| Secret | Runtime path |
| ------ | ------------ |
| `APPSYNC_CMS_ENDPOINT` | `cms.appSync.apiEndpoint` |
| `APPSYNC_CMS_API_KEY` | `cms.appSync.apiKey` |
| `APPSYNC_CMS_REGION` | `cms.appSync.region` |
| `NWS_PROXY_ENDPOINT` | `weather.apiEndpoint` |
| `SEVERE_WEATHER_SIGNUP_API_ENDPOINT` | `weather.alertSignup.apiEndpoint` |
| `SEVERE_WEATHER_SIGNUP_ENABLED` | `weather.alertSignup.enabled` |
| `CONTACT_UPDATE_REVIEW_API_URL` | `contactUpdate.reviewApiEndpoint` |

Never commit secret values. Endpoint should match Gen 1 SSOT — see `npm run verify:runtime-config-cms`.
