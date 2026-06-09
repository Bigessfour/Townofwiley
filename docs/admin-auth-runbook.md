# Admin authentication and contact review API

Staff access to `/admin` and resident contact-update PII uses **Amazon Cognito** (Gen 1 pool, Staff group) and a **JWT-protected API Gateway HTTP API**. The legacy public `TownOfWileyContactUpdatesReviewProxy` Function URL must not be used in production.

Bindings SSOT: [`infrastructure/gen1-production-bindings.json`](../infrastructure/gen1-production-bindings.json).

## One-time setup

```bash
export AWS_PROFILE=townofwiley
export AWS_REGION=us-east-2

# 1) Cognito Staff group + Hosted UI (OAuth) + staff email via SES
python scripts/setup-cognito-staff-group.py
npm run configure:cognito-hosted-ui
python scripts/configure-cognito-staff-email.py
# Create staff users: setup-cognito-staff-group.py --create-user <email> --set-temp-password --print-password

# 2) Review Lambda (code) + HTTP API + WAF
python scripts/deploy-contact-updates-review.py
# JWT HTTP API: TownOfWileyContactUpdatesReviewApi (lmppzxwh3h) — already deployed; set CONTACT_UPDATE_REVIEW_API_URL in secrets.
python scripts/deploy-waf-contact-review-api.py

# 3) GitHub secrets / user-secrets — paste URL from deploy script
# CONTACT_UPDATE_REVIEW_API_URL=https://{api-id}.execute-api.us-east-2.amazonaws.com/contact-updates
# COGNITO_* and STORAGE_S3_* per gen1-production-bindings.json
# npm run pipeline:secrets && npm run deploy:static-site

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
| 5   | Runtime config                 | `curl -s https://townofwiley.gov/runtime-config.js` shows Gen 1 AppSync + Cognito IDs            |

## OAuth sign-in flow (`/admin/login`)

- `src/main.ts` imports `aws-amplify/auth/enable-oauth-listener` (global listener).
- `/admin/login` subscribes to `Hub.listen('auth')` for `signInWithRedirect` and `signInWithRedirect_failure`.
- Unauthenticated clerks are auto-redirected to Hosted UI after a short delay; **Sign in again** appears on errors.

If staff see **UserAlreadyAuthenticatedException**, hard-refresh once or click **Sign in again** (stale browser session).

## Staff onboarding

1. IT creates the user in the Cognito console (Gen 1 pool `us-east-2_DmY7BCBIp`) and adds them to group **Staff**, or runs:
   `python scripts/setup-cognito-staff-group.py --create-user <email> --set-temp-password --print-password`
2. The **Staff** group maps to `amplify-townofwiley-main-d1245-authRole` for AppSync CMS mutations and S3 document uploads via the identity pool.
3. Staff opens **https://townofwiley.gov/admin** — Cognito Hosted UI sign-in, then return to `/admin`.
4. **Forgot password:** Only after first sign-in (**CONFIRMED**). SES sends from `noreply@townofwiley.gov`.
5. **`FORCE_CHANGE_PASSWORD`:** User signs in with IT temp password on Hosted UI; IT reset: `python scripts/reset-cognito-staff-password.py --email <staff@email> --temporary --print-password`

**Hosted UI domain:** `townofwiley-staff.auth.us-east-2.amazoncognito.com` on Gen 1 pool. Re-apply with `npm run configure:cognito-hosted-ui` after domain changes.

## Email delivery (Cognito → SES)

Gen 1 staff pool **`us-east-2_DmY7BCBIp`** should use **Amazon SES**:

```bash
export AWS_PROFILE=townofwiley
python scripts/configure-cognito-staff-email.py
```

## Password reset troubleshooting

| Symptom                                    | Likely cause                                                           | Fix                                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Forgot password shows success but no email | User status **`FORCE_CHANGE_PASSWORD`**                                | User signs in with IT temp password, or IT runs `reset-cognito-staff-password.py --temporary` |
| **Not authorized for staff admin access** after successful Hosted UI login | OAuth tokens returned before `cognito:groups` claim populated, or access token missing admin scope | Re-run `npm run configure:cognito-hosted-ui` (adds `aws.cognito.signin.user.admin` scope); deploy latest frontend; verify user in **Staff** group: `aws cognito-idp admin-list-groups-for-user --user-pool-id us-east-2_DmY7BCBIp --username <sub>` |
| CMS mutation fails after sign-in           | User not in **Staff** group or AppSync user-pool auth misaligned       | Run `setup-cognito-staff-group.py`; verify AppSync additional auth uses Gen 1 pool            |

```bash
aws cognito-idp admin-get-user --user-pool-id us-east-2_DmY7BCBIp --username staff@example.com --region us-east-2
python scripts/reset-cognito-staff-password.py --email staff@example.com --temporary --print-password
```