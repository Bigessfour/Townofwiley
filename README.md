# Townofwiley

TownOfWiley Website

## Runtime Baseline

- Supported production Node lines: `24.x` preferred, `22.x` acceptable
- Do not deploy or build on odd-numbered current releases such as `25.x`
- This workspace was last observed on local `node v25.2.1`, so switch locally before build and test runs if you want parity with Amplify

Recommended local workflow:

```bash
nvm install 24
nvm use 24
node -v
```

## Deployment Record

### AWS Amplify

- App name: `Townofwiley`
- App ID: `d331voxr1fhoir`
- Region: `us-east-2`
- Repository: `https://github.com/Bigessfour/Townofwiley`
- Default domain: `d331voxr1fhoir.amplifyapp.com`
- Production branch: `main`
- Build command: `npm run build`
- Build output: `dist/townofwiley-app/browser`
- Node runtime for Amplify builds: `24.x`

Amplify build spec:

```yml
version: 1
frontend:
	phases:
		preBuild:
			commands:
				- nvm install 24
				- nvm use 24
				- npm ci
		build:
			commands:
				- npm run build
	artifacts:
		baseDirectory: dist/townofwiley-app/browser
		files:
			- "**/*"
	cache:
		paths:
			- node_modules/**/*
```

Custom domain recovery details:

- Domain under recovery: `townofwiley.gov`
- Preferred public hostname during recovery: `www.townofwiley.gov`
- Known-good fallback hostname: `https://main.d331voxr1fhoir.amplifyapp.com`
- Amplify status at last check: `AVAILABLE`
- Current Amplify branch mapping:
  - `www` -> `main`
- Current Amplify-required `www` target:
  - `www.townofwiley.gov` -> `d3fmdu29qcwosh.cloudfront.net`
- Amplify verification CNAME:
  - Name: `_f4cd947025ff4f4f7e1f4fb150940ac9.townofwiley.gov`
  - Target: `_377aa211e662dc086d0721e3a52067df.jkddzztszm.acm-validations.aws`

Important custom-domain note for future maintainers:

- The apex domain (`townofwiley.gov`) repeatedly caused CloudFront alias conflicts when attached directly in Amplify.
- The current stable recovery strategy is to let Amplify own `www` only and handle the root-domain redirect separately after `www` is healthy.
- Route 53 is now the intended authoritative DNS provider for `townofwiley.gov`.
- Do not point the apex at an old or random CloudFront hostname from a failed Amplify attempt.

### Route 53

- Hosted zone: `townofwiley.gov`
- Hosted zone ID: `Z088746831TMIL67NZ0VF`
- Authoritative nameservers:
  - `ns-360.awsdns-45.com`
  - `ns-1383.awsdns-44.org`
  - `ns-1718.awsdns-22.co.uk`
  - `ns-530.awsdns-02.net`

Route 53 DNS records expected during the current recovery path:

- `www.townofwiley.gov` `CNAME` -> `d3fmdu29qcwosh.cloudfront.net`
- `_f4cd947025ff4f4f7e1f4fb150940ac9.townofwiley.gov` `CNAME` -> `_377aa211e662dc086d0721e3a52067df.jkddzztszm.acm-validations.aws`
- Root-domain handling should be treated separately from Amplify until an explicit apex plan is implemented.

Current DNS migration note:

- During registrar propagation, some public resolvers may still return the old delegated nameservers for several hours.
- Route 53 can be considered ready once public NS lookups stop returning Cloudflare and instead return the four AWS nameservers above.
- As of the current recovery state, only `www` is intentionally wired through Amplify. The bare domain still needs a separate redirect or direct apex-hosting decision.
- If mail forwarding is still needed after the Cloudflare removal, replace the old Cloudflare Email Routing plan with an AWS-native or other managed mail-routing solution.

Verification check completed after creating the ACM CNAME:

