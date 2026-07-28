# Community Calendar — Technical Plan

## Stack

- Angular standalone + signals + OnPush; PrimeNG; FullCalendar on `/meetings`.
- Backend: Python Lambda + DynamoDB + SES + public Function URL.
- Runtime: `communityCalendar.apiEndpoint` / `COMMUNITY_CALENDAR_ENDPOINT`.
- Staff admin: Cognito access token (Staff group) verified in Lambda via JWKS (`jwt_utils.py`).

## Why hybrid

Official meetings already use AppSync `Event`. Community needs pending status, submitter PII, categories, and email tokens — keep DynamoDB.

## Data model

Table `TownOfWileyCommunityEvents` (PK `eventId`) — unchanged from Phase 1, plus admin CRUD over the same items. GSI `statusEndIndex` for public queries. Token lookup rows `TOKEN#…` for email approve/reject.

## API (Function URL)

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | ------- |
| POST | /events | public | Submit (pending + clerk email); honeypot |
| GET | /events | public | Approved + future (no submitter PII) |
| GET | /approve?token= | token | Clerk email approve |
| GET | /reject?token= | token | Clerk email reject |
| GET | /health | public | Health |
| GET | /admin/events | Staff JWT | List (optional `?status=`) — includes PII |
| POST | /admin/events | Staff JWT | Create |
| PUT | /admin/events/{id} | Staff JWT | Update |
| DELETE | /admin/events/{id} | Staff JWT | Delete |
| POST | /admin/events/{id}/approve | Staff JWT | Approve + submitter email |
| POST | /admin/events/{id}/reject | Staff JWT | Reject |

## Frontend map

| Path | Role |
| ---- | ---- |
| `src/app/meetings-page/` | Unified calendar, source filters, embeds community panel |
| `src/app/community-calendar/` | Panel (list + form), service, admin service, redirect |
| `src/app/cms-admin/` | Task `manage-community-calendar` + dedicated editor |
| `/community-calendar` | Client redirect → `/meetings#community` |

## Security

- CORS allowlist; Authorization header allowed for admin.
- Honeypot on public POST.
- Public GET omits PII; admin responses include submitter fields.
- JWT: Cognito JWKS, Staff group, client_id match.
