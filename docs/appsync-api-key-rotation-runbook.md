# AppSync CMS API key rotation

Public CMS reads use an **AppSync API key** embedded in `runtime-config.js` at build time. Keys expire (current API `townofwiley-main`, id `j7b2x3sh7rcezekekkxxiak7hi`). Rotate before expiry so the site does not fall back to bundled content.

**Related:** [amplify-deployment-runbook.md](./amplify-deployment-runbook.md), [CMS-STUDIO-OPERATIONS-CHECKLIST.md](./CMS-STUDIO-OPERATIONS-CHECKLIST.md), [infrastructure/amplify-branch-env.manifest.json](../infrastructure/amplify-branch-env.manifest.json).

## Automated reminder

Deploy the EventBridge + Lambda + SNS checker (weekly; alerts when a key expires within 30 days):

```bash
export AWS_PROFILE=townofwiley
export AWS_REGION=us-east-2
python scripts/deploy-appsync-key-rotation-reminder.py --sns-email wileytown@centurytel.net
```

Confirm the SNS email subscription in your inbox after the first deploy.

## Rotation procedure

| Step | Action                                                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | List keys: `aws appsync list-api-keys --api-id j7b2x3sh7rcezekekkxxiak7hi --region us-east-2`                                                |
| 2    | Create replacement: `aws appsync create-api-key --api-id j7b2x3sh7rcezekekkxxiak7hi --expires $(date -u -v+365d +%s)` (macOS) or use Console |
| 3    | Update **Amplify Console → main → Environment variables**: `APPSYNC_CMS_API_KEY` = new value                                                 |
| 4    | Update **GitHub repository secrets** with the same name (keeps CI green)                                                                     |
| 5    | Redeploy `main` (Amplify build must pass strict runtime config)                                                                              |
| 6    | Verify live config: `curl -s https://townofwiley.gov/runtime-config.js` — `cms.appSync.apiKey` non-empty (do not paste key into tickets)     |
| 7    | Verify GraphQL: `npm run verify:runtime-config-cms`                                                                                          |
| 8    | Studio: confirm or create an **Event**; spot-check https://townofwiley.gov/meetings#calendar                                                 |
| 9    | After 24–48h bake-in, delete the old key: `aws appsync delete-api-key --api-id … --id <old-key-id>`                                          |
| 10   | Log evidence (date, job id, verifier) in your ops ticket                                                                                     |

## Completeness checks (post-rotation)

| #   | Check                               | How                                                                                                  |
| --- | ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Build fails on missing keys         | Temporarily clear one required Amplify env on a test branch → build fails with strict error; restore |
| 2   | New key in prod `runtime-config.js` | Step 6 above (compare prefix only in logs)                                                           |
| 3   | `listSiteSettings` returns data     | `npm run verify:runtime-config-cms`                                                                  |
| 4   | Calendar entry visible              | Studio Event + `/meetings#calendar` (or `e2e/specs/smoke/feature-pages.spec.ts` calendar test)       |

## Strict build

Production builds require all keys in `amplify-branch-env.manifest.json` → `requiredForProduction`:

- Amplify: `node scripts/generate-runtime-config.mjs --strict` (also in `amplify.yml` and `npm run prebuild`)
- GitHub Actions: repository secrets listed in [amplify-deployment-runbook.md](./amplify-deployment-runbook.md)

Missing keys fail the build instead of shipping empty endpoints.

## GitHub Actions secrets (mirror Amplify env)

| Secret                               | Runtime path                      |
| ------------------------------------ | --------------------------------- |
| `APPSYNC_CMS_ENDPOINT`               | `cms.appSync.apiEndpoint`         |
| `APPSYNC_CMS_API_KEY`                | `cms.appSync.apiKey`              |
| `APPSYNC_CMS_REGION`                 | `cms.appSync.region`              |
| `NWS_PROXY_ENDPOINT`                 | `weather.apiEndpoint`             |
| `SEVERE_WEATHER_SIGNUP_API_ENDPOINT` | `weather.alertSignup.apiEndpoint` |
| `SEVERE_WEATHER_SIGNUP_ENABLED`      | `weather.alertSignup.enabled`     |
| `EASYPEASY_API_ENDPOINT`             | `chatbot.apiEndpoint`             |
| `EASYPEASY_CHAT_URL`                 | `chatbot.chatUrl`                 |
| `CONTACT_UPDATE_REVIEW_API_URL`      | `contactUpdate.reviewApiEndpoint` |

Never commit secret values. Update **both** Amplify and GitHub when rotating CMS keys.