```text
nslookup -type=CNAME _f4cd947025ff4f4f7e1f4fb150940ac9.townofwiley.gov

_f4cd947025ff4f4f7e1f4fb150940ac9.townofwiley.gov canonical name =
_377aa211e662dc086d0721e3a52067df.jkddzztszm.acm-validations.aws
```

### Operational Note

The blocked `Invoke-RestMethod` calls came from the Copilot terminal execution policy in this environment, not from any workspace file in this repository. There are no repo-level Copilot customization or hook files present here to change that behavior.

## User Secrets Locker

This repository now includes a repo-local user secrets workflow that keeps plaintext credentials out of git while still making encrypted secrets portable across machines.

Tracked files:

- `secrets/encrypted/user-secrets.lockbox.json` stores encrypted secrets that can be committed and synced.
- `secrets/templates/user-secrets.template.json` documents the supported secret structure and non-secret metadata.
- `scripts/user-secrets.mjs` provides the lock, unlock, status, and environment import commands.

Gitignored shield:

- `secrets/local/user-secrets.json` is the editable plaintext file.
- `secrets/local/.passphrase` stores the local encryption passphrase if you do not want to pass it in an environment variable.
- The `secrets/local` folder is protected by gitignore so plaintext never enters the repository history.

Commands:

```bash
npm run secrets:init
npm run secrets:init:local-passphrase
npm run secrets:status
npm run secrets:unlock
npm run secrets:lock
npm run secrets:lock:prune
npm run secrets:prune-local
npm run secrets:import-env
```

Cross-machine usage:

1. Pull the repository so the encrypted lockbox is present.
2. Provide the same passphrase on the new machine through `TOW_SECRETS_PASSPHRASE` or, if you accept the local-at-rest tradeoff, `secrets/local/.passphrase`.
3. Run `npm run secrets:unlock` to hydrate the local gitignored plaintext file.

Practical workflow:

1. `npm run secrets:init`
2. Set `TOW_SECRETS_PASSPHRASE` or, for convenience on one machine, run `npm run secrets:init:local-passphrase`.
3. `npm run secrets:unlock`
4. Edit or import secrets locally.
5. `npm run secrets:lock:prune` to update the tracked ciphertext and remove local plaintext afterward.

Current security hardening:

- `package.json` now overrides `undici` to `^7.24.5` so the dependency tree does not stay pinned to the vulnerable `7.22.0` version pulled in by `@angular/build`.

## Easy-Peasy Chatbot

The site can now load the Easy-Peasy chatbot from deployment-time runtime config instead of hardcoding a bot URL into the Angular app shell.

How it works:

- `public/runtime-config.js` stores the browser-safe chatbot settings.
- `public/easy-peasy-loader.js` injects the Easy-Peasy widget only when a chatbot URL is configured.
- `npm start` and `npm run build` both regenerate `public/runtime-config.js` before Angular starts.

Configuration sources:

- `EASYPEASY_CHAT_URL`
- Optional `EASYPEASY_BUTTON_POSITION`
- `secrets/local/user-secrets.json -> chatbot.easyPeasy.chatUrl`

Amplify setup:

1. Create the bot in Easy-Peasy and copy the bot URL.
2. Add `EASYPEASY_CHAT_URL` as an Amplify environment variable for the `main` branch.
3. Redeploy. If the value is present, the widget loads automatically on every page.

If no chatbot URL is configured, the site renders normally and no Easy-Peasy script is injected.

## Clerk CMS Starter

The site now includes a starter clerk-facing content editor at `/admin`.

Plain-language staff guide:

- See [CLERK-CMS-GUIDE.md](CLERK-CMS-GUIDE.md) for a non-technical walkthrough written for town staff.

Current scope:

- Purpose: edit homepage text, emergency banner content, notice cards, and public contact cards without touching code
- Current persistence: browser-local storage only
- Current audience: prototype and workflow validation for the future clerk CMS
- Current limitation: there is no authentication or shared AWS-backed content API yet

What this starter proves:

