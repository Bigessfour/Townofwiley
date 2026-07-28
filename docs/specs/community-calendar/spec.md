# Community Calendar — Specification

## Feature goal

Give residents one place on **`/meetings`** to discover **official Town meetings** and **community events** (yard sales, bake sales, school events, fundraisers, etc.), with Clerk control over what community listings appear. Community data stays in DynamoDB (not AppSync `Event`).

## Primary user stories

1. As a resident, I open Meetings / Community Calendar from nav or Quick Tasks, filter **All / Official / Community**, see a shared month calendar (distinct styling for community vs official), separate list sections, and can add events to Google / ICS.
2. As a resident, I submit a community event from `/meetings#community`; the Clerk reviews it.
3. As the Town Clerk, I receive email Approve / Reject links **and** can manage events in `/admin` → **Manage community calendar** (list/create/update/delete/approve/reject via Cognito JWT).
4. Past community events disappear from the public list after end date/time.
5. Spanish UI works for the public community section and form.

## Hybrid data

| Source | Storage | Public surface |
| ------ | ------- | -------------- |
| Official meetings | AppSync `Event` | `/meetings` table + calendar (official) |
| Community events | DynamoDB + Lambda Function URL | `/meetings` calendar (community) + `#community` list/form |

Do **not** migrate community submissions into AppSync `Event`.

## Form fields (public submit)

**Required:** submitter name, phone, email, location, title, start (optional end), description, category.  
**Optional:** social link, organizer, audience, cost, accessibility notes.  
**Out of scope:** photo upload, recurring events.

## Categories

yard_sale, bake_sale, car_wash, school, fundraiser, gathering, festival, sports, other.

## Acceptance criteria

- Single public UI on `/meetings` with source filters and community submit form.
- `/community-calendar` redirects to `/meetings#community`; nav points at unified calendar.
- Public GET omits submitter PII; admin responses may include PII.
- Email approve/reject and staff admin routes both publish/reject correctly.
- Playwright: redirect + meetings community section; Python unit tests cover public + admin paths.
- WCAG AA; bilingual EN/ES on public UI.

## Explicit non-goals

Image uploads, recurring events, AppSync schema change for community.

## Related product surfaces

Homepage **This week in Wiley** / **Coming up in Wiley** (`src/app/this-week-in-wiley/`) lists official + community events under the hero; it is not a second calendar system.
