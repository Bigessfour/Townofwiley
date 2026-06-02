# AWS cost optimization runbook

Town of Wiley account **`570912405222`**, primary region **`us-east-2`**. Target steady-state spend: **under free tier** for low traffic (target <$5-10/mo guardrail with $50 budget alerts).

**June 2026 final state:** Frontend migrated to S3 + CloudFront (minimal cost); all legacy Wiley Widget resources (Aurora PostgreSQL Serverless, NAT Gateway, App Runner `wiley-widget-api`, separate Amplify app) fully decoupled and deleted; WAF rate-limit WebACLs removed; CloudWatch log retention set to minimum 1 day on all groups. Main site now on `townofwiley-static-site` S3 + CloudFront `E1NZ3XCY5CYR1J`.

Never commit AWS credentials. Use `source scripts/agent-aws-env.sh` (falls back to `steve` / `default` when `townofwiley` is not configured).

## Quick commands

```bash
source scripts/agent-aws-env.sh
npm run aws:optimize:discover   # Cost Explorer, current resources
npm run aws:optimize:budget     # ALERT_EMAIL=admin@townofwiley.gov npm run aws:optimize:budget
npm run verify:aws-infra
```

## Current posture (post full cleanup)

- **No Aurora/RDS** (widget DB deleted after final snapshot).
- **No NAT Gateway / VPC remnants** from widget.
- **No App Runner**.
- **No WAF** rate-based ACLs on public endpoints (removed after dissociation; saves ~$7+/mo).
- **CloudWatch:** 1-day retention on all Lambda / custom log groups (via `configure-townofwiley-cloudwatch-logging.py` or manual).
- **S3:** Document bucket lifecycle policies in place; static site bucket minimal.
- **AppSync + DynamoDB:** Pay-per-use for CMS (low traffic).
- **Lambda Function URLs:** Chatbot (Easy-Peasy proxy), guestbook, contact-review, etc. — pay per request, free tier eligible.
- **Hosting:** S3 + CloudFront (very low cost for static SPA; free tier eligible).
- **Budget:** `Townofwiley-Monthly-50` + email alerts active.

## Discovery

1. `npm run aws:optimize:discover` (or manual Cost Explorer + `aws resourcegroupstaggingapi get-resources`).
2. Confirm no stray EC2-Other / VPC / RDS / ECS / App Runner charges.
3. Re-run after any infra changes.

## Scripts (repo)

| Script                                                                                                          | Purpose                                             |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [`scripts/agent-aws-env.sh`](../scripts/agent-aws-env.sh)                                                       | Export profile + region for agents                  |
| [`scripts/optimize-aws-costs.sh`](../scripts/optimize-aws-costs.sh)                                             | Discovery (macOS-safe Cost Explorer dates)          |
| [`scripts/setup-aws-budget.sh`](../scripts/setup-aws-budget.sh)                                                 | $50 budget + email alerts                           |
| [`scripts/apply-aws-cost-optimizations.sh`](../scripts/apply-aws-cost-optimizations.sh)                         | (Legacy; most optimizations now manual or one-time) |
| [`scripts/configure-townofwiley-cloudwatch-logging.py`](../scripts/configure-townofwiley-cloudwatch-logging.py) | Set 1-day retention on Lambda groups                |

See also [`infrastructure/aws-infrastructure.manifest.json`](../infrastructure/aws-infrastructure.manifest.json) and [`docs/AWS_INFRASTRUCTURE_SOT.md`](./AWS_INFRASTRUCTURE_SOT.md) (updated for S3+CloudFront hosting).

**If costs rise:** Re-run discovery, check for unexpected Lambda invocations, verify no old Amplify hosting remnants, confirm WAF ACLs are fully deleted.
