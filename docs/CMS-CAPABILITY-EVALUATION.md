# CMS Capability Evaluation — Non-Technical Clerk Audience

> Evaluated: June 9, 2026 · Branch `feat/cms-sitecopy-ordered-editor` · Method: static code/doc review, read-only AWS checks (account 570912405222, profile `townofwiley`), and a hands-on dev-server walkthrough of `/admin` (staff auth wall noted below).

## Executive summary

**Can a non-technical clerk run the site today? Mostly yes — 10 of 11 clerk tasks are fully workable in-app at `/admin` with clear forms, save toasts, and friendly errors. One task is broken end-to-end (`Edit navigation labels…` / SiteCopy) because the SiteCopy model has never been pushed to the live Gen 1 AppSync schema, and one production data issue (`OfficialContact` stable IDs missing) silently degrades the contacts task.**

What blocks the clerk right now:

1. **P0 — SiteCopy is not deployed on the production API.** Verified read-only on `j7b2x3sh7rcezekekkxxiak7hi` (us-east-2): the live SDL contains **zero** occurrences of `SiteCopy`/`listSiteCopies`, while the DynamoDB table `SiteCopy-j7b2x3sh7rcezekekkxxiak7hi-main` (ACTIVE, 0 items) and AppSync data source `SiteCopyTable` already exist. The schema push (`npm run deploy:gen1:sitecopy`, after `python scripts/export-appsync-schema.py`) has **not** been run. Until it is, the clerk's "Edit navigation labels, headings, and Quick Tasks text" task fails at load with the (well-worded) schema message from `cms-staff-appsync-auth.ts`.
2. **P1 — Production `OfficialContact` data may be missing stable IDs.** The site looks up contacts by `town-information`, `city-clerk`, and `town-superintendent`. Footer, permits, and `/contact` Town Administration therefore use bundled fallbacks until IT restores those rows. A clerk editing a random-UUID row may not see their change where they expect.
3. **P1 — SiteCopy key guidance is misleading.** Only **two** keys are wired into the public site today (`topTasksKicker`, `topTasksHeading` via `getDynamicLabel()` in `app.ts`). The clerk-facing placeholder/help text suggests `nav.services`, `homepage.featureHub.heading`, and `primaryNavServicesLabel`, none of which do anything yet. A clerk could add rows and conclude the CMS is broken. (Fixed as a quick win on this branch.)

Everything else is in good shape: the task-hub model is genuinely clerk-friendly (plain-English cards, live "N saved / None saved yet" badges, per-task empty-state notes, step-by-step help, field glossaries), errors are mapped to plain English, and content-staleness is surfaced with a "Live database / Saved browser copy / Backup text" tag plus a one-click **Force Refresh Live CMS Content** button.

## Capability matrix

Axes: **In-app?** (completable at `/admin` without AWS Console) · **Clear?** (labels/hints/validation) · **Failure modes** (what the clerk sees on auth/AppSync/empty problems) · **Verified by** (how this evaluation checked it).

| Task                                  | Model                 | In-app?                                                            | Clear?                                                                                                                                                                                                          | Failure modes                                                                                         | Verified by                                                             |
| ------------------------------------- | --------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Post news or notice                   | Announcement          | ✅ generic editor + newsletter PDF upload panel                    | ✅ good hints (`newsletter` kind, file code from IT). Date field was labeled "Date (YYYY-MM-DD)" despite being a native picker — fixed (quick win)                                                              | ✅ sign-in check before save; clerk-friendly GraphQL mapping; load error banner + records cleared     | code review + hub render                                                |
| Add meeting or event                  | Event                 | ✅                                                                 | ✅ native datetime pickers; "Enter a valid date and time." validation                                                                                                                                           | ✅ same generic-editor handling                                                                       | code review + hub render ("3 saved")                                    |
| Homepage photo / welcome text         | SiteSettings          | ✅ singleton auto-loads; hero upload panel feeds `heroImageUrl`    | ✅ 16 fields with plain labels; long form but glossary covers all fields                                                                                                                                        | ✅ same; singleton avoids duplicate-row mistakes                                                      | code review + hub render ("1 saved")                                    |
| Add a form or PDF                     | PublicDocument        | ✅ + meeting-document upload (dedicated, meeting-linked)           | ⚠️ `sectionId` must be typed exactly; valid values are listed elsewhere on the page (Document publishing table) but the field itself is free text — dropdown would be safer (P1)                                | ✅                                                                                                    | code review + hub render ("None saved yet" note shows)                  |
| Update Town Hall / clerk contact      | OfficialContact       | ✅                                                                 | ⚠️ `id` free-text with placeholder `town-information or city-clerk`; protected rows can't be deleted (good), but model has **no `active` field**, so old "set active to off" hint was wrong — fixed (quick win) | ✅ delete protection + explanation                                                                    | code review + editor render; **prod data gap: stable IDs missing (P1)** |
| Update mayor & council list           | LeadershipRosterEntry | ✅ with drag-reorder (OrderList) scoped by `groupId`               | ✅ `groupId` placeholder gives both valid values; EN/ES lines explained. Empty-state said "until IT adds rows" though the clerk can add them — fixed (quick win)                                                | ✅ reorder failures restore previous order + error message                                            | code review + hub render                                                |
| Update business directory             | Business              | ✅ with drag-reorder                                               | ✅                                                                                                                                                                                                              | ✅                                                                                                    | code review + hub render ("10 saved")                                   |
| Add outside news link                 | ExternalNewsLink      | ✅ with drag-reorder                                               | ✅                                                                                                                                                                                                              | ✅                                                                                                    | code + `/news` shows both live rows                                     |
| Turn on emergency banner              | AlertBanner           | ✅                                                                 | ✅ "one active banner at a time" guidance; link label/URL pairing explained                                                                                                                                     | ✅                                                                                                    | code review + hub render                                                |
| Edit site copy (nav labels, headings) | SiteCopy              | ❌ **blocked by backend (P0)** — editor UI is complete and renders | ⚠️ key examples included unwired keys — fixed (quick win); only `topTasksKicker`/`topTasksHeading` work today                                                                                                   | ✅ dedicated schema-missing message ("Contact IT to enable Staff group permissions…")                 | live schema introspection (0 SiteCopy occurrences) + editor render      |
| Manage email forwarding               | EmailAlias            | ✅ dedicated table/dialog editor                                   | ✅ email validation on both addresses; plain-language delete warning                                                                                                                                            | ✅ signed-out → warning banner, table hidden; save/delete toasts; snapshot refresh fallback messaging | code review + hub render                                                |

