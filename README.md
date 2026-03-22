# Townofwiley
TownOfWiley Website

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

Amplify build spec:

```yml
version: 1
frontend:
	phases:
		preBuild:
			commands:
				- npm install
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

Custom domain details returned by Amplify:

- Domain: `townofwiley.gov`
- Amplify status at last check: `PENDING_VERIFICATION`
- Amplify verification CNAME:
	- Name: `_f4cd947025ff4f4f7e1f4fb150940ac9.townofwiley.gov`
	- Target: `_377aa211e662dc086d0721e3a52067df.jkddzztszm.acm-validations.aws`
- Amplify-reported branch mappings:
	- Apex domain -> `main`
	- `www` -> `main`
- Amplify-reported DNS targets for the custom domain:
	- Apex domain -> `d10ajz3eyg3r6n.cloudfront.net`
	- `www` -> `d10ajz3eyg3r6n.cloudfront.net`

### Cloudflare

- Zone: `townofwiley.gov`
- Zone status: `active`
- DNS mode for Amplify records: `DNS only` (`proxied: false`)

Cloudflare DNS records confirmed on this machine:

- `townofwiley.gov` `CNAME` -> `main.d331voxr1fhoir.amplifyapp.com`
- `www.townofwiley.gov` `CNAME` -> `main.d331voxr1fhoir.amplifyapp.com`
- `_f4cd947025ff4f4f7e1f4fb150940ac9.townofwiley.gov` `CNAME` -> `_377aa211e662dc086d0721e3a52067df.jkddzztszm.acm-validations.aws`

Cloudflare Email Routing plan:

- Use Cloudflare's built-in Email Routing for inbound official alias forwarding.
- Current front-end aliases referenced on the site:
	- `stephen.mckitrick@townofwiley.gov`
	- `deb.dillon@townofwiley.gov`
	- `scott.whitman@townofwiley.gov`
- Each custom address must forward to one verified destination inbox in Cloudflare Email Routing.
- Enabling Email Routing will add and lock the required Cloudflare-managed `MX` and `SPF` records for the zone.
- The current repo-local API token can read the zone but does not yet have Email Routing management permission, so alias creation must be completed in the Cloudflare dashboard or with a broader token before these links become live.

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
