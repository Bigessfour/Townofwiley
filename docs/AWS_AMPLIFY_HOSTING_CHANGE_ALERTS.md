# AWS logging and alerting: Amplify Hosting config changes

Use this when you want **audit visibility** and **notifications** anytime someone changes the Amplify Hosting app (including **custom HTTP headers / CSP** via Console, CLI, or `aws amplify update-app`).

Hosting header drift (“works on `ng serve`, breaks live”) usually comes from **`UpdateApp`** (or stale edge until redeploy). This does **not** replace repo checks (`npm run verify:custom-http-yaml`, `npm run amplify:sync-headers`); it **logs and alerts** so changes are not silent.

## 1. CloudTrail (audit log)

Amplify Hosting control-plane calls are recorded as **management events** with `eventSource` **`amplify.amazonaws.com`**. See [Logging Amplify API calls using AWS CloudTrail](https://docs.aws.amazon.com/amplify/latest/userguide/logging-using-cloudtrail.html).

- **Event history** (default, 90 days): CloudTrail console → **Event history** → filter **Event source** = `amplify.amazonaws.com`.
- **Continuous trail** (recommended for the Town of Wiley account): create or use an **organization / multi-Region trail** that delivers to **S3** (and optionally **CloudWatch Logs** for search). No extra config is required on the Amplify app itself.

Relevant API names to watch (non-exhaustive):

| Event name                | Why it matters                          |
| ------------------------- | --------------------------------------- |
| `UpdateApp`               | **Custom headers / CSP**, custom rules  |
| `UpdateBranch`            | Branch env vars (runtime-config inputs) |
| `CreateApp` / `DeleteApp` | Rare; high impact                       |

## 2. EventBridge: alert on `UpdateApp` (and optional `UpdateBranch`)

CloudTrail can **send events to EventBridge** so you can email or chat without parsing S3 logs.

1. **CloudTrail** → your trail → **Edit** → enable **Send events to EventBridge** (see [Send events to EventBridge](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/send-cloudtrail-events-to-eventbridge.html)).
2. **EventBridge** → **Rules** → **Create rule** (region should match where you create rules; use **`us-east-2`** for Amplify app `d331voxr1fhoir` if you put the rule there, or the home region you use for ops).
3. Event pattern (JSON) — after your first real `UpdateApp`, confirm field names in **Event history** / sample event; adjust if your organization wraps events:

```json
{
  "source": ["aws.cloudtrail"],
  "detail-type": ["AWS API Call via CloudTrail"],
  "detail": {
    "eventSource": ["amplify.amazonaws.com"],
    "eventName": ["UpdateApp", "UpdateBranch"]
  }
}
```

4. **Target**: **SNS topic** (e.g. `tow-amplify-hosting-changes`) → subscribe team email (or wire to Slack via AWS Chatbot).

5. **IAM**: The rule’s target execution role (or default) must allow **`sns:Publish`** on that topic.

**Noise control:** `UpdateApp` also runs when **non-header** fields change. To reduce noise, keep notifications and rely on the scheduled GitHub workflow [`hosting-headers-drift-watch.yml`](../.github/workflows/hosting-headers-drift-watch.yml) (live CSP probe) as the **“wrong CSP live”** signal; use CloudTrail/EventBridge for **who changed Hosting and when**.

## 3. Optional: CloudWatch Logs + metric filter

If the trail is configured with **CloudWatch Logs** integration, you can add a **metric filter** on `UpdateApp` and a **CloudWatch alarm** (e.g. **Notify on any update**). This duplicates EventBridge for teams that standardize on alarms.

## 4. Process (avoid repeat drift)

1. Change **`customHttp.yml`** in Git; run **`npm run verify:custom-http-yaml`** and **`npm run sync:angular-serve-csp`** as today.
2. Deploy Hosting headers with **`npm run amplify:sync-headers`** (Wiley credentials) **or** rely on Git + redeploy per [Setting custom headers](https://docs.aws.amazon.com/amplify/latest/userguide/setting-custom-headers.html).
3. After an alert fires, compare **`aws amplify get-app --query 'app.customHeaders'`** to repo **`customHttp.yml`** and re-run sync if needed.

## 5. Related repo automation

- **Daily** CSP probe against production: [`.github/workflows/hosting-headers-drift-watch.yml`](../.github/workflows/hosting-headers-drift-watch.yml) runs [`scripts/probe-live-hosting-csp.sh`](../scripts/probe-live-hosting-csp.sh).
- Single source of truth: [`customHttp.yml`](../customHttp.yml), [`docs/AMPLIFY_HOSTING_SOT.md`](AMPLIFY_HOSTING_SOT.md).
