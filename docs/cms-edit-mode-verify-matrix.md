# CMS edit-mode → deep verify matrix

Each task on **`/admin`** has an **Edit content** form and a **See on live site** button. After this PR, the button deep-links to the exact element on `townofwiley.gov` that was just changed, so a clerk can verify the save without scrolling or guessing.

The link is built by [`buildClerkTaskLiveLink()`](../src/app/cms-admin/cms-clerk-task-live-link.ts) and asserted by [`cms-clerk-task-live-link.vitest.ts`](../src/app/cms-admin/cms-clerk-task-live-link.vitest.ts). Each row below is the **contract** between the admin task and the public DOM anchor.

## How to read this table

- **Edit form** — Angular component (admin side) that renders the form.
- **Mutation** — GraphQL `create*` / `update*` call against AppSync (Gen 1, API id `j7b2x3sh7rcezekekkxxiak7hi`).
- **Public anchor** — DOM `id="…"` rendered on the live site that the deep link targets.
- **Deep link (post-save)** — URL the **See on live site** button opens after `saveId` is known.
- **Hub link** — URL the task-hub **See on website** card link opens (section-level only).
- **Manual verify** — what to look for on the live site after following the deep link.

## Tasks (10)

| Task | Model | Edit form | Public page | Public anchor | Deep link (post-save) | Hub link | Manual verify |
|---|---|---|---|---|---|---|---|
| **Post news or notice** (`post-notice`) | `Announcement` | [`cms-clerk-record-editor.component.html`](../src/app/cms-admin/cms-clerk-record-editor.component.html) (generic) | `/notices` (notice) or `/news` (newsletter) | `notice-{sanitized id}` on `<a class="notice-card">` ([`notices-page.html`](../src/app/notices-page/notices-page.html)); `town-newsletter-heading` on `<h2>` ([`news.html`](../src/app/news/news.html)) | Newsletter → `https://townofwiley.gov/news#town-newsletter-heading`. Short notice → `https://townofwiley.gov/notices#notice-{sanitized savedId}` | `https://townofwiley.gov/news#recent-town-notices-heading` | The card with your title is in view; date and detail match the form. |
| **Add meeting or event** (`add-meeting`) | `Event` | generic | `/meetings` | `event-{id}` on the `<tr>` ([`meetings-page.html`](../src/app/meetings-page/meetings-page.html)) | `https://townofwiley.gov/meetings#event-{savedId}` | `https://townofwiley.gov/meetings#calendar` | The meeting row is highlighted in view; date/location/format match. |
| **Change homepage photo or welcome text** (`homepage`) | `SiteSettings` (singleton) | generic | `/` | `site-hero-title` on the hero `<h1>` ([`app.html`](../src/app/app.html)) | `https://townofwiley.gov/#site-hero-title` | `https://townofwiley.gov/#site-hero-title` | Hero title / photo / welcome lines reflect the save. |
| **Update Town Hall or clerk contact** (`update-contacts`) | `OfficialContact` | generic | `/contact` | `contact-{id}` on the contact value block in the Administration card ([`contact-page.html`](../src/app/contact-page/contact-page.html)) | `https://townofwiley.gov/contact#contact-{savedId}` | `https://townofwiley.gov/contact#contact-administration` | Label / value / detail / link match. Stable ids `town-information`, `city-clerk`, `town-superintendent` must not change. |
| **Update elected officials & town administration lists** (`update-leadership`) | `LeadershipRosterEntry` | generic | `/contact` | `leadership-row-{groupId}-{id}` on each `<div class="contact-roster-item">` ([`contact-page.html`](../src/app/contact-page/contact-page.html)) | `https://townofwiley.gov/contact#leadership-row-{groupId}-{savedId}` (group is `mayor-council` or `town-administration`) | `https://townofwiley.gov/contact#leadership` | Bullet line shows in the right group (Elected Officials section or Administration card) in the correct order. |
| **Update business directory** (`business-directory`) | `Business` | generic | `/businesses` | `business-{id}` on the `<article>` card ([`business-directory.html`](../src/app/business-directory/business-directory.html)) | `https://townofwiley.gov/businesses#business-{savedId}` | `https://townofwiley.gov/businesses#business-directory-heading` | Card with name / phone / address / website is in view. |
| **Add outside news link** (`external-news`) | `ExternalNewsLink` | generic | `/news` | `external-news-{id}` on the `<p-card>` ([`news.html`](../src/app/news/news.html)) | `https://townofwiley.gov/news#external-news-{savedId}` | `https://townofwiley.gov/news#external-news-heading` | Card with title / source is in view; outbound link works. |
| **Turn on emergency banner** (`emergency-banner`) | `AlertBanner` (singleton — only one enabled at a time) | generic | `/` | `site-alert-title` on the banner `<strong>` ([`app.html`](../src/app/app.html)) | `https://townofwiley.gov/#site-alert-title` | `https://townofwiley.gov/#site-alert-title` | Banner shows the new label / title / detail at the top of `/`. |
| **Edit navigation labels, headings, and Quick Tasks text** (`edit-site-copy`) | `SiteCopy` | generic | `/` (only `topTasksKicker` and `topTasksHeading` are wired today) | `top-tasks-heading` on the Quick Tasks `<h2>` ([`app.html`](../src/app/app.html)) | `https://townofwiley.gov/#top-tasks-heading` | `https://townofwiley.gov/#top-tasks-heading` | "How do I…" section heading reflects the save. Other `SiteCopy` keys are saved but not yet wired to a public anchor. |
| **Manage email forwarding** (`manage-email-aliases`) | `EmailAlias` (staff-only) | [`cms-email-alias-admin.component.html`](../src/app/cms-admin/cms-email-alias-admin.component.html) (dedicated) | none — `showPublicPreview: false` | n/a | none (button hidden) | none | Send a test email to the public address and confirm it lands in the staff inbox. |