- A non-technical editor can manage the most important homepage content from a plain-language screen
- The homepage can already read banner, notice, contact, and headline content from a runtime content store instead of hardcoded arrays and strings
- The next AWS step can focus on Cognito plus a shared Lambda and DynamoDB content API without changing the public editing workflow much

Operational note:

- Treat `/admin` as a local prototype route until authentication is added
- Do not rely on browser-local storage for official production publishing across devices
- The next implementation step is to move this content store behind an authenticated AWS API so clerk changes publish for all residents, not just one browser session

## NWS Weather Proxy

The homepage weather panel now supports two modes:

- Direct browser requests to `api.weather.gov` for local development and simple fallback behavior.
- A Town of Wiley AWS proxy endpoint for production, which is the preferred path because NWS expects a meaningful `User-Agent` header that browsers cannot set.

Runtime configuration sources:

- `NWS_PROXY_ENDPOINT`
- Optional `NWS_ALLOW_BROWSER_FALLBACK`
- `secrets/local/user-secrets.json -> weather.nws.apiEndpoint`
- `secrets/local/user-secrets.json -> weather.nws.allowBrowserFallback`

Maintainer reference values for this site:

- Town: Wiley, Colorado
- ZIP code: `81092`
- Primary display location used in the UI: `Wiley, CO`
- Point lookup used by the frontend and proxy: `38.154,-102.72`
- Forecast page link used by the UI: `https://forecast.weather.gov/MapClick.php?lat=38.155356&lon=-102.719248`
- Forecast zone used for alert filtering: `COZ098`
- Zone label from NWS: `Lamar Vicinity / Prowers County`
- Current design intent: treat `COZ098` as the practical Wiley service area, which covers Wiley plus the surrounding area well beyond a 20-mile radius

Why `COZ098` matters:

- The severe-weather logic does not try to calculate a literal radius.
- The NWS zone is the official alert boundary used by the site.
- If alerts ever look wrong, verify the zone first before changing code.
- Current alert endpoint pattern:

```text
https://api.weather.gov/alerts/active?zone=COZ098
```

Core operational files:

- Frontend weather component: [src/app/weather-panel/weather-panel.ts](src/app/weather-panel/weather-panel.ts)
- Frontend weather template: [src/app/weather-panel/weather-panel.html](src/app/weather-panel/weather-panel.html)
- AWS weather proxy handler: [infrastructure/nws-weather-proxy/index.mjs](infrastructure/nws-weather-proxy/index.mjs)
- Runtime config generator: [scripts/generate-runtime-config.mjs](scripts/generate-runtime-config.mjs)
- Local/encrypted secrets workflow: [scripts/user-secrets.mjs](scripts/user-secrets.mjs)

Required runtime settings:

- Amplify environment variable: `NWS_PROXY_ENDPOINT`
- Optional Amplify environment variable: `NWS_ALLOW_BROWSER_FALLBACK`
- Lambda environment variable: `NWS_USER_AGENT`
- Optional Lambda environment variable: `NWS_API_KEY`

Recommended `NWS_USER_AGENT` format:

```text
TownOfWileyWeather/1.0 (contact: bigessfour@gmail.com)
```

AWS account and hosting identifiers that future maintainers will need:

- AWS account ID: `570912405222`
- AWS region: `us-east-2`
- Amplify app ID: `d331voxr1fhoir`
- Amplify app name: `Townofwiley`
- Production branch: `main`
- Static build output: `dist/townofwiley-app/browser`

Expected runtime behavior:

1. If `NWS_PROXY_ENDPOINT` is set, the weather panel uses the AWS proxy.
2. If the proxy fails and browser fallback is enabled, the site retries against public `api.weather.gov`.
3. If the proxy fails and browser fallback is disabled, the site shows an error state and links residents to the full forecast page.

Common failure points and what to verify:

1. No weather data appears at all:
   Check that `public/runtime-config.js` contains the expected `weather` block after build or deploy.
