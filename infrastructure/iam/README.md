# IAM policy snippets (Town of Wiley)

## `copilot` user — read Town Lambda CloudWatch logs

The `copilot` IAM user needs log read actions to run `aws logs tail` / `FilterLogEvents` without `AccessDeniedException`.

**Policy file:** [copilot-cloudwatch-logs-read-policy.json](./copilot-cloudwatch-logs-read-policy.json)  
Scoped to `log-group:/aws/lambda/TownOfWiley*` in **us-east-2** (primary) and **us-east-1** (email alias Lambda per runbook).

### Apply (account administrator)

Replace nothing if your account ID is already `570912405222`.

```bash
aws iam put-user-policy \
  --user-name copilot \
  --policy-name TownOfWileyCloudWatchLogsRead \
  --policy-document file://infrastructure/iam/copilot-cloudwatch-logs-read-policy.json \
  --region us-east-2
```

`iam` is global; `--region` is optional here.

### Verify

```bash
export AWS_PROFILE=copilot AWS_DEFAULT_REGION=us-east-2
aws logs tail /aws/lambda/TownOfWileySevereWeatherBackend --since 1h --format short | tail -20
```

### Remove (if needed)

```bash
aws iam delete-user-policy --user-name copilot --policy-name TownOfWileyCloudWatchLogsRead
```
