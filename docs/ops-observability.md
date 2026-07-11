# Town of Wiley — Ops observability

Enterprise-style monitoring mapped to the municipal stack (Code Platoon “Enterprise Monitoring & Cloud Integration” adapted for account **`570912405222`**).

**Goals:** when something fails, know **what**, **which run**, **why**, **where evidence is**, and **who was notified**—without guessing and without a heavy APM bill.

## Architecture

```text
Public site (CloudFront/S3)
        │ synthetic probes every ~5m
        ▼
site-monitor Lambda ── SES email (existing)
                    └── SNS TOW_OPS_SNS_TOPIC_ARN (optional)
                    └── JSON logs → CloudWatch (1-day retention)

Site CI failure ── failure-context + Ollama ACTIONABLE.md
                └── scripts/ops_ci_on_failure.py
                        ├── SNS [ERROR] (if topic set)
                        └── S3 ops-artifacts/YYYY/MM/DD/{run_id}/ (if bucket set)

AppSync key rotation reminder ── existing SNS (may use same topic)

Budget ── existing AWS Budget email (see cost runbook)
```

## Shared libraries

| Module | Path | Role |
|--------|------|------|
| Structured logging | [`infrastructure/ops_lib/logging_json.py`](../infrastructure/ops_lib/logging_json.py) | JSON lines, `LOG_LEVEL`, correlation id |
| Reliability | [`infrastructure/ops_lib/reliability.py`](../infrastructure/ops_lib/reliability.py) | Retry/backoff, circuit breaker, timer |
| SNS notify | [`infrastructure/ops_lib/notify.py`](../infrastructure/ops_lib/notify.py) | Severity-prefixed subjects; **never raises** |
| S3 archive | [`infrastructure/ops_lib/s3_archive.py`](../infrastructure/ops_lib/s3_archive.py) | Timestamped keys; local fallback |

Tests: `npm run test:infra:ops`

## Environment variables

| Variable | Used by | Purpose |
|----------|---------|---------|
| `LOG_LEVEL` | ops_lib, Lambdas | `DEBUG` / `INFO` / `WARNING` (default `INFO`) |
| `LOG_FORMAT` | ops_lib | `json` (default) or `text` |
| `TOW_OPS_SNS_TOPIC_ARN` | site-monitor, CI script | Ops alert topic ARN |
| `TOW_OPS_ARTIFACTS_BUCKET` | CI script | Optional S3 bucket for failure artifacts |
| `CORRELATION_ID` | optional override | Defaults to new id or GitHub run id in CI |
| `AWS_REGION` | boto3 clients | Prefer `us-east-2` |

### One-time AWS setup (IT)

```bash
source scripts/agent-aws-env.sh
aws sts get-caller-identity   # must be 570912405222

# SNS topic + email subscription (confirm email inbox)
aws sns create-topic --name tow-ops-alerts --region us-east-2
# note TopicArn → set GitHub secret TOW_OPS_SNS_TOPIC_ARN and Lambda env
aws sns subscribe --topic-arn "$TOPIC_ARN" --protocol email --notification-endpoint ops@example.com

# Optional S3 ops bucket (lifecycle 30–90 days recommended)
aws s3api create-bucket --bucket townofwiley-ops-artifacts --region us-east-2 \
  --create-bucket-configuration LocationConstraint=us-east-2
```

Redeploy site-monitor with env `TOW_OPS_SNS_TOPIC_ARN` after topic exists:

```bash
# Via deploy script env or Lambda console configuration update
npm run deploy:site-monitor
```

## Failure playbook

| Symptom | Where to look | Alert |
|---------|---------------|--------|
| Public pages / CMS health fail | CloudWatch `/aws/lambda/TownOfWileyDeveloperMonitor` (JSON logs, `correlation_id`) | SES + optional SNS |
| Site CI red | Actions run + artifact `ci-failure-snapshot-*` / `ollama-ci-diagnosis-*` | Optional SNS from `ops_ci_on_failure` |
| AppSync API key expiring | Key rotation Lambda logs | Existing SNS reminder |
| Unexpected AWS spend | Cost Explorer + `npm run aws:optimize:discover` | Budget `TownofWiley-Monthly-50` |
| Static deploy failed | Actions `deploy-production` job | Actions only (extend SNS later if needed) |

## CI integration

On Site CI **gate failure**, job `ops-ci-failure-notify` (advisory) runs:

```bash
python3 scripts/ops_ci_on_failure.py --run-id "$GITHUB_RUN_ID"
```

No-ops when secrets/env are unset so forks and local runs stay green.

## Site monitor

- SES remains the primary human email path.
- When `TOW_OPS_SNS_TOPIC_ARN` is set, **CompositeMailer** also publishes SNS (`[ERROR]` on outage, `[INFO]` on recovery).
- Each run logs structured start/end, duration, and failed probe names.
- Response JSON includes `correlationId` and `durationMs`.

## Cost / non-goals

- CloudWatch log retention stays **1 day** (cost runbook).
- No browser-side APM or resident PII logging.
- No multi-region observability stack.
- Static site bucket is **not** used for ops dumps.

## Related docs

- [`docs/aws-cost-optimization-runbook.md`](./aws-cost-optimization-runbook.md)
- [`docs/github-actions-production-deploy.md`](./github-actions-production-deploy.md)
- [`docs/appsync-api-key-rotation-runbook.md`](./appsync-api-key-rotation-runbook.md)
- Site monitor deploy: `npm run deploy:site-monitor`
