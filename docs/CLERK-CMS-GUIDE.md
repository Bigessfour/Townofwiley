# Wiley Website Clerk Guide

This guide is written for the Town Clerk or any staff member who manages the Wiley website. No technical knowledge is needed. Every step is explained exactly as written.

**Technical map (for IT or training):** see [CMS-MODEL-ROUTE-MATRIX.md](./CMS-MODEL-ROUTE-MATRIX.md) for which Studio models feed which pages, and [CMS-STUDIO-OPERATIONS-CHECKLIST.md](./CMS-STUDIO-OPERATIONS-CHECKLIST.md) for AWS-side checks.

**Verify CMS is working (Studio + website):** follow [CMS-VERIFY-STUDIO.md](./CMS-VERIFY-STUDIO.md) — about five minutes, no code required.

---

## Part 1 — Get Access (Do This Once)

> **What you actually need day-to-day:** a Town staff account for **https://townofwiley.gov/admin/login** (Step 5). Steps 1–2 below cover the legacy Amplify Studio invitation, which most clerks no longer need — skip to Step 3 unless IT tells you otherwise.

### Step 1 — Ask for an invitation (legacy — only if IT asks)

You need an invitation before you can log in. Contact the person who manages the website (your IT contact or the person who set this up) and ask them to invite you to Amplify Studio for the `townofwiley` app.

For **Gen 2**, your IT contact adds you in **IAM** or shares the Amplify Console **Data manager** link (see [amplify-gen2-migration-plan.md](./amplify-gen2-migration-plan.md)). Gen 1 Studio invitations are being retired.

### Step 2 — Accept the invitation

1. Open the invitation email.
2. Click the **Accept invitation** button.
3. It will open a page in your web browser.
4. Create a password. Write it down and keep it somewhere safe.
5. You will land on the Amplify Studio home page.

If the link has expired (they expire after 24 hours), ask for a new invitation.

### Step 3 — Bookmark your main website management page

Bookmark this page first: https://townofwiley.gov/admin

The admin page is a **task hub** in plain English: pick what you want to change, click **Edit content**, save in the **on-page form**, then **See on website** and hard-refresh. It also has document publishing help, resident message review, and optional file uploads. **Clerk screens are English only**; the public site stays bilingual — fill Spanish fields in the editor when they appear.

Quick reference: [clerk-desk-reference.md](./clerk-desk-reference.md)

### Step 4 — IT only: AppSync Queries console (optional bookmark)

Most clerks **never need this**. IT uses it for bulk GraphQL or troubleshooting.

| Link                                                                                                                                                                | What it is                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [AppSync Queries — Gen 1 production CMS API `j7b2…`](https://us-east-2.console.aws.amazon.com/appsync/home?region=us-east-2#/j7b2x3sh7rcezekekkxxiak7hi/v1/queries) | Direct GraphQL against CMS models when IT needs the AWS console. Same URL as **Open content editor** under **Advanced (IT)** on `/admin`. |

**Clerks:** use task cards on `/admin` → **Edit content**. Do not edit in the AWS console unless IT asks you to.

### Step 5 — Log in to the Town admin hub

1. Open **https://townofwiley.gov/admin** (bookmark this page).
2. Your browser redirects to the **secure Cognito sign-in page** (Amazon Cognito Hosted UI).
3. Enter your **Town staff email** and **password**.
4. **First time only:** If IT gave you a temporary password, sign in with it; Cognito will ask you to choose a new password.
5. After sign-in, you return to **https://townofwiley.gov/admin** — use the task buttons (**Edit content**, **See on website**).

**Forgot your password?**

1. On the Cognito sign-in page, click **Forgot password?**
2. Enter your staff email and follow the prompts.
3. Check your inbox (and spam) for a verification code from Amazon Cognito.
4. Enter the code and a new password (at least 8 characters), then sign in with the new password.

If you do not receive the email or do not have an account yet, call Town Hall at **(719) 829-4974** so IT can help.

The AppSync Queries console (Step 4) uses your **AWS console** login, not your Town staff password. Routine CMS edits use **`/admin/login`** only.

---

## Part 2 — The Basics You Need to Know

### Where you make changes

All routine website content is edited directly on **https://townofwiley.gov/admin**: pick a task card, click **Edit content**, and the form opens on the same page. Sign in at `/admin/login` with your Town staff account first.

The admin page also shows whether the public website is reading saved content (the status banner and **Force Refresh Live CMS Content** button at the top). **Email forwarding** is edited only on `/admin` — residents never see those settings.

IT may occasionally use the AppSync Queries console for the production API `j7b2x3sh7rcezekekkxxiak7hi` (link under **Advanced (IT)** on `/admin`). Clerks should not need it for day-to-day work.

**Do not** try to edit the website from:

- Code files — leave those alone entirely
- Any tool other than `/admin` (or the AWS console when IT specifically directs you there)

### How changes work

When you save a record in the **Edit content** form on `/admin`, the change is saved to the database immediately. The **public website** usually shows the update within **about one minute** (not instantly). An info message appears after each save to remind you of this delay. Use **See on website** and a normal page refresh to verify — hard refresh is rarely needed.

### When IT changes payment or other website settings (not Studio)

Some features—utility bill pay links, weather signup, chatbot—are controlled by environment variables / runtime-config (sourced via `scripts/generate-runtime-config.mjs`), not by CMS records. After your IT contact changes those settings (in secrets or the generate script), rebuild and deploy the static site to S3 + CloudFront (see README "Deployment Record" and best-practice cache headers + invalidation). Until the invalidation completes, the public site may still show old behavior. (Amplify Hosting app decommissioned June 2026; current hosting uses CloudFront Response Headers Policy for CSP/security headers and managed cache policies.)

**What you should do after IT says a deploy is done:**

1. Open the page you care about (for example `/pay-bill` or `/services`).
2. **Hard-refresh** so your browser loads the new settings: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac). On a phone, close the tab completely and open the site again.
3. If something still looks wrong, tell IT the date/time you checked—they compare the live site file `/runtime-config.js` to Amplify (see `docs/amplify-deployment-runbook.md`).

