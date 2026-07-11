---
description: 'Use when managing AWS hosting elements for this repo, including S3 + CloudFront static hosting, CloudFormation, IAM, S3, AppSync, Lambda Function URLs, and deployment troubleshooting. (Amplify Hosting was decommissioned June 2026.)'
name: 'AWS Hosting Standards'
applyTo:
  - 'amplify/**'
  - 'amplify.yml'
  - 'src/app/amplify-config.ts'
  - 'docs/amplify-*.md'
  - 'docs/*SOT*.md'
  - 'scripts/*cloudfront*'
---

# AWS Hosting Standards (Updated June 2026)

**Current frontend hosting:** S3 `townofwiley-static-site` + CloudFront `E1NZ3XCY5CYR1J` (SPA Function, OAC `E1UXALBLRIDL2E` active since 2026-06-20, custom Response Headers Policy for CSP+security headers, managed CachingOptimized, logging enabled). Full details + domain + improved deploy (cache controls): `README.md` and `AWS_INFRASTRUCTURE_SOT.md` (manifest SSOT for IDs).

- **Production CD:** merges to `main` auto-deploy via GitHub Actions (`deploy-production` job in `git-workflow.yml`) using OIDC role `GitHubActions-TownOfWiley-StaticSiteDeploy`. Runbook: [`docs/github-actions-production-deploy.md`](../../docs/github-actions-production-deploy.md). Canonical script: [`scripts/deploy-static-site.sh`](../../scripts/deploy-static-site.sh) (`npm run deploy:site` for local break-glass).

- Use the repository runbooks in `docs/` first (especially `AWS_INFRASTRUCTURE_SOT.md`, `aws-cost-optimization-runbook.md`, and historical `AMPLIFY_HOSTING_SOT.md` for build/CSP context).
- For frontend deploys: **automatic** on merge to `main` (Site CI artifact → [`scripts/deploy-static-site.sh`](../../scripts/deploy-static-site.sh) → CloudFront invalidation); **manual** via `npm run deploy:site` or GitHub **Deploy production (manual)**. Tiered Cache-Control passes match manifest `hosting.deployCommand`.
- Amplify references in docs/scripts are for the **Gen 1 backend** (AppSync `j7b2x3sh7rcezekekkxxiak7hi`, Cognito `us-east-2_DmY7BCBIp`, document storage) or historical hosting context. Amplify Gen 2 and hosting app `d331voxr1fhoir` are decommissioned — see `docs/gen2-decommissioned.md`.
- Prefer the AWS Toolkit and AWS AI Toolkit extensions for cloud navigation when they are available in VS Code.
- Keep CloudFormation, IAM, S3, and CloudFront changes narrow and reversible.
- Treat backend (AppSync, Lambda Function URLs for chatbot/contact, DynamoDB) changes as high-impact.
- Do not change secrets or environment values unless the repo scripts or runbooks call for it.
- Verify hosting / infra changes against `npm run verify:aws-infra`, live `curl -I https://townofwiley.gov` (or the CloudFront domain), and the manifests before widening scope.
- Cost and free-tier posture: see `docs/aws-cost-optimization-runbook.md` (1-day CW retention, no WAF rate ACLs on public endpoints, minimal resources).
