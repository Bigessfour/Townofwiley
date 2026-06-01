# AWS security — free tier and no-extra-cost controls

**Policy (2026):** Run **free / included** controls only until **city council** approves new recurring AWS spend. Do **not** enable Amplify Firewall, new WAF Web ACLs, Shield Advanced, GuardDuty, or similar paid add-ons without that approval.

Town of Wiley account **`570912405222`**. Apply with:

```bash
source scripts/agent-aws-env.sh
npm run configure:free-tier-security
```

Dry run:

```bash
python scripts/configure-townofwiley-free-tier-security.py --dry-run
```

## What is free (or included)

| Control | Cost | Notes |
| -------- | ----- | ----- |
| **AWS Shield Standard** | Included | Automatic on CloudFront + Route 53 (L3/L4 DDoS mitigation). |
| **CloudTrail** (1st management trail) | Free delivery; S3 storage ~pennies | Multi-Region trail `townofwiley-account-trail`. |
| **S3 Block Public Access** | Free | Account + manifest buckets. |
| **IAM password policy** | Free | 14+ chars, rotation, reuse prevention. |
| **EBS encryption by default** | Free | `us-east-2`, `us-east-1`. |
| **IAM Access Analyzer** | Free | Account analyzer `townofwiley-account`. |
| **Cognito deletion protection** | Free | Gen 2 pool `us-east-2_pkewJMUJF`. |
| **API Gateway throttling** | Free | Contact review HTTP API stage `prod`. |
| **Lambda reserved concurrency** | Free | Optional: `--try-lambda-concurrency` (may fail if account unreserved pool is under 10). |
| **Security headers (CSP, HSTS)** | Free | [`customHttp.yml`](../customHttp.yml) via `npm run amplify:sync-headers`. |
| **Route 53 DNS alignment** | Free | `*.townofwiley.gov` → production CloudFront. |

## What costs money (defer until council approval)

| Control | Typical cost | When approved |
| -------- | ------------- | ------ |
| **AWS WAF** (new Web ACL / Amplify Firewall) | ~$5+/mo per ACL + rules + requests | Amplify Console → Hosting → Firewall; see AP-16 in inventory. |
| **AWS Shield Advanced** | ~$3,000+/mo | Sustained attack / enterprise requirement only. |
| **Cognito Advanced Security** | Per MAU | Staff pool hardening. |
| **GuardDuty / Security Hub** | After trial | Account threat detection. |

The configure script **reuses** the existing regional Web ACL `TownOfWileyContactReviewApiRateLimit` on **AppSync** and **Cognito** (no new ACL). You already pay for that ACL; association does not add a second ACL base fee.

**HTTP API (contact review)** cannot use WAF directly; the script uses **API Gateway throttling** instead (free).

## After running the script

1. `npm run amplify:sync-headers` and redeploy Amplify **`main`**.
2. `npm run verify:aws-infra`
3. Confirm CloudTrail logging in Console → CloudTrail → Trails.
4. **Do not** enable paid Firewall/WAF until council approves budget (see table above).

## Related

- [AWS_INFRASTRUCTURE_SOT.md](./AWS_INFRASTRUCTURE_SOT.md) — AP-16 (WAF on Lambda URLs; paid/ops)
- [admin-auth-runbook.md](./admin-auth-runbook.md) — staff JWT API
