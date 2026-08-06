# Town of Wiley — Function Inventory Action Items

**Generated inventory:** [function-inventory.generated.md](./function-inventory.generated.md)
**Visual tree:** [function-tree.md](./function-tree.md)
**Config:** [`.function-inventory.json`](../.function-inventory.json)
**Scan command:** `npm run inventory`

**Update rule:** After adding or changing public services, routes, calendar/CMS helpers, or Lambda handlers:
1. Run `npm run inventory`.
2. Review **Summary** + **Functions without proof**.
3. Add proof (vitest / e2e / ops check) for anything on a key resident or clerk path.
4. Record verification evidence here. Never hand-edit the `.generated` file.

---

## Priorities (this pass — 2026-08-06)

- [x] Fix inventory scanner recognition of `*.vitest.ts` / `*.test.mjs` (global skill script).
- [x] Scope scan roots to product surface (`src`, `infrastructure/community-calendar`, `scripts/lib`).
- [x] Community calendar public + admin services: unit proof + live ops proof.
- [x] Calendar link helpers + runtime-config community endpoint wiring.
- [ ] Wave 2: Karma/component or clerk e2e for remaining CMS admin UI shells (see backlog).

**Inventory snapshot:** 283 tracked | 236 with proof | 47 deferred (mostly clerk UI shells + deploy helpers).

---

## Community calendar — Status & Verification

| Function / surface | Proof | Minimal? | Ops evidence |
| --- | --- | --- | --- |
| `CommunityCalendarService` | `community-calendar.service.vitest.ts` | yes | Live `GET {endpoint}/events` → `{"events":[]}`; form visible on `/meetings#community` |
| `CommunityCalendarAdminService` | `community-calendar-admin.service.vitest.ts` | yes | Backend suite `infrastructure/community-calendar/tests/test_app.py` (python3.11) |
| `readCommunityCalendarRuntimeConfig` | `community-calendar-runtime-config.vitest.ts` | yes | Production `runtime-config.js` has Function URL |
| `mergeCommunityEventsWithBundled` | `community-calendar-seed.vitest.ts` | yes | Bundled yard-sale seed shown on live page |
| `community-calendar-links.*` | `community-calendar-links.vitest.ts` | yes | — |
| `calendar-public-links.*` | `calendar-public-links.vitest.ts` | yes | — |
| `CommunityCalendarRedirect` | `community-calendar-redirect.vitest.ts` + e2e | yes | `/community-calendar` → `/meetings#community` |
| `CommunityCalendarPanel` | `community-calendar.page.vitest.ts` + `e2e/specs/smoke/community-calendar.spec.ts` | yes | Live submit form (“Submit for Clerk review”) present 2026-08-06 |
| `CmsCommunityCalendarAdminComponent` | symbol smoke vitest + admin service + backend tests | yes | Staff path depends on Cognito bearer |
| Lambda `/health`, `/events` | `test_app.py` + live curl | yes | Health returns categories; CORS allows `townofwiley.gov` |

**Operational proof commands (re-run anytime):**

```bash
# Runtime wiring
curl -sS https://townofwiley.gov/runtime-config.js | python3 -c 'import sys,re,json; t=sys.stdin.read(); m=re.search(r"window\.__TOW_RUNTIME_CONFIG__\s*=\s*(\{.*?\});",t,re.S); print(json.loads(m.group(1))["communityCalendar"])'

# Backend health + public list
ENDPOINT=$(node -e "const u=process.env.E||'';")  # or paste Function URL from runtime-config
curl -sS "$ENDPOINT/health"
curl -sS -H 'Origin: https://townofwiley.gov' "$ENDPOINT/events"

# Automated
npx vitest run src/app/community-calendar src/app/calendar-public-links.vitest.ts
/opt/homebrew/bin/python3.11 -m unittest discover -s infrastructure/community-calendar/tests -v
npm run test:e2e:smoke -- e2e/specs/smoke/community-calendar.spec.ts
```

**Root cause fixed 2026-08-06:** empty `communityCalendar.apiEndpoint` in live `runtime-config.js` despite deployed Lambda. Wired Function URL + refreshed `COMMUNITY_CALENDAR_ENDPOINT` GitHub secret; mirrored in `public/runtime-config.js`.

---

## GA4 SPA page views

| Function | Proof | Ops note |
| --- | --- | --- |
| `GoogleAnalyticsService` | `google-analytics.service.vitest.ts` | Deploy with site release; verify GA4 DebugView on SPA navigations |

---

## Runtime config builders

| Function | Proof |
| --- | --- |
| `buildRuntimeConfigValues`, `buildPublicRuntimeConfigObject`, `collectRequiredEnvErrors`, strict helpers | `scripts/generate-runtime-config.strict.test.mjs` (`npm run test:runtime-config-strict`) |

---

## Pages & components — backlog (no co-located proof yet)

These are mostly clerk shells or thin presentational components. Prefer Karma (`*.spec.ts`) or clerk e2e over Vitest `createComponent` (templateUrl resolution).

- [ ] `AdminLoginComponent`, `CmsAdmin`, clerk task hub/editor/upload panels
- [ ] `MeetingDocumentsArchiveComponent`, `ThisWeekInWileyComponent`, `WeatherAlertBannerComponent`
- [ ] Legacy create-only CMS admin services (`CmsAnnouncementAdminService`, etc.) — superseded by generic admin; prove or retire
- [ ] `OfflineConnectivityNotifier` — needs browser event harness
- [ ] Deploy helpers under `scripts/lib/gen1-cms-ssot.mjs`, `runtime-secret-mappings.mjs`, `ollama-api.mjs`

---

## Key workflows

- [x] Resident submits community event → clerk email / pending store (unit + backend + live form configured)
- [x] Resident lists community events (API merge + bundled seed)
- [x] Legacy `/community-calendar` redirect
- [ ] Clerk approves event in `/admin` (backend proven; UI e2e still open)
- [x] Public calendar Google/ICS links

---

## Meta

- Re-run `npm run inventory` after structural changes.
- Inventory count alone is not a ship gate — use smoke/acceptance checklists.
- Suggest `/code-review` after the next PR that packages these tests + inventory docs.

---

*Keep this overlay honest. The generated file is the raw detector.*
