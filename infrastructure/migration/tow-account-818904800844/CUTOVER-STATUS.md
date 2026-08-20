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

| Feature                                    | Account                                                         |
| ------------------------------------------ | --------------------------------------------------------------- |
| NWS proxy                                  | `tow`                                                           |
| Community calendar                         | `tow`                                                           |
| Severe weather alerts                      | **personal** (production SES + SMS) until tow SES exits sandbox |
| CMS `/admin` (Cognito + AppSync + docs S3) | **tow** (`TowCms`)                                              |

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

After SES production is **approved**, say so and we will flip severe weather `runtime-config` to the tow Lambda.

### 2. SMS toll-free number

Still in personal End User Messaging. Move only after severe weather is fully on `tow`.

### 3. Bake-in then decommission personal CMS

After clerks confirm `/admin`, decommission personal Amplify stack `amplify-townofwiley-main-d1245` (keep `stephenmckitrick.com` untouched).

## Deploy static updates going forward

```bash
export AWS_PROFILE=tow AWS_REGION=us-east-2
node scripts/deploy-static-site.mjs
```