2. Proxy returns errors:
   Check that the Lambda has `NWS_USER_AGENT` set and that the string still includes a valid maintainer contact.
3. Alerts look too broad or too narrow:
   Reconfirm that Wiley is still being mapped to `COZ098` and that NWS has not changed the point-to-zone mapping.
4. Browser works locally but production fails:
   Verify `NWS_PROXY_ENDPOINT` in Amplify and confirm the deployed proxy URL still responds with JSON.
5. Tests fail only on mobile:
   Check the Playwright smoke suite first; mobile interactions are covered there specifically for chat and weather refresh.

Useful manual verification URLs:

- Point metadata: `https://api.weather.gov/points/38.154,-102.72`
- Active alerts for Wiley area: `https://api.weather.gov/alerts/active?zone=COZ098`
- Public forecast page: `https://forecast.weather.gov/MapClick.php?lat=38.155356&lon=-102.719248`
- National forecast maps: `https://www.weather.gov/forecastmaps`

Production recommendation:

1. Deploy `infrastructure/nws-weather-proxy/index.mjs` as an AWS Lambda-backed HTTP endpoint.
2. Set `NWS_USER_AGENT` on that function.
3. Set `NWS_PROXY_ENDPOINT` in Amplify so the Angular app uses the AWS proxy instead of direct browser requests.
4. Leave browser fallback enabled only if you want a safety net during rollout.

## Severe Weather Signup Backend

The repository now includes a Python AWS backend for resident severe weather signups, confirmation links, unsubscribe handling, and scheduled NWS alert fanout for Wiley service area residents.

Core backend files:

- Signup Lambda handler: [infrastructure/severe-weather-signup/app.py](infrastructure/severe-weather-signup/app.py)
- Lambda entrypoint shim: [infrastructure/severe-weather-signup/index.py](infrastructure/severe-weather-signup/index.py)
- Backend tests: [infrastructure/severe-weather-signup/tests/test_app.py](infrastructure/severe-weather-signup/tests/test_app.py)
- Deployment script: [scripts/deploy-severe-weather-backend.py](scripts/deploy-severe-weather-backend.py)

Service contract:

- Allowed resident ZIP code: `81092`
- NWS alert zone: `COZ098`
- Supported notification channels: `email` and `sms`
- Public routes:
  - `POST /subscriptions`
  - `GET /confirm`
  - `GET /unsubscribe`
  - `GET /health`
- Scheduled route source: EventBridge `rate(5 minutes)` by default

Required AWS resources created by the deploy script:

- Lambda function running on `python3.13`
- Lambda Function URL with public unauthenticated access
- DynamoDB subscriptions table
- DynamoDB delivery deduplication table
- EventBridge schedule for repeated alert polling
- IAM role with Lambda basic execution, DynamoDB access, SNS publish, and SES send permissions

Live backend identifiers at last successful deployment:

- Lambda function name: `TownOfWileySevereWeatherBackend`
- Lambda role: `arn:aws:iam::570912405222:role/TownOfWileySevereWeatherRole`
- Public Function URL: `https://myqlw4fgzf5hwnes5ki2msye2m0bbbue.lambda-url.us-east-2.on.aws`
- Subscriptions table: `TownOfWileySevereWeatherSubscriptions`
- Deliveries table: `TownOfWileySevereWeatherDeliveries`
- EventBridge rule name: `TownOfWileySevereWeatherPoller`
- Current sender email: `bigessfour@gmail.com`
- Current notification sender name: `Town of Wiley Alerts`
- Current NWS user agent: `TownOfWileyWeather/1.0 (contact: bigessfour@gmail.com)`
- Current allowed ZIP code: `81092`
- Current alert zone: `COZ098`

Amplify branch settings related to alert signup at last successful deployment:

