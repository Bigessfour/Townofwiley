# Migration status — CMS cutover 2026-08-20

## Done (townofwiley.gov → Town account `818…` / `tow`)

| Item                                        | Status                                 |
| ------------------------------------------- | -------------------------------------- |
| Static site S3 + CloudFront                 | Live on `E19PUUL2H76CZA`               |
| get.gov nameservers                         | Point at tow Route 53 zone             |
| Inbound mail                                | Synology (unchanged)                   |
| NWS weather proxy                           | On `tow`                               |
| Community calendar                          | On `tow` (75 events copied)            |
| Severe weather Lambda (copy)                | Deployed on `tow` (standby)            |
| CMS Cognito + AppSync + docs S3             | **On `tow`** (`TowCms` CDK stack)      |
| Legacy personal CloudFront `E1NZ3XCY5CYR1J` | **Disabled** (aliases already cleared) |
| `stephenmckitrick.com`                      | **Unchanged** on personal              |

## Live `runtime-config` wiring

| Feature                                    | Account                                                    |
| ------------------------------------------ | ---------------------------------------------------------- |
| NWS proxy                                  | `tow`                                                      |
| Community calendar                         | `tow`                                                      |
| Severe weather alerts                      | **tow** Lambda + SES; SMS via RAM-shared TFN from personal |
| CMS `/admin` (Cognito + AppSync + docs S3) | **tow** (`TowCms`)                                         |

## CMS cutover details (`TowCms`)

| Resource            | Value                                                                            |
| ------------------- | -------------------------------------------------------------------------------- |
| User pool           | `us-east-2_bHk9UcenK`                                                            |
| App client          | `258binbcvsms0rfqj5g20qakki`                                                     |
| Identity pool       | `us-east-2:86cc6af6-6075-4dd4-a689-1f8b6e760156`                                 |
| Hosted UI           | `tow-gov-staff.auth.us-east-2.amazoncognito.com`                                 |
| AppSync API         | `okoh3v23ord33kuggsg3p5n4sm`                                                     |
| GraphQL             | `https://g6p4g3eyqjhmpctbbvtduj3h7m.appsync-api.us-east-2.amazonaws.com/graphql` |
| Documents bucket    | `townofwiley-documents-storage-818904800844`                                     |
| Media upload Lambda | `https://r6ev4nn2vy3zl4w4bc6sm27s3u0baaud.lambda-url.us-east-2.on.aws`           |

Staff users recreated (`clerk@`, `bigessfour@`, `wileytown@`) in **FORCE_CHANGE_PASSWORD** — use Forgot password on `/admin/login` (or console set-password) before first clerk login. Approach: Amplify GraphQL CDK construct (not Amplify Hosting / Gen 1 CLI).

## Blocked / needs your click

### 1. SES production access on `tow` (case `178724574800797`)

**Granted.** Domain `townofwiley.gov` verified; severe weather signup points at tow Lambda.

### 2. SMS toll-free number (`+18666509844`)

**Do not release** the number (AWS: release is permanent; same TFN cannot be reclaimed).

Shared into Town via AWS RAM (self-service ownership transfer is not available):

| Piece                                 | Value                                                                                          |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Owner account                         | `570912405222` (personal)                                                                      |
| Consumer account                      | `818904800844` (`tow`)                                                                         |
| RAM share                             | `TownOfWiley-SMS-TollFree`                                                                     |
| Phone ARN (use in tow sends)          | `arn:aws:sms-voice:us-east-2:570912405222:phone-number/phone-3f96352013184d59946f771dd31fd7d0` |
| TFN registration                      | `COMPLETE` on personal                                                                         |
| tow Lambda `SMS_ORIGINATION_IDENTITY` | full shared ARN above                                                                          |
| Two-way STOP/HELP                     | personal SNS → `TownOfWileySmsInboundForwarder` → tow Lambda                                   |
| tow SMS tier                          | still **SANDBOX** (`$1` limit; verified destinations only)                                     |

**Still needed (console click in `tow`):** Service Quotas → AWS End User Messaging SMS → **SMS Production Access** for `us-east-2` ([sandbox exit guide](https://docs.aws.amazon.com/sms-voice/latest/userguide/sandbox.html)).

### 3. Bake-in then decommission personal CMS

After clerks confirm `/admin`, decommission personal Amplify stack `amplify-townofwiley-main-d1245` (keep `stephenmckitrick.com` untouched).

## Deploy static updates going forward

```bash
export AWS_PROFILE=tow AWS_REGION=us-east-2
node scripts/deploy-static-site.mjs
```
