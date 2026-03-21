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

Verification check completed after creating the ACM CNAME:

```text
nslookup -type=CNAME _f4cd947025ff4f4f7e1f4fb150940ac9.townofwiley.gov

_f4cd947025ff4f4f7e1f4fb150940ac9.townofwiley.gov canonical name =
_377aa211e662dc086d0721e3a52067df.jkddzztszm.acm-validations.aws
```

### Operational Note

The blocked `Invoke-RestMethod` calls came from the Copilot terminal execution policy in this environment, not from any workspace file in this repository. There are no repo-level Copilot customization or hook files present here to change that behavior.