- `SEVERE_WEATHER_SIGNUP_API_ENDPOINT=https://myqlw4fgzf5hwnes5ki2msye2m0bbbue.lambda-url.us-east-2.on.aws`
- `SEVERE_WEATHER_SIGNUP_ENABLED=true`

Operational warning for future maintainers:

- If email confirmations suddenly stop working, verify the SES identity status for `bigessfour@gmail.com` in `us-east-2` first.
- If the Function URL starts returning `403`, check both Lambda resource-policy statements for Function URL access before changing app code.
- The current IAM user still lacks `events:DescribeRule`, so deployment verification from this workspace may not be able to read back the EventBridge rule even when the scheduler itself already exists.

Required runtime and secret settings:

- Lambda environment variables:
  - `SUBSCRIPTIONS_TABLE`
  - `DELIVERIES_TABLE`
  - `SENDER_EMAIL`
  - `NOTIFICATION_SENDER_NAME`
  - `ALLOWED_ZIP_CODE`
  - `ALERT_ZONE_CODE`
  - `PUBLIC_API_BASE_URL`
  - `NWS_USER_AGENT`
  - Optional `NWS_API_KEY`
- Amplify branch environment variables:
  - `SEVERE_WEATHER_SIGNUP_API_ENDPOINT`
  - `SEVERE_WEATHER_SIGNUP_ENABLED`
- Repo-local secrets support:
  - `weather.alertSignup.enabled`
  - `weather.alertSignup.apiEndpoint`
  - `weather.alertSignup.senderEmail`

Deployment flow:

1. Unlock or import repo-local secrets so AWS credentials, Amplify app ID, and NWS sender values are available.
2. Ensure the sender address you plan to use in `SENDER_EMAIL` is verified in SES for `us-east-2`.
3. Run `npm run deploy:severe-weather-backend`.
4. The script packages the Python backend, creates or updates the Lambda function, creates the Function URL, provisions DynamoDB tables, configures the EventBridge poller, updates the Amplify branch environment, and starts an Amplify release unless skipped.

Optional deployment flags:

```bash
python scripts/deploy-severe-weather-backend.py --skip-amplify-release
python scripts/deploy-severe-weather-backend.py --sender-email alerts@townofwiley.gov
python scripts/deploy-severe-weather-backend.py --branch-name main
```

Operational notes:

- The deploy script reads AWS credentials and default metadata from `secrets/local/user-secrets.json` when environment variables are not already set.
- The script updates Amplify `main` branch environment values to keep the Angular runtime config aligned with the live backend URL.
- Email confirmation and alert delivery will remain blocked until the configured SES sender identity is verified.
- SMS sending uses SNS directly, so destination-country and spend-limit policies still apply in the AWS account.

## Regression Testing

The weather integration is now covered at three layers:

- Angular browser unit tests for direct NWS, proxy mode, and proxy fallback.
- Node-level proxy tests for the AWS handler.
- Playwright smoke coverage for homepage weather rendering and refresh behavior.

Commands:

```bash
npm run test:unit:browser
npm run test:infra
npm run test:infra:alerts
npm run test:e2e:smoke
npm run test:regression
```

Mobile-specific regression coverage now checks:

- Programmatic chat submission on the mobile homepage
- Chat fallback handling when the proxy returns malformed data
- Weather refresh behavior on the mobile homepage without a full page reload

## Trunk Hook

This repository now includes a tracked Git `pre-push` hook at [.githooks/pre-push](.githooks/pre-push).

Behavior:

- Runs Trunk formatting across tracked repository files before every push.
- Allows the push to continue only if Trunk leaves the tracked file set unchanged.
- Aborts the push if formatting changed any tracked file so the formatted result can be reviewed and committed first.

One-time setup for each clone:

```bash
git config core.hooksPath .githooks
```

Manual verification:

```bash
trunk fmt --all
```

Operational note:

- The hook requires the Trunk CLI to be installed and on `PATH`.
- The current repo-local Trunk configuration lives in [.trunk/trunk.yaml](.trunk/trunk.yaml).