**Auth gating (all tasks):** unauthenticated visits to `/admin` route to `/admin/login`, which auto-redirects (~300 ms) to the Cognito Hosted UI. There is no signed-out task hub; the clerk lands on a familiar sign-in page (good). Every save/delete re-checks the session and shows "Sign in at /admin/login…" instead of failing cryptically when a session expires mid-edit. Auth-wall caveat: this evaluation could not perform real Cognito sign-in; signed-in flows were exercised with the e2e staff bypass on a local dev server (list/save short-circuit in bypass mode, so live mutation paths were verified by code review only).

## Backend gaps

| #   | Gap                                                                                                                           | Severity               | Evidence                                                                                                             | Fix                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `SiteCopy` model absent from live Gen 1 AppSync schema (`listSiteCopies` undefined; no resolvers)                             | **P0**                 | `aws appsync get-introspection-schema` → 0 matches for `SiteCopy`; table + `SiteCopyTable` data source already exist | Run `python scripts/export-appsync-schema.py` then `npm run deploy:gen1:sitecopy` (see `docs/sitecopy-staff-appsync-auth.md`); verify with a Staff JWT `listSiteCopies` query and `scripts/probe-appsync-sitecopy.py` |
| 2   | `OfficialContact` table has 1 row with UUID id; stable ids `town-information` / `city-clerk` missing                          | **P1**                 | read-only DynamoDB scan of `OfficialContact-j7b2x3sh7rcezekekkxxiak7hi-main`                                         | Create/restore the two stable-ID rows (clerk can do this in-app via the Record id field, or IT via console)                                                                                                           |
| 3   | `LeadershipRosterEntry`, `PublicDocument`, `AlertBanner`, `SiteCopy` have zero rows — affected pages run on bundled fallbacks | P2 (content, not code) | hub badges "None saved yet" + table counts                                                                           | Clerk seeds rows via `/admin` once SiteCopy is deployed; fallbacks are acceptable meanwhile                                                                                                                           |

## Caching / staleness UX

The public site is offline-first (`localStorage` key `tow-cms-snapshot-v1`, 7-day TTL; build snapshot `/cms-snapshot.json`; then live AppSync). For a non-technical clerk this is handled **well overall**:

- `/admin` "Start here" shows a status banner in plain English plus a source tag — **Live database / Saved browser copy / Backup text / Loading…** — and a **Force Refresh Live CMS Content** button with success/error toasts and a "Last refreshed" timestamp.
- Every editor save/delete already calls `forceLiveRefresh()` so the admin page reflects the change immediately; the success message tells the clerk to hard-refresh the public preview path.
- The clerk guide's troubleshooting ladder (hard-refresh → Force Refresh → Clear saved website copy) is ordered correctly and explains that localStorage clearing only affects the clerk's own browser.

Remaining rough edges:

- **SiteCopy is persisted in browser snapshots** — included in `localStorage` / build snapshot; the public site always background-refreshes from AppSync when online so staff saves reach residents within seconds.
- Residents' browsers keep their own 7-day snapshot. The guide says new content appears "within a few seconds", which is true for fresh visitors but optimistic for returning ones whose snapshot is still valid; the "Saved browser copy" tag mitigates this on the clerk's machine only (P2, doc wording).

