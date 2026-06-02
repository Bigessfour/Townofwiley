# Admin authentication and contact review API

Staff access to `/admin` and resident contact-update PII uses **Amazon Cognito** (Staff group) and a **JWT-protected API Gateway HTTP API**. The legacy public `TownOfWileyContactUpdatesReviewProxy` Function URL must not be used in production.

## One-time setup

```bash
export AWS_PROFILE=townofwiley
export AWS_REGION=us-east-2

# 1) Cognito Staff group + app client callback URLs
python scripts/setup-cognito-staff-group.py
python scripts/setup-cognito-staff-group.py --create-user clerk@townofwiley.gov --set-temp-password
python scripts/configure-cognito-staff-email.py

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
| 2   | Staff browser flow             | Sign in at `/admin/login` → `/admin#updates` shows table; Network: `Authorization: Bearer` + 200 |
| 2b  | Forgot password (self-service) | `/admin/login` → **Forgot password?** → email → code → new password → sign in                    |
| 3   | Test PII removed               | `python scripts/purge-contact-update-test-data.py`                                               |
| 4   | No console errors              | Manual pass on `/admin` tabs after sign-in                                                       |

## Staff onboarding

1. IT runs `setup-cognito-staff-group.py --create-user <email> --set-temp-password` (or creates the user in the Cognito console).
2. The script attaches group **Staff** to the Gen 2 Amplify **authenticated IAM role** (see `infrastructure/gen2-production-bindings.json`) for AppSync CMS mutations and S3 document uploads, and maps the group in the identity pool.
3. Staff opens https://www.townofwiley.gov/admin/login, signs in with email + password, and changes the temporary password when prompted.
4. **Forgot password:** On `/admin/login`, use **Forgot password?** only after the user has completed first-time sign-in (status **CONFIRMED** in Cognito). Cognito sends the code to the verified email via Amazon SES (`noreply@townofwiley.gov`). If email does not arrive, check spam or run the ops checks below.
5. **Stuck on first sign-in (`FORCE_CHANGE_PASSWORD`):** Forgot password **does not send a code** ([AWS re:Post](https://repost.aws/knowledge-center/cognito-forgot-password)). The user must **Sign in** with the IT temporary password, then set a new password. IT reset: `python scripts/reset-cognito-staff-password.py --email <staff@email> --temporary --print-password`
6. MFA: optional (pool default OFF); enable in Cognito if required later.

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
