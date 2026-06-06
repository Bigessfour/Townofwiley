# Admin authentication and contact review API

Staff access to `/admin` and resident contact-update PII uses **Amazon Cognito** (Staff group) and a **JWT-protected API Gateway HTTP API**. The legacy public `TownOfWileyContactUpdatesReviewProxy` Function URL must not be used in production.

## One-time setup

```bash
export AWS_PROFILE=townofwiley
export AWS_REGION=us-east-2

# 1) Cognito Hosted UI (OAuth) + staff email via SES
npm run configure:cognito-hosted-ui
python scripts/configure-cognito-staff-email.py
# Create staff users in Cognito console or with reset-cognito-staff-password.py

# 2) Review Lambda (code) + HTTP API + WAF
python scripts/deploy-contact-updates-review.py
python scripts/deploy-contact-updates-review-api.py
python scripts/deploy-waf-contact-review-api.py

# 3) Amplify env (main branch) — paste URL from deploy script
# CONTACT_UPDATE_REVIEW_API_URL=https://{api-id}.execute-api.us-east-2.amazonaws.com/contact-updates
# Remove CONTACT_UPDATE_REVIEW_PROXY_URL after cutover

npm run amplify:sync-headers   # CSP connect-src includes execute-api
# Redeploy Amplify main

# 4) Retire public proxy (after staff sign-in verified)
python scripts/retire-contact-review-proxy.py
python scripts/purge-contact-update-test-data.py --dry-run
python scripts/purge-contact-update-test-data.py
```

## Completeness checks

| #   | Check                          | Command                                                                                          |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| 1   | Unauthenticated access blocked | `node scripts/verify-contact-review-security.mjs --api-url "$CONTACT_UPDATE_REVIEW_API_URL"`     |
| 1b  | Legacy proxy gone              | Same with `--proxy-url` → expect 404                                                             |
| 2   | Staff browser flow             | Open `/admin` → Cognito Hosted UI → return to `/admin#updates`; Network: `Authorization: Bearer` + 200 |
| 2b  | Forgot password (self-service) | Cognito Hosted UI → **Forgot password?** → email → code → new password → sign in                       |
| 3   | Test PII removed               | `python scripts/purge-contact-update-test-data.py`                                               |
| 4   | No console errors              | Manual pass on `/admin` tabs after sign-in                                                       |

## Staff onboarding

1. IT creates the user in the Cognito console (Gen 2 pool `us-east-2_pkewJMUJF`) and adds them to group **Staff**, or runs `python scripts/reset-cognito-staff-password.py --email <email> --temporary --print-password`.
2. The **Staff** group maps to the Gen 2 Amplify **authenticated IAM role** (see `infrastructure/gen2-production-bindings.json`) for AppSync CMS mutations and S3 document uploads.
3. Staff opens **https://townofwiley.gov/admin** — they are redirected to the **Cognito Hosted UI** sign-in page, then return to `/admin` after successful sign-in.
4. **Forgot password:** Use **Forgot password?** on the Cognito Hosted UI only after the user has completed first-time sign-in (status **CONFIRMED** in Cognito). Cognito sends the code to the verified email via Amazon SES (`noreply@townofwiley.gov`).
5. **Stuck on first sign-in (`FORCE_CHANGE_PASSWORD`):** Forgot password **does not send a code** ([AWS re:Post](https://repost.aws/knowledge-center/cognito-forgot-password)). The user must sign in with the IT temporary password on Hosted UI, then set a new password when prompted. IT reset: `python scripts/reset-cognito-staff-password.py --email <staff@email> --temporary --print-password`
6. MFA: optional (pool default OFF); enable in Cognito if required later.

**Hosted UI domain:** `townofwiley-staff.auth.us-east-2.amazoncognito.com` (see `cognitoGen2.hostedUiDomain` in `infrastructure/gen2-production-bindings.json`). Re-apply OAuth callback URLs with `npm run configure:cognito-hosted-ui` after changing production domains. If the Gen 2 app client was deleted, the setup script creates a new `townofwiley-staff-web` client and updates `userPoolClientId` in bindings — sync `src/app/amplify-config.ts` fallbacks and production runtime secrets if the client ID changes.

**Note:** Staff auth is **Cognito + IAM via identity pool**, not a separate AWS IAM console user. Do not create IAM users for routine `/admin` access. The **Staff** group is a **Cognito user pool group** (JWT claim `cognito:groups`), not an IAM console group.

## Email delivery (Cognito → SES)

Gen 2 staff pool **`us-east-2_pkewJMUJF`** should use **Amazon SES** (not `COGNITO_DEFAULT`) for reliable reset codes:

```bash
export AWS_PROFILE=townofwiley
python scripts/configure-cognito-staff-email.py
```

Requires verified domain **`townofwiley.gov`** in SES (us-east-2) and policy `CognitoIdpSendEmail` on that identity.

## Password reset troubleshooting

| Symptom                                    | Likely cause                                                           | Fix                                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Forgot password shows success but no email | User status **`FORCE_CHANGE_PASSWORD`** (never finished first sign-in) | User signs in with IT temp password, or IT runs `reset-cognito-staff-password.py --temporary` |
| `AdminResetUserPassword` fails             | Same **`FORCE_CHANGE_PASSWORD`** state                                 | Use `--temporary` or `--permanent` on reset script first                                      |
| Code never arrives (CONFIRMED user)        | Pool still on `COGNITO_DEFAULT`, spam, or SES quota                    | Run `configure-cognito-staff-email.py`; check spam for `noreply@townofwiley.gov`              |
| Invalid verification code                  | Expired or wrong code                                                  | Request a new code; codes are single-use                                                      |

```bash
# Inspect user
aws cognito-idp admin-get-user --user-pool-id us-east-2_pkewJMUJF --username staff@example.com --region us-east-2

# New temporary password (first-time flow)
python scripts/reset-cognito-staff-password.py --email staff@example.com --temporary --print-password

# Self-service reset email (CONFIRMED users only)
python scripts/reset-cognito-staff-password.py --email staff@example.com --admin-reset
```

## Rollback

1. Re-enable proxy only in an emergency: redeploy proxy script and set `CONTACT_UPDATE_REVIEW_PROXY_URL` in Amplify (not recommended).
2. Frontend can read `reviewProxyEndpoint` until removed from runtime config.

## Phase 2 (deferred)

- CloudFront signed cookies for `/admin` (requires custom distribution; Amplify Hosting does not expose path-level signed cookies).
- WAF geo/IP allowlist for Town Hall public IP when known.