## Singletons vs per-record

- **Per-record fragment** — the link contains the just-saved AppSync record id and scrolls to that exact element.
- **Singleton / section-level fragment** — `SiteSettings`, `AlertBanner`, `SiteCopy` are one-row models or section-driven, so the link goes to the rendered section.

## Proof method (what CI actually checks)

**These tests do not prove that a clerk save reached the public website.** They only prove that URL strings and DOM anchor ids are wired consistently in code.

| Test file | What it proves | What it does *not* prove |
|---|---|---|
| [`cms-clerk-task-live-link.vitest.ts`](../src/app/cms-admin/cms-clerk-task-live-link.vitest.ts) | Post-save and hub **URL strings** for each task | AppSync write, CDN snapshot publish, or live DOM content |
| [`cms-clerk-tasks.vitest.ts`](../src/app/cms-admin/cms-clerk-tasks.vitest.ts) | Every preview task declares a hub URL or opts out | End-to-end clerk workflow |
| [`contact-page.spec.ts`](../src/app/contact-page/contact-page.spec.ts) | Public template renders mocked CMS roster rows (including `town-administration`) | Real `/admin` save → CDN → `/contact` |
| [`cms-order-list-reorder.vitest.ts`](../src/app/cms-admin/cms-order-list-reorder.vitest.ts) | OrderList reorder handler reads the mutated bound list | GraphQL `displayOrder` persistence |

**Operational parity check (AppSync vs CDN):** run `npm run verify:cms-snapshot-parity` after clerk edits or before closing an IT ticket. It compares active `LeadershipRosterEntry` rows in AppSync with `/cms-snapshot.json` on the live site.

[`cms-clerk-task-live-link.vitest.ts`](../src/app/cms-admin/cms-clerk-task-live-link.vitest.ts) example (URL wiring only):

```ts
it('update-leadership town-administration → /contact#leadership-row-town-administration-{savedId}', () => {
  expect(buildClerkTaskLiveLink({
    taskId: 'update-leadership',
    savedId: 'roster-2',
    formValues: { groupId: 'town-administration' },
  })).toBe('https://townofwiley.gov/contact#leadership-row-town-administration-roster-2');
});
```

[`cms-clerk-tasks.vitest.ts`](../src/app/cms-admin/cms-clerk-tasks.vitest.ts) additionally enforces that every task either declares `showPublicPreview: false` (skip live link) or has a matching entry in `TASK_LIVE_LINK_MAP`, so a future task added to [`cms-clerk-tasks.ts`](../src/app/cms-admin/cms-clerk-tasks.ts) without a public anchor will fail CI.

Manual verify still works without the deep link — every public anchor above is a stable `id` you can paste into the URL bar (e.g. `https://townofwiley.gov/contact#leadership-row-town-administration-…`).

## Caching note (public site)

After a save, the editor calls `LocalizedCmsContentStore.forceLiveRefresh()` so **the clerk’s `/admin` session** matches AppSync immediately.

The **public site** reads `/cms-revision.json` and `/cms-snapshot.json` from CloudFront (not AppSync on every visit). Clerk saves trigger `TownOfWileyCmsChangeNotifier` to republish those JSON files within about one minute. **`npm run deploy:site` must not upload `cms-snapshot.json`** — that would overwrite stream-published content with a stale build artifact (see [`deploy-static-site.sh`](../scripts/deploy-static-site.sh)).

## Related

- [`docs/CMS-MODEL-ROUTE-MATRIX.md`](CMS-MODEL-ROUTE-MATRIX.md) — model → public route mapping (single source of truth for which models are public).
- [`docs/CLERK-CMS-GUIDE.md`](CLERK-CMS-GUIDE.md) — day-to-day clerk steps.
- [`src/app/cms-notice-link.ts`](../src/app/cms-notice-link.ts) — pre-existing fragment helper for notices; reused by the link builder.
