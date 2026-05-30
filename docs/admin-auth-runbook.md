# Admin authentication and contact review API

Staff access to `/admin` and resident contact-update PII uses **Amazon Cognito** (Staff group) and a **JWT-protected API Gateway HTTP API**. The legacy public `TownOfWileyContactUpdatesReviewProxy` Function URL must not be used in production.

## One-time setup

```bash
export AWS_PROFILE=townofwiley
export AWS_REGION=us-east-2

# 1) Cognito Staff group + app client callback URLs
python scripts/setup-cognito-staff-group.py
python scripts/setup-cognito-staff-group.py --create-user clerk@townofwiley.gov --set-temp-password

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
| 2b  | Forgot password (self-service) | `/admin/login` → **Forgot password?** → email → code → new password → sign in |
| 3   | Test PII removed               | `python scripts/purge-contact-update-test-data.py`                                               |
| 4   | No console errors              | Manual pass on `/admin` tabs after sign-in                                                       |

## Staff onboarding

1. IT runs `setup-cognito-staff-group.py --create-user <email> --set-temp-password` (or creates the user in the Cognito console).
2. The script attaches group **Staff** to the Gen 2 Amplify **authenticated IAM role** (see `infrastructure/gen2-production-bindings.json`) for AppSync CMS mutations and S3 document uploads, and maps the group in the identity pool.
3. Staff opens https://www.townofwiley.gov/admin/login, signs in with email + password, and changes the temporary password when prompted.
4. **Forgot password:** On `/admin/login`, use **Forgot password?** → enter staff email → enter the verification code from email → set a new password (min. 8 characters) → sign in. Cognito sends the code to the verified email on the account. If email does not arrive, check spam or call Town Hall so IT can verify the user pool (`us-east-2_pkewJMUJF` on Gen 2) and **Account recovery** settings.
5. MFA: optional (pool default OFF); enable in Cognito if required later.

**Note:** Staff auth is **Cognito + IAM via identity pool**, not a separate AWS IAM console user. Do not create IAM users for routine `/admin` access. The **Staff** group is a **Cognito user pool group** (JWT claim `cognito:groups`), not an IAM console group.

## Rollback

1. Re-enable proxy only in an emergency: redeploy proxy script and set `CONTACT_UPDATE_REVIEW_PROXY_URL` in Amplify (not recommended).
2. Frontend can read `reviewProxyEndpoint` until removed from runtime config.

## Phase 2 (deferred)

- CloudFront signed cookies for `/admin` (requires custom distribution; Amplify Hosting does not expose path-level signed cookies).
- WAF geo/IP allowlist for Town Hall public IP when known.
