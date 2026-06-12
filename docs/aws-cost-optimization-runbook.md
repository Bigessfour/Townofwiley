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
- **AppSync + DynamoDB:** Pay-per-use CMS backend. Public site uses **cache-first** reads (`CMS_LIVE_REFRESH_TTL_MS` = 6 hours in `site-cms-content.ts`) plus build snapshot `/cms-snapshot.json` and 7-day offline `localStorage`. Staff **Refresh from database** on `/admin` bypasses cache. See **AppSync public read optimization** below.
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

**If costs rise:** Re-run discovery, check AppSync request volume (CloudWatch `Latency` sample count on API `j7b2x3sh7rcezekekkxxiak7hi`), verify public cache-first behavior, check for unexpected Lambda invocations, confirm no old Amplify hosting remnants, confirm WAF ACLs are fully deleted.

## AppSync public read optimization (June 2026)

**Problem:** Public site previously called AppSync on **every page load** (core + extended queries) even when a fresh browser snapshot existed, plus **N+1 `getAnnouncement` reconcile** queries after each core load. That drove ~$10+/mo AppSync at modest traffic.

**Implemented (frontend):**

| Control | Location | Effect |
|--------|----------|--------|
| Cache-first live refresh | `CMS_LIVE_REFRESH_TTL_MS` (6 h) in [`site-cms-content.ts`](../src/app/site-cms-content.ts) | Skip AppSync when build or `localStorage` snapshot is newer than 6 hours |
| Offline fallback TTL | `CMS_SNAPSHOT_TTL_MS` (7 days) | Unchanged — stale snapshots still usable when AppSync fails |
| Announcement reconcile | `reconcileAnnouncementRecordsFromPrimaryKey()` | Runs on staff `forceLiveRefresh` and in `generate-cms-snapshot.mjs` only — not on public loads |
| `SiteCopy` in snapshot | `createSnapshot()` / `applySnapshot()` | Extended-model cache includes SiteCopy rows |
| Document hub | `refreshContent()` | Inherits cache-first gate (30 s visibility debounce unchanged) |

**Staff workflow after CMS edits:** `/admin` → **Refresh from database** (or clerk save flows that call `forceLiveRefresh`). Residents within 6 h of their last successful fetch may see prior content until TTL expires or they get a new deploy (`cms-snapshot.json`).

**Optional AWS follow-ups (not in this PR):** delete unused AppSync API key, disable schema introspection on production API, attach WAF rate-based rule to GraphQL endpoint if bot traffic returns.
