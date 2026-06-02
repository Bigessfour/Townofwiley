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

**Current frontend hosting:** S3 `townofwiley-static-site` + CloudFront `E1NZ3XCY5CYR1J` (SPA Function, OAI, ACM us-east-1, Route 53 aliases). Full details + current domain + deploy commands: `README.md` and `AWS_INFRASTRUCTURE_SOT.md`.

- Use the repository runbooks in `docs/` first (especially `AWS_INFRASTRUCTURE_SOT.md`, `aws-cost-optimization-runbook.md`, and historical `AMPLIFY_HOSTING_SOT.md` for build/CSP context).
- For frontend deploys: build → `aws s3 sync dist/... s3://townofwiley-static-site --delete` → `aws cloudfront create-invalidation --distribution-id E1NZ3XCY5CYR1J --paths "/*"`.
- Amplify references in docs/scripts are primarily for the **backend** (AppSync/Gen2 resources under current CFN stacks like `amplify-townofwiley-main-d1245-*`, Cognito if still present, document storage) or historical hosting context. The old hosting app `d331voxr1fhoir` is deleted.
- Prefer the AWS Toolkit and AWS AI Toolkit extensions for cloud navigation when they are available in VS Code.
- Keep CloudFormation, IAM, S3, and CloudFront changes narrow and reversible.
- Treat backend (AppSync, Lambda Function URLs for chatbot/guestbook/contact, DynamoDB) changes as high-impact.
- Do not change secrets or environment values unless the repo scripts or runbooks call for it.
- Verify hosting / infra changes against `npm run verify:aws-infra`, live `curl -I https://townofwiley.gov` (or the CloudFront domain), and the manifests before widening scope.
- Cost and free-tier posture: see `docs/aws-cost-optimization-runbook.md` (1-day CW retention, no WAF rate ACLs on public endpoints, minimal resources).
