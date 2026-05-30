# AWS cost optimization runbook

Town of Wiley account **`570912405222`**, primary region **`us-east-2`**. Target steady-state spend: **~$20–30/month** for low traffic; **$50/month budget** with email alerts as a guardrail.

Never commit AWS credentials. Use `source scripts/agent-aws-env.sh` (falls back to `steve` / `default` when `townofwiley` is not configured).

## Quick commands

```bash
source scripts/agent-aws-env.sh
npm run aws:optimize:discover   # Cost Explorer, RDS, AppSync data sources
npm run aws:optimize:budget     # ALERT_EMAIL=admin@townofwiley.gov npm run aws:optimize:budget
npm run aws:optimize:apply      # Budget + S3 lifecycle (+ Aurora CLI hints)
npm run verify:aws-infra
```

## Discovery gate (always first)

1. Run `npm run aws:optimize:discover`.
2. Confirm AppSync API `j7b2x3sh7rcezekekkxxiak7hi` data sources — production CMS uses **DynamoDB only** (`amplify/backend/api/townofwiley/schema.graphql`).
3. If Aurora/RDS exists but is **not** an AppSync data source, treat as **orphaned** (safe to scale down or delete after snapshot).

### Baseline recorded (2026-05-29)

| Item | Finding |
| ---- | ------- |
| Aurora | `wiley-co-aurora-db-encrypted` — Serverless v2, was Min **0.5** / Max **2.0** ACU; **not** used by AppSync |
| AppSync | All tables → `AMAZON_DYNAMODB` only |
| May 2026 top spend (Cost Explorer) | EC2-Other ~$30, Amplify ~$21, WAF ~$7.29, ECS ~$7.20, App Runner ~$5.72, VPC/NAT ~$3.72, AppSync ~$2.37, Secrets Manager ~$1.85 |
| Other resources | App Runner `wiley-widget-api`; NAT gateway `nat-0335d65959a2238a3` (likely Aurora VPC-related) |

Snapshot before Aurora changes: `wiley-co-aurora-pre-cost-opt-20260529`.

## Applied optimizations

| Step | Action | Status |
| ---- | ------ | ------ |
| Budget | `Townofwiley-Monthly-50` + alerts to `admin@townofwiley.gov` | Applied — confirm email subscriptions in AWS Billing |
| Aurora | Scale to MinCapacity **0**, MaxCapacity **1** | Applied 2026-05-29 (cluster status may show `modifying` briefly) |
| S3 | `townofwiley-documents-storage-main` lifecycle: 90d → IA, 365d → Glacier | Applied |

### Aurora scale (after snapshot is `available`)

```bash
source scripts/agent-aws-env.sh
aws rds modify-db-cluster \
  --db-cluster-identifier wiley-co-aurora-db-encrypted \
  --serverless-v2-scaling-configuration MinCapacity=0,MaxCapacity=1 \
  --apply-immediately
```

### Optional: delete orphaned Aurora (largest savings)

Only after **one week** of monitoring and confirming no external consumers:

1. Final cluster snapshot.
2. Delete `wiley-co-aurora-db-encrypted-1` instance, then cluster.
3. Review NAT gateway / VPC (`EC2-Other`, `VPC`) — may be removable if only Aurora used them.

## Secondary tuning (week 2+)

| Area | Notes |
| ---- | ----- |
| CloudWatch | Default **90-day** retention via `npm run configure:cloudwatch-logging`; consider `--log-retention-days 30` if compliance allows |
| WAF | ~$7/mo in May 2026 — keep if needed for abuse protection (AP-16); remove unused Web ACLs |
| App Runner | `wiley-widget-api` ~$5.72/mo — pause/delete if widget API is retired |
| Secrets Manager | ~$1.85/mo — audit unused secrets |
| Monthly | Re-run `npm run aws:optimize:discover`; watch budget alerts |

## Scripts (repo)

| Script | Purpose |
| ------ | ------- |
| [`scripts/agent-aws-env.sh`](../scripts/agent-aws-env.sh) | Export profile + region for agents |
| [`scripts/optimize-aws-costs.sh`](../scripts/optimize-aws-costs.sh) | Discovery (macOS-safe Cost Explorer dates) |
| [`scripts/setup-aws-budget.sh`](../scripts/setup-aws-budget.sh) | $50 budget + email alerts |
| [`scripts/apply-aws-cost-optimizations.sh`](../scripts/apply-aws-cost-optimizations.sh) | Budget + S3 lifecycle + Aurora command template |

See also [`infrastructure/aws-infrastructure.manifest.json`](../infrastructure/aws-infrastructure.manifest.json) and [`docs/AWS_INFRASTRUCTURE_SOT.md`](./AWS_INFRASTRUCTURE_SOT.md).
