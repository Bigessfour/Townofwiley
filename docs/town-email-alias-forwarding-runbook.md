# Town Email Alias Forwarding Runbook

This runbook is for maintainers who need to deploy or update Town email forwarding in AWS.

## Purpose

Use this system when the Town wants a public `townofwiley.gov` address to stay stable while mail forwards to a staff member's current inbox.

Example:

- `steve.mckitrick@townofwiley.gov -> bigessfour@gmail.com`

The public address stays the same for residents. The private destination inbox can change later by editing one CMS record.

## Model split

- `OfficialContact`: public-facing card on the website
- `EmailAlias`: private forwarding rule used only by the backend forwarder

Do not put private destination inboxes in `OfficialContact`.

## AWS-documented architecture (aligned)

This matches [Amazon SES email receiving](https://docs.aws.amazon.com/ses/latest/dg/receiving-email.html):

1. **MX** for `townofwiley.gov` → `inbound-smtp.us-east-1.amazonaws.com` (receiving region must support SES inbound; we use `us-east-1`).
2. **Active receipt rule set** with a rule whose recipients include the domain `townofwiley.gov` (domain-wide match for all `@townofwiley.gov` addresses).
3. **Deliver to S3 bucket** action ([S3 action docs](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-action-s3.html)) — raw MIME objects under `incoming/`.
4. **S3 `ObjectCreated` event** invokes `TownOfWileyEmailAliasRouter` (standard async worker pattern).
5. Lambda loads **`EmailAlias`** from DynamoDB (Gen 1 prod table), then **sends** the wrapped message with SES in `us-east-2` ([sending region](https://docs.aws.amazon.com/ses/latest/dg/regions.html) where the domain identity is verified).

**`FORWARDER_FROM`** must be an address on verified domain `townofwiley.gov` (domain verification covers all local-parts). Use `clerk@townofwiley.gov`.

**`FALLBACK_ALIAS_ADDRESS`** (Lambda env) should be `clerk@townofwiley.gov` so any `@townofwiley.gov` address without its own active row still forwards to the clerk rule’s `destinationAddress`.

Do **not** set `destinationAddress` to `clerk@townofwiley.gov` — that is the public SES alias and would loop. Set it to the clerk’s **real inbox** at SECOM (or another provider).

## Before you deploy

1. Deploy the Amplify schema change so the `EmailAlias` model exists in the backend.
2. Find the DynamoDB table name created for `EmailAlias`.
3. Choose the sender address the forwarder will use (`clerk@townofwiley.gov` on verified domain).
4. Decide which SES region will handle inbound mail. Use a region that supports SES receiving (`us-east-1` for this account).

## CenturyTel → SECOM clerk cutover

Residents and vendors should use **`clerk@townofwiley.gov`** (and other Town aliases on the website). AWS intercepts those at MX → SES.

1. **Before CenturyTel/`wileytown@centurytel.net` is removed:** at the old ISP, set **auto-forward** `wileytown@centurytel.net` → `clerk@townofwiley.gov` so stragglers still reach Town mail during the transition.
2. **SECOM inbox:** obtain the clerk’s new mailbox address (e.g. `…@secom…`).
3. **Update CMS routing** (private destinations only):

   ```bash
   TOWN_MAIL_DESTINATION='clerk-inbox@your-secom-domain' npm run mail:forwarding:configure
   ```

   This sets `clerk@townofwiley.gov` and `deb.dillon@townofwiley.gov` to that destination, deactivates the typo `steve.mckirick@` row, and retires `centurytel.net` / `centurylink.net` destinations.

4. **Redeploy router** (fixes Lambda table + fallback + receipt rule):

   ```bash
   npm run mail:forwarding:deploy
   ```

5. **Live test:** send to `clerk@townofwiley.gov` and an uncommon alias like `utilities@townofwiley.gov`; both should land in the SECOM inbox with `X-Town-Alias` showing the original To.

Forwarding was **paused** operationally in July 2026 (SES rule disabled, S3 trigger removed, aliases inactive). Repeat steps 3–5 to go live on SECOM.

## Current verified sending status

As of March 23, 2026:

- `townofwiley.gov` is verified in Amazon SES `us-east-2`.
- Easy DKIM is successful for the domain.
- The SES account has production access in `us-east-2`.
- Current sending quotas in `us-east-2` are `50,000` messages per 24 hours and `14` messages per second.

What is still not live:

- A live end-to-end forwarding test message has not been run yet.
- The remaining Town aliases beyond the first Steve record still need to be added.

Current backend table for the live `main` environment:

- Production Gen 1: `EmailAlias-j7b2x3sh7rcezekekkxxiak7hi-main` — see [gen1-production-bindings.json](../infrastructure/gen1-production-bindings.json)

Current deployed router infrastructure:

- Lambda: `TownOfWileyEmailAliasRouter` in `us-east-1`
- IAM role: `TownOfWileyEmailAliasRouterRole`
- Ingress bucket: `townofwiley-email-alias-570912405222-us-east-1`
- Receipt rule set: `TownOfWileyAliasForwarding`
- Receipt rule: `StoreTownMailInS3`
- Outbound SES send region from the Lambda: `us-east-2`
- Target `FORWARDER_FROM`: `clerk@townofwiley.gov` (domain `townofwiley.gov` verified in SES `us-east-2`)
- Target `FALLBACK_ALIAS_ADDRESS`: `clerk@townofwiley.gov`
- Prod `EmailAlias` table: `EmailAlias-j7b2x3sh7rcezekekkxxiak7hi-main` (Lambda must use this table, not a stale Amplify `NONE` suffix)

Current live routing state:

- Route 53 publishes `townofwiley.gov MX 10 inbound-smtp.us-east-1.amazonaws.com`.
- Receipt rule recipients should include **`townofwiley.gov`** (domain-wide) per SES receiving guidance.
- Clerk-centric aliases in CMS: `clerk@townofwiley.gov`, `deb.dillon@townofwiley.gov` (destinations updated via `mail:forwarding:configure`).

Current remaining AWS blockers:

- The ingress bucket still needs `PutBucketPublicAccessBlock` applied by a principal that has that permission.
- A live mailbox-to-mailbox forwarding test still needs to be sent and verified.

## Local secrets template

The repo secrets template now supports a `mail.aliasForwarding` section.

Current deployed values:

```json
{
  "mail": {
    "aliasForwarding": {
      "ingressRegion": "us-east-1",
      "aliasTableName": "EmailAlias-j7b2x3sh7rcezekekkxxiak7hi-main",
      "aliasTableRegion": "us-east-2",
      "forwarderFrom": "steve.mckitrick@townofwiley.gov",
      "sendRegion": "us-east-2",
      "aliasDomain": "townofwiley.gov",
      "ingressBucketName": "townofwiley-email-alias-<account>-us-east-1",
      "functionName": "TownOfWileyEmailAliasRouter",
      "roleName": "TownOfWileyEmailAliasRouterRole",
      "receiptRuleSetName": "TownOfWileyAliasForwarding",
      "receiptRuleName": "StoreTownMailInS3",
      "receiptRecipients": "townofwiley.gov",
      "receiptPrefix": "incoming/"
    }
  }
}
```

## Deployment command

If the secrets file is populated, run:

```bash
npm run deploy:email-alias-router
```

If you want to override values from the command line, run:

```bash
npm run deploy:email-alias-router -- --alias-table EmailAlias-j7b2x3sh7rcezekekkxxiak7hi-main --forwarder-from steve.mckitrick@townofwiley.gov --ingress-region us-east-1 --send-region us-east-2
```

What the script does:

1. Packages the Lambda from `infrastructure/email-alias-router`.
2. Creates or updates the S3 ingress bucket.
3. Applies bucket encryption, public-access block, and the SES write policy.
4. Creates or updates the Lambda execution role.
5. Creates or updates the Lambda function.
6. Grants S3 permission to invoke the Lambda.
7. Connects the S3 object-created event to the Lambda.
8. Creates or updates the SES receipt rule set and receipt rule unless `--skip-receipt-rule-setup` is used.

Current known behavior under the existing `copilot` AWS principal:

- The script can create the bucket, bucket policy, Lambda, IAM role, and SES receipt rules.
- The script cannot currently apply `s3:PutBucketPublicAccessBlock` because that IAM permission is missing for the caller.

## Route 53 and SES checks

After deployment, confirm:

1. The domain MX record points to `inbound-smtp.us-east-1.amazonaws.com` with preference `10`.
2. The SES receipt rule set is active.
3. The verified sender identity used in `forwarderFrom` is still healthy.

## CMS workflow after deployment

For each mailbox alias:

1. Open **`/admin`** → **Manage email forwarding** → **Edit content** (or **EmailAlias** in AppSync Queries if IT directs you there).
2. Open or create the `EmailAlias` row.
3. Create or update the record.
4. Set `aliasAddress` to the public Town address.
5. Set `destinationAddress` to the staff member's current inbox.
6. Set `active` to `true`.
7. Optionally fill in `displayName`, `roleLabel`, and `notes`.
8. Save the record.

## MIME passthrough (do not reintroduce the wrap bug)

The router must **preserve the original MIME body** (text, HTML, and file/inline attachments) and only rewrite delivery headers (`From`, `To`, `Subject`, `Reply-To`, `X-Town-*`).

**Do not** reintroduce the older “shell + `original-message.eml` (`message/rfc822`) attachment” design. That pattern delivers a short wrap notice only; many clients (especially Outlook / new Outlook) show an empty body and hide or fail to open the nested `.eml`, so staff see the mail arrive with no text and no attachments.

### Regression hardening (required)

| Guard | Command / resource |
| --- | --- |
| Static source guard | `npm run verify:email-alias-mime` |
| Unit tests (passthrough + wrap rejection) | `npm run test:infra:mail` |
| Deploy gate (runs both above) | `npm run mail:forwarding:deploy` |
| Runtime integrity | `assert_mime_passthrough_integrity` inside Lambda before `SendRawEmail` |
| Structured logs | CloudWatch `/aws/lambda/TownOfWileyEmailAliasRouter` (`email_alias_router.forward`) |
| Errors alarm | `TownOfWiley-TownOfWileyEmailAliasRouter-Errors` → `TownOfWileyOpsAlerts` |
| Throttles alarm | `TownOfWiley-TownOfWileyEmailAliasRouter-Throttles` |
| DLQ | SQS `TownOfWileyEmailAliasDLQ` + depth alarm |
| Published versions | each deploy publishes a Lambda version for rollback |
| CI | when `email_alias_changed`, git-workflow runs verify + unit tests |

### Reforward historical mail (lost body/attachments)

SES stores the **original raw MIME** under `s3://townofwiley-email-alias-570912405222-us-east-1/incoming/`. After deploying a passthrough fix, re-send:

```bash
# Preview
npm run mail:forwarding:reforward

# Re-send everything (adds subject prefix [Town reforward] and X-Town-Reforward)
npm run mail:forwarding:reforward -- --execute

# Only since a date
npm run mail:forwarding:reforward -- --execute --since 2026-07-01
```

Staff will receive **additional** copies (duplicates of earlier incomplete shells). Filter on subject `[Town reforward]` or header `X-Town-Reforward: true`.

Live test must confirm the **body text and any attachments are visible inline** in the destination client, not only that a message envelope arrived.

## Live test routine

1. Send a test message to the public Town alias (include a short body **and** a small PDF attachment).
2. Confirm the destination inbox receives the forwarded message.
3. Confirm the body text and attachment open normally in Outlook/Gmail (not only a nested `.eml`).
4. Confirm the forwarded message includes the `X-Town-Alias` header.
5. Confirm replies go back to the resident sender through the message `Reply-To`.
6. Disable or correct the `EmailAlias` record immediately if the test routes to the wrong person.

## Rollback options

- Set `active` to `false` on the `EmailAlias` record to stop forwarding for one alias.
- Remove or deactivate the SES receipt rule set if the entire ingress path must be paused.
- Remove the S3 notification if you need SES to keep storing inbound mail without forwarding it.
