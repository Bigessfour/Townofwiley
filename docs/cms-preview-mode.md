# CMS preview mode

**Decision (2026-06-20):** Option **A** — query flag + staff session, paired with cache bypass and unfiltered AppSync queries.

## How staff use it

1. Sign in at `/admin/login` (Cognito Staff group).
2. Open a public route with `?preview=1`, for example `https://townofwiley.gov/news?preview=1`.
3. Inactive CMS rows (`active: false`) appear alongside live content. Residents without staff sign-in still see only active rows.

## Implementation

| Piece | Location |
| ----- | -------- |
| Query flag + staff gate | `src/app/cms-admin/cms-preview-mode.service.ts` |
| Unfiltered GraphQL when preview | `PUBLIC_CMS_PREVIEW_*_QUERY` in `src/app/site-cms-content.ts` |
| Inactive rows in preview | `recordIsPublic()` in `LocalizedCmsContentStore` |

## Future (Option B)

A `draft` boolean on models would allow true publish workflows. Defer until clerks need to hide in-progress rows without toggling `active`.

## Verification

- Staff + `?preview=1`: inactive notice visible on `/news`.
- Resident (no sign-in): inactive rows hidden.
- E2E: `enableE2eStaffAuth` + `?preview=1` uses preview queries (mock AppSync in CI).
