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

## Before you deploy

1. Deploy the Amplify schema change so the `EmailAlias` model exists in the backend.
2. Find the DynamoDB table name created for `EmailAlias`.
3. Choose the sender address the forwarder will use, such as `mailer@townofwiley.gov`.
4. Decide which SES region will handle inbound mail. Use a region that supports SES receiving.

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

- `EmailAlias-j7b2x3sh7rcezekekkxxiak7hi-main`

Current deployed router infrastructure:

- Lambda: `TownOfWileyEmailAliasRouter` in `us-east-1`
- IAM role: `TownOfWileyEmailAliasRouterRole`
- Ingress bucket: `townofwiley-email-alias-570912405222-us-east-1`
- Receipt rule set: `TownOfWileyAliasForwarding`
- Receipt rule: `StoreTownMailInS3`
- Outbound SES send region from the Lambda: `us-east-2`
- Current `FORWARDER_FROM`: `steve.mckitrick@townofwiley.gov`

Current live routing state:

- Route 53 now publishes `townofwiley.gov MX 10 inbound-smtp.us-east-1.amazonaws.com`.
- The SES receipt rule path is active in `us-east-1`.
- The first live `EmailAlias` record is active for `steve.mckitrick@townofwiley.gov -> bigessfour@gmail.com`.

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

## Studio workflow after deployment

For each mailbox alias:

1. Open Amplify Studio Data Manager.
2. Open the `EmailAlias` model.
3. Create or update the record.
4. Set `aliasAddress` to the public Town address.
5. Set `destinationAddress` to the staff member's current inbox.
6. Set `active` to `true`.
7. Optionally fill in `displayName`, `roleLabel`, and `notes`.
8. Save the record.

## Live test routine

1. Send a test message to the public Town alias.
2. Confirm the destination inbox receives the forwarded message.
3. Confirm the forwarded message includes the `X-Town-Alias` header.
4. Confirm replies go back to the resident sender through the message `Reply-To`.
5. Disable or correct the `EmailAlias` record immediately if the test routes to the wrong person.

## Rollback options

- Set `active` to `false` on the `EmailAlias` record to stop forwarding for one alias.
- Remove or deactivate the SES receipt rule set if the entire ingress path must be paused.
- Remove the S3 notification if you need SES to keep storing inbound mail without forwarding it.