## Documentation gaps (CLERK-CMS-GUIDE.md)

The guide is thorough but had **contradictory and outdated guidance** from the Data-Manager era (several fixed as quick wins on this branch):

1. "**Do not** try to edit the website from: The `/admin` page itself" — directly contradicts the current in-app editors. **Fixed.**
2. Quick Reference card said "EDIT CMS: Use /admin → Content editor URL (AppSync)" — the in-app forms are now the primary path. **Fixed.**
3. "All website content is managed in one place: **Amplify Console Data manager**" — outdated framing. **Fixed.**
4. Part 1 still walks through Amplify Studio invitations (legacy Gen 1, being retired) before mentioning the `/admin/login` Cognito account a clerk actually needs day-to-day. Marked as legacy; full restructure left as P2.
5. SiteCopy section now lists the two wired keys so clerks don't invent unsupported ones. **Fixed.**

## Prioritized recommendations

### P0 — must fix

- **Deploy SiteCopy to the live Gen 1 API** (`export-appsync-schema.py` → `npm run deploy:gen1:sitecopy`, then Staff-JWT verification). [larger change — AWS mutation, run deliberately]
- **After deploy, seed the two wired SiteCopy keys** (`topTasksKicker`, `topTasksHeading`) so the clerk task has visible effect. [quick win — clerk/IT data entry, no code]

### P1 — should fix

- **Restore `OfficialContact` stable-ID rows** (`town-information`, `city-clerk`) in production. [quick win — data entry]
- **Correct SiteCopy key guidance in the clerk UI** to the actually-wired keys. [quick win — **implemented on this branch**]
- **Make `sectionId` (Add a form or PDF) and `groupId` (leadership) select dropdowns** instead of free text — removes the most error-prone typing in the whole CMS. [larger change — form-field type + template work]
- **Fix CLERK-CMS-GUIDE.md contradictions** (edit-from-/admin ban, quick-reference card, Data-Manager-first framing). [quick win — **implemented on this branch**]
- **Wire more SiteCopy keys** (nav labels, section headings) so the task title ("Edit navigation labels…") matches reality. [larger change — `getDynamicLabel` adoption across `app.ts`]

### P2 — polish

- Editor form heading concatenates awkwardly ("Add Update Town Hall or clerk contact") — use a short neutral heading. [quick win — **implemented on this branch**]
- Remove the wrong "set active to off" hint for protected contacts (OfficialContact has no `active` field). [quick win — **implemented on this branch**]
- Leadership empty-state implied only IT could add rows. [quick win — **implemented on this branch**]
- Note in clerk copy that SiteCopy edits need a live fetch (post-deploy). [quick win — do after P0 deploy]
- Restructure CLERK-CMS-GUIDE Part 1 around Cognito `/admin/login` first, Studio as legacy appendix. [larger change — doc rewrite]
- Required fields are only validated at submit (throwing one error at a time); inline required markers exist but inline validation messages would be friendlier. [larger change]

## Quick wins implemented on this branch

- `src/app/cms-admin/cms-clerk-tasks.ts` — SiteCopy key examples corrected to wired keys; leadership empty-state reworded.
- `src/app/cms-admin/cms-clerk-task-form-fields.ts` — SiteCopy key placeholder/help corrected; notice date label fixed for the native picker.
- `src/app/cms-admin/cms-clerk-record-editor.component.ts` — neutral form headings; corrected protected-contact delete explanation; delete-confirm hint only suggests "Show on website" when the form actually has it.
- `docs/CLERK-CMS-GUIDE.md` — removed the "don't edit from /admin" contradiction, modernized the editing-surface framing and quick-reference card, added supported SiteCopy keys.

## What this evaluation could not verify

- **Real Cognito staff sign-in and live mutations** — the Hosted UI auth wall cannot be crossed by automation; signed-in UI was exercised via the e2e staff bypass (which short-circuits actual GraphQL writes). Mutation paths were verified by code review and existing vitest coverage.
- **`AI-BRIEF.md` / `manifest.json`** were being regenerated by another agent during this evaluation and were treated as advisory only; source code was used as ground truth.
- **Email forwarding end-to-end** (SES/mail-router sync after `EmailAlias` save) — out of scope; UI and persistence layers reviewed only.

## Recommended next actions

1. Run the SiteCopy Gen 1 deploy (IT, with AWS mutation approval): `source scripts/agent-aws-env.sh && python scripts/export-appsync-schema.py && npm run deploy:gen1:sitecopy`, then verify with a Staff JWT and `scripts/probe-appsync-sitecopy.py`.
2. Restore the two `OfficialContact` stable-ID rows in production.
3. Seed `topTasksKicker` / `topTasksHeading` SiteCopy rows and have the clerk verify the homepage "How do I…" heading changes.
4. Commit and push this branch; open a PR and let `site-ci / CI gate (merge required)` run.
