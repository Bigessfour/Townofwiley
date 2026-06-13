# Resident billing / contact intake decommission

The public **billing help** and **contact update** forms on `/pay-bill` and `/services#payment-help`, plus the **`/admin` → Resident messages** table, were removed in June 2026. Residents pay utilities via **Paystar** (`/pay-bill`) or call/email Town Hall.

## AWS resources to tear down (IT)

After the frontend deploy that removes intake endpoints from `runtime-config.js`, delete or disable:

| Resource | Name / ID |
| -------- | --------- |
| Lambda (public POST) | `TownOfWileyContactUpdate` |
| Lambda (admin review) | `TownOfWileyContactUpdatesReview` |
| Lambda (review proxy, if deployed) | `TownOfWileyContactUpdatesReviewProxy` |
| DynamoDB | `TownOfWileyContactUpdates` |
| HTTP API | `lmppzxwh3h` (`/contact-updates` route) |
| Function URLs | Any URLs attached to the Lambdas above |

## Secrets / config to remove

From GitHub Actions secrets and `secrets/local/user-secrets.json`:

- `CONTACT_UPDATE_API_ENDPOINT`
- `CONTACT_UPDATE_REVIEW_API_URL`
- `CONTACT_UPDATE_REVIEW_PROXY_URL`

The `contactUpdate` block is no longer emitted in `public/runtime-config.js`.

## Repo artifacts (historical)

Infrastructure source may remain under `infrastructure/contact-update-lambda/` and `infrastructure/contact-updates-review/` for reference until a follow-up cleanup PR deletes them. Deploy scripts were removed from `scripts/`.

## Clerk workflow after decommission

- **Pay bill:** `/pay-bill` → instruction steps → Paystar portal button; phone `(719) 829-4974`, email `deb.dillon@townofwiley.gov`.
- **CMS content:** unchanged — `/admin` task hub only (no resident message inbox).
