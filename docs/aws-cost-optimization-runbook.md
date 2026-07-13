# AWS cost optimization runbook

Town of Wiley account **`570912405222`**, primary region **`us-east-2`**. Target steady-state spend: **under free tier** for low traffic (target <$5-10/mo guardrail with $50 budget alerts).

**June 2026 final state:** Frontend migrated to S3 + CloudFront (minimal cost); all legacy Wiley Widget resources (Aurora PostgreSQL Serverless, NAT Gateway, App Runner `wiley-widget-api`, separate Amplify app) fully decoupled and deleted; WAF rate-limit WebACLs removed; CloudWatch log retention set to minimum 1 day on all groups. Main site now on `townofwiley-static-site` S3 + CloudFront `E1NZ3XCY5CYR1J`.

Never commit AWS credentials. Use `source scripts/agent-aws-env.sh` (falls back to `steve` / `default` when `townofwiley` is not configured).

## Quick commands

```bash
source scripts/agent-aws-env.sh
npm run aws:optimize:discover   # Cost Explorer, current resources
npm run aws:optimize:budget     # ALERT_EMAIL=admin@townofwiley.gov npm run aws:optimize:budget
npm run aws:guestbook:discover  # hello-from guestbook-only Lambda/DynamoDB/IAM (July 2026)
npm run verify:aws-infra
```

## Current posture (post full cleanup)

- **No Aurora/RDS** (widget DB deleted after final snapshot).
- **No NAT Gateway / VPC remnants** from widget.
- **No App Runner**.
- **No WAF** rate-based ACLs on public endpoints (removed after dissociation; saves ~$7+/mo).
- **CloudWatch:** 1-day retention on all Lambda / custom log groups (via `configure-townofwiley-cloudwatch-logging.py` or manual).
- **S3:** Document bucket lifecycle policies in place; static site bucket minimal.
- **AppSync + DynamoDB:** Pay-per-use CMS backend. Public site uses **stale-while-revalidate** reads in `site-cms-content.ts`: paint from `/cms-snapshot.json` / localStorage, then **always** fetch live AppSync when credentials exist. Staff **Refresh from database** on `/admin` forces a clean reload. See **AppSync public read optimization** below.
- **Lambda Function URLs:** Chatbot (Easy-Peasy proxy), contact-review, weather signup, etc. — pay per request, free tier eligible.
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

**If costs rise:** Re-run discovery, check AppSync request volume (CloudWatch `Latency` sample count on API `j7b2x3sh7rcezekekkxxiak7hi`), verify stale-while-revalidate behavior, check for unexpected Lambda invocations, confirm no old Amplify hosting remnants, confirm WAF ACLs are fully deleted.

## AppSync public read optimization (June 2026 → revised June 2026)

**Problem (June 2026):** Public site previously called AppSync on **every page load** (core + extended queries) even when a fresh browser snapshot existed, plus **N+1 `getAnnouncement` reconcile** queries after each core load. That drove ~$10+/mo AppSync at modest traffic.

**June 2026 mitigation (superseded):** A 6-hour cache-first gate (`CMS_LIVE_REFRESH_TTL_MS`) skipped repeat AppSync when snapshots were fresh. That reduced cost but caused clerk confusion when deploy snapshots or localStorage blocked live data.

**Current policy (June 2026):** **Revision-based CDN snapshots** — clerk saves trigger `TownOfWileyCmsChangeNotifier` to republish `/cms-snapshot.json` + `/cms-revision.json` (~1 minute). Public site skips AppSync when revision matches; polls every 2 minutes. AppSync only for staff preview and `/admin` force refresh.

| Control                 | Location                                                   | Effect                                                    |
| ----------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| Push-on-change snapshot | `infrastructure/cms-change-notifier/snapshot_publisher.py` | ~2 AppSync queries per CMS edit (Lambda), not per visitor |
| Revision gate           | `/cms-revision.json` + `LocalizedCmsContentStore`          | Skip AppSync when browser revision matches CDN            |
| Revision poll           | `CMS_REVISION_POLL_MS` (2 min)                             | Open tabs pick up clerk saves without AppSync             |
| Offline fallback TTL    | `CMS_SNAPSHOT_TTL_MS` (7 days)                             | localStorage when CDN/AppSync unavailable                 |
| Build/deploy snapshot   | `generate-cms-snapshot.mjs`, `deploy-static-site.sh`       | `no-cache` headers on snapshot + revision files           |

**Staff workflow after CMS edits:** Save in `/admin` → wait **about one minute** → normal refresh on public page. Editor shows an info toast about the delay. **Force Refresh Live CMS Content** verifies admin view via AppSync immediately.

**Cost note:** Public AppSync reads drop to staff/preview only; monitor Lambda `TownOfWileyCmsChangeNotifier` duration and AppSync volume on stream publishes.

**Optional AWS follow-ups:** delete unused AppSync API key, disable schema introspection on production API, attach WAF rate-based rule to GraphQL endpoint if bot traffic returns.
