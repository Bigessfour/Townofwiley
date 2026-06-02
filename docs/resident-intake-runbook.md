# Resident intake (billing assistance + contact updates)

Single pipeline: public forms POST to **TownOfWileyContactUpdate** Lambda → DynamoDB **`TownOfWileyContactUpdates`** → clerk review on **`/admin#updates`**.

## Forms that write here

| Source                                           | Angular                | `source` value      |
| ------------------------------------------------ | ---------------------- | ------------------- |
| Billing assistance (`/pay-bill`)                 | `BillPayService`       | `pay-bill-page`     |
| Portal access on Services                        | `BillPayService`       | `resident-services` |
| Optional contact update (Services payment panel) | `ContactUpdateService` | `payment-panel`     |

Billing submissions include: account number (optional), preferred contact method, consent to contact, and required contact fields.

## Deploy (operators)

1. Redeploy intake Lambda (schema/sanitize changes):
   ```bash
   source scripts/agent-aws-env.sh
   python scripts/deploy-contact-update-backend.py
   ```
2. Set Amplify branch env **`CONTACT_UPDATE_API_ENDPOINT`** to the printed Function URL (see [`amplify-deployment-runbook.md`](./amplify-deployment-runbook.md)).
3. Staff review: **`CONTACT_UPDATE_REVIEW_API_URL`** (JWT API) or legacy review proxy URL.
4. Redeploy `main` or run `npm run amplify:sync-hosting` so `runtime-config.js` includes `contactUpdate.apiEndpoint`.

Without `CONTACT_UPDATE_API_ENDPOINT`, billing assistance falls back to **mailto** (`deb.dillon@townofwiley.gov`).

## Clerk CMS

1. Sign in at `/admin`.
2. Open **Contact updates** tab (`/admin#updates`).
3. Sortable table, **Download CSV**, **Print customer report** (opens printable HTML).

## Verify after deploy

```bash
npm run test:infra:contact
npm run verify:custom-http-yaml
```

Manual: submit `/pay-bill` → confirm row in CMS → print preview.