### The rule for every change

1. Open **https://townofwiley.gov/admin** and sign in if needed.
2. Pick the task that matches what you want to change (or use the model table below if you are unsure).
3. Click **Edit content**, create or edit the record in the on-page form.
4. Save.
5. Click **See on website**, hard-refresh, and check what residents see.

---

## Part 3 — What Each Model Controls

Every piece of content on the website lives in one of these CMS models. On `/admin`, each task card opens the matching model in the **Edit content** form.

| What you are updating                                            | Model / task on `/admin`                                                                                                            |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Homepage title, welcome text, and hero photo                     | `SiteSettings` — **Change homepage photo or welcome text**                                                                          |
| Emergency banner shown at the top of the homepage                | `AlertBanner` — **Turn on emergency banner**                                                                                        |
| Public notices, closures, and general announcements              | `Announcement` — **Post news or notice**                                                                                            |
| Meetings, hearings, and calendar events                          | `Event` — **Add meeting or event**                                                                                                  |
| Town Hall intro text and staff mailto links on `/contact`        | `OfficialContact` — **Update Town Hall or clerk contact**                                                                           |
| Mayor/Council list and administration roster lines on `/contact` | `LeadershipRosterEntry` — **Update mayor and council list**                                                                         |
| Business directory listings                                      | `Business` — **Update business directory**                                                                                          |
| Meeting agendas and approved minutes (PDF on `/meetings`)        | `PublicDocument` — **Upload a meeting agenda or packet** / document publishing section                                              |
| External news links shown on the /news page                      | `ExternalNewsLink` — **Add outside news link**                                                                                      |
| Navigation labels, headings, Quick Tasks text                    | `SiteCopy` — **Edit navigation labels, headings, and Quick Tasks text**                                                             |
| Town email forwarding rules (staff-only; not on the public site) | `EmailAlias` — **Manage email forwarding** (see [Managing Email Aliases / Proxy Settings](#managing-email-aliases--proxy-settings)) |

### Important: stable `OfficialContact` record IDs

The **`/contact`** page uses **`OfficialContact`** rows by **`id`**, not by display name. Keep these exact IDs:

| `id` field (exact)    | Purpose on `/contact` and elsewhere                                                           |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `town-information`    | Intro summary in the **Town Administration** card; also footer, `/services`, `/accessibility` |
| `city-clerk`          | Mailto link for clerk roster lines in **Town Administration**; also `/permits`, `/services`   |
| `town-superintendent` | Mailto link for superintendent roster lines in **Town Administration**                        |

If you delete a row and recreate it with a different `id`, the site may show bundled fallback text until IT restores the IDs.

### How `/contact` is laid out (2026)

Residents see three sections on [https://townofwiley.gov/contact](https://townofwiley.gov/contact):

1. **Town Hall** — address, hours, and main phone (mostly fixed copy; not edited through CMS).
2. **Town Administration** — `town-information` summary plus roster lines from **`LeadershipRosterEntry`** with `groupId` **`town-administration`** (names with optional mailto from `city-clerk` / `town-superintendent`).
3. **Elected Officials** (`#leadership`) — roster lines from **`LeadershipRosterEntry`** with `groupId` **`mayor-council`** (role and name only; no mailto).

There is no separate “records assistance” block on `/contact`. Other document requests go to **clerk@townofwiley.gov** (linked from `/permits` and related pages). **`/records`** redirects to **`/contact`**.

### Field names that match the database (use these in Studio)

- **AlertBanner:** `enabled`, `label`, `title`, `detail`, `linkLabel`, **`linkHref`** (the button link is **linkHref**, not “link URL”).
- **OfficialContact:** **`label`**, **`value`**, **`detail`**, **`href`** (mailto: or tel:), **`linkLabel`**, **`displayOrder`**. The **`id`** is the stable key in the table above.
- **Announcement:** `title`, `detail`, `date` (`YYYY-MM-DD`), `active`, **`priority`** (number — lower sorts first among bulletin notices), **`announcementKind`** (leave blank for short bulletins; type **`newsletter`** in lowercase for the long newsletter block on `/news`), **`attachmentKey`** (S3 file path for a newsletter PDF — see [Announcement fields explained](#announcement-fields-explained-announcementkind-attachmentkey-priority-and-imageurl) below), **`imageUrl`** (optional full `https://` image link — see same section).

### Upload files on `/admin` (presigned upload)

The admin page can upload files directly — you do not need AWS Console access.

| What you are uploading            | Where on `/admin`                                                                  | What to paste in the form after upload                                                    |
| --------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Homepage hero photo**           | **Change homepage photo** → **Edit content** → **Choose photo from this computer** | Full public URL after upload, e.g. `https://townofwiley.gov/media/cms/hero/your-file.jpg` |
| **Newsletter PDF**                | **Post news or notice** task or newsletter upload panel                            | Storage file code, e.g. `documents/newsletter/2026-06-town-newsletter.pdf`                |
| **Meeting agenda or minutes PDF** | **Document publishing** → meeting upload                                           | The form fills the storage key automatically                                              |

Steps:

1. Sign in at `/admin/login`.
2. Choose the upload area for your file type.
3. Click **Choose file** and select the PDF or image.
4. Wait for **Upload complete** — the form field updates automatically.
5. Save the record and hard-refresh the public page.

If upload fails, use **Test CMS Connection** on `/admin` (Advanced) or call Town Hall at (719) 829-4974.

---

## Part 4 — Step-by-Step Tasks

### Post a new public notice or announcement

Use this for closures, reminders, utility updates, and general public notices.

1. Open **https://townofwiley.gov/admin** and use **Post news or notice** → **Edit content** (or open **Announcement** in AppSync Queries `j7b2x3sh…` if IT directed you there).
2. Click **Announcement** in the left sidebar.
3. Click **Create announcement** (top-right button).
4. Fill in **title** — keep it short and clear, like a headline.
5. Fill in **detail** — explain what happened, who is affected, and when.
6. Fill in **date** — use the format `YYYY-MM-DD`, for example `2026-04-15`.
7. Set **active** to **true** (toggle it on).
8. Set **priority** — see [Announcement fields explained](#announcement-fields-explained-announcementkind-attachmentkey-priority-and-imageurl) (lower numbers sort first among short notices).
9. Leave **announcementKind** blank for a normal bulletin notice. Leave **attachmentKey** blank unless IT told you to use it for a newsletter PDF.
10. **imageUrl** — optional; see the same section. You may leave it blank for routine notices.
11. Click **Save**.
12. Open https://townofwiley.gov/news in a new browser tab, refresh it, and confirm the notice appears.

### Post a town newsletter (PDF or long-form update on /news)

Use this when the Clerk publishes a scanned newsletter, PDF issue, or long column that should appear in the **Newsletter from Town Hall** section on `/news` (not the short bulletin cards).

**Preferred — in-app editor on `/admin`:**

1. Open **https://townofwiley.gov/admin** → **Post news or notice** → **Edit content** (sign in first).
2. Fill **Title** and **Detail / Message** (detail can be a short summary; residents read the PDF for the full issue).
3. Set **Kind** to **Newsletter (PDF on /news)**.
4. Under **Newsletter PDF**, click **Choose PDF to upload** and select the finished file, **or** paste the storage file code IT gave you (for example `documents/newsletter/2026-06-09-town-newsletter.pdf`). The form fills **Kind** automatically when a file code is present.
5. Confirm **Date** (defaults to today on new entries) and turn **Show on website** on.
6. Click **Save to website**, then hard-refresh `https://townofwiley.gov/news`.
7. Confirm one newsletter card appears with an embedded PDF preview and an **Open newsletter PDF in a new tab** link.

**IT fallback — AppSync Queries console:** same field names (`announcementKind` = `newsletter`, `attachmentKey` = full S3 key under `documents/newsletter/`). See [CMS_NEWSLETTER.md](./CMS_NEWSLETTER.md).

Deactivate older newsletter rows (**Show on website** off) when publishing a new issue so only the latest date is featured.

Short utility notices should use **Kind** = **Short notice (bulletin)** so they stay in **Current Wiley Updates**.

### Announcement fields explained: announcementKind, attachmentKey, priority, and imageUrl

Use this table when you are unsure what to type in optional **Announcement** fields in the **Post news or notice** form (or AppSync Queries when IT directs you there).

| Field                              | What it is                                                                | What you should enter                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **announcementKind** (Kind)        | Tells the website which layout to use on `/news`.                         | **Short notice (bulletin)** for **Current Wiley Updates**. **Newsletter (PDF on /news)** for the **Newsletter from Town Hall** block with embedded PDF.                                                                                                                                                                                                                                                                                                                                        |
| **attachmentKey** (Newsletter PDF) | Storage file code for the newsletter PDF.                                 | Upload in the **Post news or notice** form or paste the full key (starts with `documents/newsletter/`). Not a `https://` link. Auto-sets **Kind** to newsletter when filled.                                                                                                                                                                                                                                                                                                                   |
| **priority**                       | A whole number used to **sort** announcements before the site shows them. | For **short notices** (blank `announcementKind`), **smaller numbers appear first** (for example `1` is ahead of `5`). Use `1`–`3` for urgent items and larger numbers (such as `10`, `20`) for routine reminders so you can insert new items later. For **newsletters** (`newsletter`), the primary ordering on `/news` is the **date** field; priority is still stored but date is what decides which issue is treated as the newest — ask IT if you need a specific priority convention.     |
| **imageUrl**                       | A full public web address pointing to an **image** file.                  | Must start with **`https://`** and should point directly to an image (for example `.jpg`, `.png`, or `.webp`) that opens **without logging in**. **Current website note:** the live homepage timeline, `/news` bulletin cards, and `/notices` cards show **title**, **date**, and **detail** only — they do **not** yet display this image on screen, even if you fill the field. You can safely leave **imageUrl** blank unless IT has told you a specific page or future update will use it. |

### Add or refresh regional news links (Wiley / Prowers coverage)

Outside stories are **ExternalNewsLink** records, not automatic web crawling. Staff adds links to articles that mention Wiley, CO, or Prowers County; they appear under **Stories mentioning Wiley or Prowers County**.

1. On `/admin`, open **Add outside news link** → **Edit content**.
2. Create a record with **title**, **url**, **source** (e.g. newspaper name), **active** true, and **displayOrder** if you need a fixed order.
3. Save and confirm on `/news`.

### Remove or archive a notice

1. On `/admin`, open **Post news or notice** → **Edit content**, find the notice, and turn **Show on website** off (or set **active** to **false** in AppSync Queries if IT directed you there).

Do not delete the record unless you are certain it should be permanently removed. Turning `active` off is safe and reversible.

### Turn on an emergency banner

Use this only for urgent, time-sensitive information that every visitor needs to see immediately.

Examples: water outage, unplanned office closure, road closure, emergency public safety update.

1. On `/admin`, open **Turn on emergency banner** → **Edit content**.
2. Open the banner record (there is usually one existing record to reuse).
3. Change **enabled** to **true**.
4. Fill in **label** — one to three words, like `Water Outage` or `Office Closed`.
5. Fill in **title** — a short sentence, like `Water service interrupted on Main Street`.
6. Fill in **detail** — one or two sentences explaining what happened and when it will resolve.
7. (Optional) If you want a clickable button on the banner: fill in **linkLabel** with the button text (like `Call Town Hall`) and **linkHref** with the destination. For a phone number use `tel:+17198294974`. For a web page use the full address starting with `https://`.
8. Click **Save**.
9. Refresh the homepage and confirm the banner appears at the top.

### Turn off an emergency banner

1. On `/admin`, open **Turn on emergency banner** → **Edit content**.
2. Open the banner record.
3. Change **enabled** to **false**.
4. Click **Save**.
5. Refresh the homepage and confirm the banner is gone.

**Always turn the banner off when the event is over.** Leaving it on causes residents to ignore future alerts.

### Add or change a meeting or event

1. On `/admin`, open **Add meeting or event** → **Edit content**.
2. Click **Create** or open an existing event.
3. Fill in **title** — for example `City Council Regular Meeting`.
4. Fill in **start** — the full date and time in this format: `2026-05-06T19:00:00`.
5. Fill in **end** if the end time is known.
6. Fill in **location** — for example `Wiley Town Hall, 304 Main Street`.
7. Fill in **description** — one sentence about the meeting, or leave it blank.
8. Set **active** to **true**.
9. Click **Save**.
10. Refresh the /meetings page and confirm the event appears.

To cancel or hide an event, open it and set **active** to **false**.

### Update Town Hall or clerk contact (`OfficialContact`)

1. On `/admin`, open **Update Town Hall or clerk contact** → **Edit content**.
2. Find the row for **`town-information`**, **`city-clerk`**, or **`town-superintendent`** and open it.
3. Update any of these fields:
   - **label** — the role title shown in the Town Administration summary, like `Town Information`
   - **value** — the person's name or main phone number
   - **detail** — a short sentence describing what this contact covers
   - **href** — the link destination. For a phone: `tel:+17198294974`. For email: `mailto:name@townofwiley.gov`.
   - **linkLabel** — the clickable text residents see, like `Call` or `Send email`
4. Click **Save**.
5. Click **See on website**, hard-refresh `/contact`, and confirm the **Town Administration** card.

To add a new contact row, click **Create** and fill in all fields. Do **not** change the stable **`id`** values above unless IT helps.

### Mayor, council, and administration roster (`LeadershipRosterEntry`)

The **Elected Officials** section (`/contact#leadership`) and the **Town Administration** roster lines come from **`LeadershipRosterEntry`** when at least one **active** row exists for that group. If the CMS has no rows yet, the site keeps bundled lines from the app.

**What you do as Clerk**

1. On `/admin`, open **Update mayor and council list** → **Edit content**.
2. Click **Create** (or open an existing row).
3. Set **groupId** to exactly one of these keys (copy/paste):
   - `mayor-council` — lines under **Elected Officials** at `/contact#leadership`
   - `town-administration` — lines in the **Town Administration** card (names; mailto comes from matching `OfficialContact` rows when the role mentions clerk or superintendent)
4. Set **displayOrder** — lower numbers appear first (for example 10, 20, 30 so you can insert lines later).
5. Fill **lineEn** and **lineEs** — one line per record, for example English `Mayor: Pat Garcia` and Spanish `Alcalde: Pat Garcia`.
6. Set **active** to **true** and save.
7. Click **See on website**, hard-refresh `/contact` and `/contact#leadership`, and switch the site language to confirm both languages.

To remove someone from the list, either set **active** to **false** or delete the row. When any CMS lines exist for a **groupId**, the site replaces the whole bullet list for that section.

**How this relates to OfficialContact**

- **`OfficialContact`** (`town-information`, `city-clerk`, `town-superintendent`) supplies the Town Administration summary and mailto links for clerk/superintendent roster lines.
- **`LeadershipRosterEntry`** supplies the visible name lines (elected officials and administration roster).

### Change the homepage hero photo

The hero is the large photo at the top of the homepage.

1. On `/admin`, open **Change homepage photo or welcome text** → **Edit content**.
2. At the top of the form, under **Homepage hero photo**, click **Choose photo from this computer** and pick a JPG, PNG, or WebP.
3. Wait for the upload to finish — the web address fills in automatically and you will see a preview.
4. Click **Save**, then open the homepage and hard-refresh (or wait about one minute for the public copy).

Optional: paste a public `https://` photo link into the field below the button instead of uploading. To go back to the default photo, clear **Homepage hero photo** and save.

### Update homepage text (title, welcome message)

1. On `/admin`, open **Change homepage photo or welcome text** → **Edit content**.
2. Open the settings record.
3. Update any of these fields:
   - **heroTitle** — the large heading residents see first on the homepage
   - **heroMessage** — the short sentence below that heading
   - **heroEyebrow** — the small line of text above the heading (usually `Town of Wiley, Colorado`)
   - **welcomeHeading** — the heading in the welcome section further down the page
   - **welcomeBody** — the paragraph text in the welcome section
4. Click **Save**.
5. Refresh the homepage and confirm the changes appear.

### Add or update a business in the business directory

1. On `/admin`, open **Update business directory** → **Edit content**.
2. Click **Create** or open an existing business.
3. Fill in **name**, **phone**, and **address**.
4. (Optional) Fill in **website** — must be a full URL starting with `https://`.
5. (Optional) Fill in **description** — one or two sentences about the business.
6. Set **active** to **true**.
7. Set **displayOrder** — this controls the order businesses appear in the list. Lower numbers show up first. Using 10, 20, 30 makes it easy to fit a new business in between later.
8. Click **Save**.
9. Refresh the /businesses page and confirm the listing appears.

### Publish meeting agendas and minutes (PublicDocument)

**Post-migration (CMS-only):** Meeting PDFs appear on **`/meetings`** — linked from each meeting row (**View agenda**) and in the searchable **Meeting documents** archive. Optional **titleEs**, **summaryEs**, and **statusEs** supply Spanish labels. After you save, open `/meetings` once (hard refresh if needed); no website redeploy is required for new rows.

**Clerk path (preferred): `/admin`**

1. **Add meeting or event** — create the `Event` first (title, start, active on).
2. **Document publishing** — use **Upload a meeting agenda or packet**: choose the meeting, upload the PDF, click **Upload and publish**. The system sets `sectionId: meeting-documents` and links the file to that event automatically.
3. Hard-refresh `https://townofwiley.gov/meetings` and click **View agenda** on the meeting row.
4. Confirm the file appears in the **Search agendas and approved minutes** archive on the same page.

For approved minutes without an event link, upload via the same meeting upload flow or create a manual `PublicDocument` with `sectionId: meeting-documents` only.

**Other document requests:** Residents email **clerk@townofwiley.gov** from `/contact` or `/permits`. Do not publish budget, ordinance, or FOIA guides as `PublicDocument` rows — those sections are no longer shown on the public site.

See [CMS_MEETING_AGENDA.md](./CMS_MEETING_AGENDA.md) for the full runbook.

**Studio / IT fallback (manual `PublicDocument`)**

1. Upload the PDF to Town document storage:
   `documents/meeting-documents/<unique-name>.pdf`.
2. Create **PublicDocument** with `sectionId: meeting-documents`, correct `href`, and
   keyword `event:<Event.id>` (exact UUID) so `/meetings` can open the right file.
3. Set **active** to **true**. Deactivate older rows for the same meeting when replacing
   an agenda.
4. Regenerate `cms-snapshot.json` and verify `/meetings` (archive and **View agenda** buttons).

**If something goes wrong**

- Wrong file opens: deactivate the old `PublicDocument` and upload again via `/admin`.
- Button shows “not yet available”: no linked PDF for that event — complete step 2 above.
- Link errors: verify `href` matches an uploaded storage key; contact IT at (719) 829-4974.

### Add an external news link (for /news "From Other Sources")

1. On `/admin`, open **Add outside news link** → **Edit content**.
2. Click **Create** or open an existing row.
3. Fill in **title** — a short description, like `Lamar Ledger — Wiley and Prowers County Coverage`.
4. Fill in **url** — the full website address residents should open, like `https://www.lamarledger.com/`.
5. Fill in **source** — the publication name shown with the link, like `Lamar Ledger`.
6. Set **active** to **true**.
7. Click **Save**.
8. Refresh the /news page and confirm it appears under "From Other Sources."

### Edit navigation labels, headings, and Quick Tasks text (`SiteCopy`)

This task updates menu labels, section headings, and “How do I…” copy **without a code deploy**.

1. Open **https://townofwiley.gov/admin** and sign in.
2. Find **Edit navigation labels, headings, and Quick Tasks text** and click **Edit content**.
3. Add or edit rows with a stable **Key**. Keys the website understands today: `topTasksKicker` and `topTasksHeading` (the small label and heading above the "How do I..." section on the homepage). Rows with other keys are saved but change nothing until IT connects that key.
4. Fill **English text** (`valueEn`) and **Spanish text** (`valueEs`) when shown.
5. Leave **Active** on, save, then **Force Refresh Live CMS Content** and hard-refresh the homepage.

Models with **display order** (leadership roster, businesses, documents, news links, site copy) show a live ordered preview — drag rows to reorder; order saves immediately.

**If the editor says “Could not list SiteCopy” or asks you to sign in again:**

- Check the top of `/admin` — it should say **Signed in as** your email. If not, use **Staff sign in** or **Sign out** and sign in again.
- Try another task (e.g. **Post news or notice**). If that works but SiteCopy does not, call IT — production AppSync may need the **SiteCopy** model deployed (see [`sitecopy-staff-appsync-auth.md`](./sitecopy-staff-appsync-auth.md)).
- IT can read the real error in the browser **Network** tab on the `listSiteCopies` GraphQL request.

### Managing Email Aliases / Proxy Settings

This controls **email proxy / forwarding**: where mail sent to a public Town address (like `clerk@townofwiley.gov`) actually lands. **Residents never see this** on the website — it is behind-the-scenes mail routing only.

**Important:** `EmailAlias` is a **staff-authenticated** model. It is **not** loaded on the public site (see [CMS-MODEL-ROUTE-MATRIX.md](./CMS-MODEL-ROUTE-MATRIX.md)). You must be signed in at `/admin/login` to view or change forwarding rules.

#### Add or change a forwarding rule (recommended — on `/admin`)

1. Open **https://townofwiley.gov/admin** and sign in with your **Town staff** account (Cognito Hosted UI).
2. On the task hub, find **Manage email forwarding** and click **Edit content**.
3. The **Email forwarding rules** panel opens on the same page (there is no **See on website** link for this task — that is normal).
4. To add a rule, click **Add forwarding rule**.
5. Fill in:
   - **Town email address** (`aliasAddress`) — the public address residents email, e.g. `clerk@townofwiley.gov`.
   - **Staff inbox** (`destinationAddress`) — the private inbox where mail should be delivered.
   - **Active** — leave on to forward mail; turn off to stop forwarding without deleting the rule.
   - **Display name**, **Role label**, **Notes** — optional labels for clerks and IT.
6. Click **Save**. You should see a success message. The admin page also **refreshes its CMS snapshot** automatically after save.
7. Send a **test email** to the Town address and confirm it arrives in the correct inbox (allow a few minutes for mail systems to pick up changes).

#### Edit or remove an existing rule

1. In the forwarding table, click **Edit** on the row you need, change fields, and **Save**.
2. To stop forwarding temporarily, edit the rule and turn **Active** off, then save.
3. To delete a rule, click **Delete**, read the warning, and confirm. Deleting stops forwarding until a new rule is added.

#### If the in-app editor will not save

- Confirm you are signed in (the page should say **Signed in — you can save changes below**).
- If you see **Sign in at /admin/login**, open that link and sign in again, then return to **Manage email forwarding**.
- If errors continue, call Town Hall at **(719) 829-4974** so IT can check your staff login or the AppSync **EmailAlias** table.

#### IT fallback (AppSync Console)

If IT asks you to use the AWS console instead: open **EmailAlias** in **Gen 1 AppSync Queries** (`j7b2x3sh…`; link under **Advanced (IT)** on `/admin`) and use the same field names: `aliasAddress`, `destinationAddress`, `active`. See [town-email-alias-forwarding-runbook.md](./town-email-alias-forwarding-runbook.md) for infrastructure details.

---

## Troubleshooting Content Not Updating

Use this when you saved content but the **public website** still looks old after waiting ~30 seconds.

### Step 1 — Refresh the public page normally

On the page residents see (`/news`, `/meetings`, homepage, etc.), press **F5** or reload the tab. The site fetches live content from the database on each visit — a hard refresh is usually **not** required for CMS text changes.

### Step 2 — Force Refresh on `/admin` (verify your view)

At the top of **https://townofwiley.gov/admin** (section **Start here**):

1. Click **Force Refresh Live CMS Content**.
2. Wait for the button to finish (it reloads the latest saved content from the database).
3. Check the tag next to the button — it should show that content is coming from the live database, not an old saved copy in your browser.
4. Open **See on website** and reload the public page.

This button verifies **your** admin session. Other residents already receive live fetches on each visit.

### Step 3 — Clear saved website copy in this browser (rare)

Only if Step 2 shows live data but the public tab still looks wrong **in the same browser**:

1. On `/admin`, scroll to **Advanced (IT)** and open that section.
2. Click **Clear saved website copy** (clears the CMS snapshot stored in this browser’s **localStorage**).
3. Click **Force Refresh Live CMS Content** again at the top.
4. Reload the public page.

This only affects **your** browser on **this computer**.

### When to use `/admin` vs AppSync Queries (IT)

| What you are doing                                                   | Where to work                                                                     |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Notices, events, homepage text, contacts, documents, most task cards | **`/admin`** → **Edit content** (in-app forms)                                    |
| **Email forwarding / proxy** (`EmailAlias`)                          | **`/admin` only** → **Manage email forwarding** (staff sign-in required)          |
| Deep IT troubleshooting, raw GraphQL, inventory counts               | **Advanced (IT)** on `/admin` → **Open content editor** (AppSync Queries console) |
| Legacy AWS console access without `/admin`                           | Ask IT — do not edit production CMS without guidance                              |

### When to call IT

Ask IT if:

- **Force Refresh** fails or the status tag stays on “backup” / error wording
- The in-app form says **not authorized** or **access denied**
- Email forwarding saves in `/admin` but test mail still goes to the wrong inbox (the mail router may need a sync — see [town-email-alias-forwarding-runbook.md](./town-email-alias-forwarding-runbook.md))

**For IT (not day-to-day clerk work):** engineers run `npm run verify:public-cms-query` and `npm run verify:staff-cms-editor-models` in the repo to confirm public queries and clerk editor models (including **SiteCopy**) stay aligned with inventory and Staff auth metadata. Clerks do not need to run these commands.

---

## Part 5 — After Every Change (Five-Minute Check)

After saving any change:

1. Open the public page where the change should appear.
2. Press **F5** (or Ctrl+R) to refresh the page.
3. Read it as a resident would. Ask: does this make sense to someone outside Town Hall?
4. Check spelling.
5. Check dates and times — confirm AM/PM, day of week, and year are correct.
6. Click any phone numbers or email links and make sure they work.
7. If the change is urgent, also check it on your phone using cellular data, not Wi-Fi.

---

## Part 6 — Writing Rules

### Notice titles

Good:

- `Water service interruption on Main Street`
- `Town Hall closing early Friday, April 10`
- `City Council meeting rescheduled to 7:00 PM`

Avoid:

- All caps — `WATER OUTAGE`
- Vague titles — `Update` or `Important notice`
- Internal abbreviations residents would not recognize

### Notice details

Every detail should answer four questions:

1. **What happened?**
2. **Who is affected?**
3. **When does it start and end?**
4. **Who do residents call if they need help?**

Example:

> Water will be shut off on Main Street from 10:00 PM to about 2:00 AM on April 10 while crews repair a broken line. If you have an urgent issue, call Town Hall at (719) 829-4974.

---

## Part 7 — If Something Does Not Work

| Problem                                                             | What to do                                                                                                                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cannot log in to `/admin/login`                                     | Use **Forgot password?** on Cognito; if still blocked, call Town Hall **(719) 829-4974**                                                                 |
| AppSync Queries console shows "Access denied" (IT only)             | Your AWS console permissions need updating — ask IT                                                                                                      |
| Saved a record but nothing changed after 30 seconds                 | See [Troubleshooting Content Not Updating](#troubleshooting-content-not-updating) — hard-refresh, then **Force Refresh Live CMS Content** on `/admin`    |
| You updated email forwarding but mail still goes to the wrong place | Confirm the rule is **Active** in **Manage email forwarding** on `/admin`; send a new test email; if still wrong, the mail router may need IT to re-sync |
| Not sure which model to open                                        | Check the table in Part 3 of this guide                                                                                                                  |
| Hero photo does not appear after saving the URL                     | Make sure the URL starts with `https://` and opens without any login                                                                                     |

---

## Quick Reference Card

Print or screenshot this section and keep it at your desk.

```
LOG IN:   https://townofwiley.gov/admin/login  (Town staff account)
EDIT CMS: https://townofwiley.gov/admin → pick a task → Edit content
PUBLIC:   https://townofwiley.gov

TASK → MODEL (on /admin):
  Homepage text or hero photo   ->  SiteSettings
  Emergency banner              ->  AlertBanner
  Notices and announcements     ->  Announcement
  Meetings and events           ->  Event
  Town Hall / clerk contacts    ->  OfficialContact  (/contact Town Administration)
  Mayor / council / admin roster->  LeadershipRosterEntry  (/contact#leadership + Administration)
  Business directory listings   ->  Business
  Meeting PDFs on /meetings     ->  PublicDocument
  External news links           ->  ExternalNewsLink
  Nav labels & Quick Tasks      ->  SiteCopy
  Email forwarding (staff-only) ->  /admin -> Manage email forwarding

EVERY TIME:
  /admin -> Edit content -> Save -> Force Refresh if needed -> See on website -> Hard-refresh public site
```
