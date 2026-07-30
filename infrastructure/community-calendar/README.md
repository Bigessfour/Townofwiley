# Community Calendar backend

Python Lambda Function URL for resident community-event submissions, Clerk email approve/reject, and Cognito Staff JWT admin CRUD.

## Local tests

```bash
python3 -m unittest infrastructure.community-calendar.tests.test_app -v
```

## Deploy (Town AWS account only)

```bash
source scripts/agent-aws-env.sh
aws sts get-caller-identity   # must be 570912405222 / copilot
python3 scripts/deploy-community-calendar-backend.py
```

Then set GitHub Actions secret `COMMUNITY_CALENDAR_ENDPOINT` to the Function URL (wired into Site CI / production deploys) and redeploy the site so `runtime-config.js` includes `communityCalendar.apiEndpoint`.

## Routes

Public:

- `POST /events` — submit pending event + email clerk (honeypot; per-IP rate limit)
- `GET /events` — approved future events (no submitter PII)
- `GET /approve?token=` / `GET /reject?token=` — confirm page only (no side effects; safe for email prefetch)
- `POST /approve` / `POST /reject` — apply decision (form body or `?token=`)
- `GET /health`

Staff (Bearer Cognito access **or** ID token with Staff group):

- `GET /admin/events` — list (optional `?status=`)
- `POST /admin/events` — create
- `PUT /admin/events/{eventId}` — update (transition to approved emails submitter)
- `DELETE /admin/events/{eventId}` — delete
- `POST /admin/events/{eventId}/approve` — approve + submitter email
- `POST /admin/events/{eventId}/reject` — reject
