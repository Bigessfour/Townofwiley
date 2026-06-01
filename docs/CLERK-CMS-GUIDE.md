# Wiley Website Clerk Guide

This guide is written for the Town Clerk or any staff member who manages the Wiley website. No technical knowledge is needed. Every step is explained exactly as written.

**Technical map (for IT or training):** see [CMS-MODEL-ROUTE-MATRIX.md](./CMS-MODEL-ROUTE-MATRIX.md) for which Studio models feed which pages, and [CMS-STUDIO-OPERATIONS-CHECKLIST.md](./CMS-STUDIO-OPERATIONS-CHECKLIST.md) for AWS-side checks.

**Verify CMS is working (Studio + website):** follow [CMS-VERIFY-STUDIO.md](./CMS-VERIFY-STUDIO.md) — about five minutes, no code required.

---

## Part 1 — Get Access (Do This Once)

### Step 1 — Ask for an invitation

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

The admin page is a **task hub** in plain English: pick what you want to change, click **Edit content**, save in the AWS editor, then **See on website** and hard-refresh. It also has document publishing help, resident message review, and optional file uploads. **Clerk screens are English only**; the public site stays bilingual — fill Spanish fields in the editor when they appear.

Quick reference: [clerk-desk-reference.md](./clerk-desk-reference.md)

### Step 4 — Bookmark Amplify Console Data manager

| Link | What it is |
|------|------------|
| [Amplify Console — Data manager](https://us-east-2.console.aws.amazon.com/amplify/apps/d331voxr1fhoir/branches/main/data) | Edit CMS records (SiteSettings, Announcement, Event, etc.) on the **main** branch |

Task cards on `/admin` open the right model when possible (`…/data/models/Announcement`, etc.).

### Step 5 — Log in to the Town admin hub

1. Open **https://townofwiley.gov/admin/login** (bookmark this page).
2. Enter your **Town staff email** and **password**.
3. **First time only:** If IT gave you a temporary password, sign in with it; the site will ask you to choose a new password.
4. After sign-in, open **https://townofwiley.gov/admin** and use the task buttons (**Edit content**, **See on website**).

**Forgot your password?**

1. On `/admin/login`, click **Forgot password?**
2. Enter your staff email and click **Send reset code**.
3. Check your inbox (and spam) for a verification code from Amazon Cognito.
4. Enter the code and a new password (at least 8 characters), then sign in with the new password.

If you do not receive the email or do not have an account yet, call Town Hall at **(719) 829-4974** so IT can help.

**Amplify Console Data manager** (Step 4) uses your **AWS console** login, not this Town staff password. Clerks who only edit CMS records in Data Manager still need the `/admin/login` account when using contact updates and other staff-only tabs on the website.

---

## Part 2 — The Basics You Need to Know

### Where you make changes

All website content is managed in one place: **Amplify Console Data manager**.

Direct link: https://us-east-2.console.aws.amazon.com/amplify/apps/d331voxr1fhoir/branches/main/data

Start here if you are not sure where to go: https://townofwiley.gov/admin

The admin page is a guide and status page. It shows whether the public website is reading saved content, but **edits happen in Amplify Console Data manager** (opened from each task’s **Edit content** button).

**Do not** try to edit the website from:

- The `/admin` page itself — use its Data Manager button to open the real editor
- Code files — leave those alone entirely
- Any other tool

### How changes work

When you save a record in Data Manager, the website automatically shows the new content within a few seconds. You do not need to click "publish" or "deploy."

### When IT changes payment or other website settings (not Studio)

Some features—utility bill pay links, weather signup, chatbot—are controlled by **Amplify environment variables**, not by Data Manager. After your IT contact changes those settings, they must **redeploy the `main` branch** in Amplify Hosting. Until that finishes, the public site may still show old behavior.

**What you should do after IT says a deploy is done:**

1. Open the page you care about (for example `/pay-bill` or `/services`).
2. **Hard-refresh** so your browser loads the new settings: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac). On a phone, close the tab completely and open the site again.
3. If something still looks wrong, tell IT the date/time you checked—they compare the live site file `/runtime-config.js` to Amplify (see `docs/amplify-deployment-runbook.md`).

### The rule for every change

1. Open Data Manager.
2. Find the right model (explained in the table below).
3. Create or edit the record.
4. Save.
5. Refresh the public website and check what residents see.

---

## Part 3 — What Each Model Controls

Every piece of content on the website lives in one of these models in Data Manager.

| What you are updating                                      | Open this model    |
| ---------------------------------------------------------- | ------------------ |
| Homepage title, welcome text, and hero photo               | `SiteSettings`     |
| Emergency banner shown at the top of the homepage          | `AlertBanner`      |
| Public notices, closures, and general announcements        | `Announcement`     |
| Meetings, hearings, and calendar events                    | `Event`            |
| Staff contact cards for names, phones, and emails          | `OfficialContact`  |
| Mayor/Council and Town Administration bullets on `/contact` | `LeadershipRosterEntry` |
| Business directory listings                                | `Business`         |
| Public document archive for forms, guides, and downloads   | `PublicDocument`   |
| External news links shown on the /news page                | `ExternalNewsLink` |
| Town email forwarding rules for behind-the-scenes delivery | `EmailAlias`       |

### Important: two contact cards use fixed record IDs

The website looks up the **Town Hall** block and **City Clerk** block by the **`id`** field on `OfficialContact` (not by the person’s name in the title). In Amplify Studio, keep these exact IDs:

| `id` field (exact) | Purpose                                                                               |
| ------------------ | ------------------------------------------------------------------------------------- |
| `town-information` | Main Town Hall phone block used in the site footer, services, and accessibility pages |
| `city-clerk`       | Clerk email/phone used on Permits and related contact panels                          |

If you delete one of these records and create a new row with a different `id`, the site may show fallback wording until IT restores the IDs.

### Field names that match the database (use these in Studio)

- **AlertBanner:** `enabled`, `label`, `title`, `detail`, `linkLabel`, **`linkHref`** (the button link is **linkHref**, not “link URL”).
- **OfficialContact:** **`label`**, **`value`**, **`detail`**, **`href`** (mailto: or tel:), **`linkLabel`**, **`displayOrder`**. The **`id`** is the stable key in the table above.
- **Announcement:** `title`, `detail`, `date` (`YYYY-MM-DD`), `active`, **`priority`** (number — lower sorts first among bulletin notices), **`announcementKind`** (leave blank for short bulletins; type **`newsletter`** in lowercase for the long newsletter block on `/news`), **`attachmentKey`** (S3 file path for a newsletter PDF — see [Announcement fields explained](#announcement-fields-explained-announcementkind-attachmentkey-priority-and-imageurl) below), **`imageUrl`** (optional full `https://` image link — see same section).

---

## Part 4 — Step-by-Step Tasks

### Post a new public notice or announcement

Use this for closures, reminders, utility updates, and general public notices.

1. Open [Data Manager](https://us-east-2.console.aws.amazon.com/amplify/apps/d331voxr1fhoir/branches/main/data) (Amplify Console → branch **main** → **Data** → **Data manager**).
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

### Post a town newsletter (long-form update on /news)

Use this when the Clerk publishes a column or multi-paragraph update that should appear in the **Town newsletter** section instead of the short bulletin cards.

1. Open **Announcement** in Data Manager and create or edit a record.
2. Fill **title** and **detail** as usual (detail can be long; use a blank line between paragraphs for separate blocks on the website when no PDF is attached yet).
3. Set **announcementKind** to the word **`newsletter`** in all lowercase (no spaces). If this field is missing in your form, ask your IT contact to confirm the CMS schema is deployed.
4. (Recommended) Set **attachmentKey** to the **exact S3 storage key** for the newsletter PDF so residents can open it inline on `/news`. Ask IT to upload the PDF to Town storage using the same folder pattern as other newsletters (for example `documents/newsletter/2026-05-town-newsletter.pdf`). Copy the full path IT gives you — it is **not** a `https://` link and it is **not** the same as a file name alone. See [Announcement fields explained](#announcement-fields-explained-announcementkind-attachmentkey-priority-and-imageurl). If you leave **attachmentKey** blank, residents still see the written **detail**, but they will not get the embedded PDF viewer until a key is added.
5. Set **date** to the issue date (`YYYY-MM-DD`). The live site treats the newest active newsletter by date as the one to feature.
6. Set **priority** if IT asks you to coordinate ordering; see the same reference section.
7. Set **active** to **true** and save.
8. Refresh `https://townofwiley.gov/news` and confirm the entry appears under **Newsletter from Town Hall** and that the PDF opens if you set **attachmentKey**.

Short utility notices should leave **announcementKind** blank so they stay in **Current Wiley Updates**.

### Announcement fields explained: announcementKind, attachmentKey, priority, and imageUrl

Use this table when you are unsure what to type in optional **Announcement** fields in Data Manager.

| Field                | What it is                                                                                         | What you should enter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **announcementKind** | Tells the website which layout to use on `/news`.                                                  | Leave **empty** (or blank) for normal short bulletins in **Current Wiley Updates**. Type exactly **`newsletter`** (lowercase) for the long **Newsletter from Town Hall** block. Do not invent other words unless engineering has documented them — other values behave like a normal notice.                                                                                                                                                                                                                                      |
| **attachmentKey**    | The **storage object key** (internal file path) for a **newsletter PDF** in Town document storage. | **Only when `announcementKind` is `newsletter`.** Ask IT to upload the finished PDF and send you the full key. It always starts with `documents/newsletter/` and ends with the file name, for example `documents/newsletter/2026-05-town-newsletter.pdf`. Paste that entire path into **attachmentKey** with no spaces. Do **not** paste a Google Drive edit link, a `mailto:` link, or only the file name by itself. If you are not publishing a PDF yet, leave this field blank — the site will still show the **detail** text. |
| **priority**         | A whole number used to **sort** announcements before the site shows them.                          | For **short notices** (blank `announcementKind`), **smaller numbers appear first** (for example `1` is ahead of `5`). Use `1`–`3` for urgent items and larger numbers (such as `10`, `20`) for routine reminders so you can insert new items later. For **newsletters** (`newsletter`), the primary ordering on `/news` is the **date** field; priority is still stored but date is what decides which issue is treated as the newest — ask IT if you need a specific priority convention.                                        |
| **imageUrl**         | A full public web address pointing to an **image** file.                                           | Must start with **`https://`** and should point directly to an image (for example `.jpg`, `.png`, or `.webp`) that opens **without logging in**. **Current website note:** the live homepage timeline, `/news` bulletin cards, and `/notices` cards show **title**, **date**, and **detail** only — they do **not** yet display this image on screen, even if you fill the field. You can safely leave **imageUrl** blank unless IT has told you a specific page or future update will use it.                                    |

### Add or refresh regional news links (Wiley / Prowers coverage)

Outside stories are **ExternalNewsLink** records, not automatic web crawling. Staff adds links to articles that mention Wiley, CO, or Prowers County; they appear under **Stories mentioning Wiley or Prowers County**.

1. Open **ExternalNewsLink** in Data Manager.
2. Create a record with **title**, **url**, **source** (e.g. newspaper name), **active** true, and **displayOrder** if you need a fixed order.
3. Save and confirm on `/news`.

### Remove or archive a notice

1. Open **Announcement** in Data Manager.
2. Find the notice you want to hide.
3. Open it and change **active** to **false**.
4. Click **Save**.
5. Refresh the /news page and confirm the notice is gone.

Do not delete the record unless you are certain it should be permanently removed. Turning `active` off is safe and reversible.

### Turn on an emergency banner

Use this only for urgent, time-sensitive information that every visitor needs to see immediately.

Examples: water outage, unplanned office closure, road closure, emergency public safety update.

1. Open **AlertBanner** in Data Manager.
2. Open the banner record (there is usually one existing record to reuse).
3. Change **enabled** to **true**.
4. Fill in **label** — one to three words, like `Water Outage` or `Office Closed`.
5. Fill in **title** — a short sentence, like `Water service interrupted on Main Street`.
6. Fill in **detail** — one or two sentences explaining what happened and when it will resolve.
7. (Optional) If you want a clickable button on the banner: fill in **linkLabel** with the button text (like `Call Town Hall`) and **linkHref** with the destination. For a phone number use `tel:+17198294974`. For a web page use the full address starting with `https://`.
8. Click **Save**.
9. Refresh the homepage and confirm the banner appears at the top.

### Turn off an emergency banner

1. Open **AlertBanner** in Data Manager.
2. Open the banner record.
3. Change **enabled** to **false**.
4. Click **Save**.
5. Refresh the homepage and confirm the banner is gone.

**Always turn the banner off when the event is over.** Leaving it on causes residents to ignore future alerts.

### Add or change a meeting or event

1. Open **Event** in Data Manager.
2. Click **Create event** or open an existing one.
3. Fill in **title** — for example `City Council Regular Meeting`.
4. Fill in **start** — the full date and time in this format: `2026-05-06T19:00:00`.
5. Fill in **end** if the end time is known.
6. Fill in **location** — for example `Wiley Town Hall, 304 Main Street`.
7. Fill in **description** — one sentence about the meeting, or leave it blank.
8. Set **active** to **true**.
9. Click **Save**.
10. Refresh the /meetings page and confirm the event appears.

To cancel or hide an event, open it and set **active** to **false**.

### Update a contact card (staff names, phones, emails)

1. Open **OfficialContact** in Data Manager.
2. Find the contact you want to update and open it.
3. Update any of these fields:
   - **label** — the role title shown on the card, like `City Clerk`
   - **value** — the person's name or main phone number
   - **detail** — a short sentence describing what this person handles
   - **href** — the button destination. For a phone: `tel:+17198294974`. For email: `mailto:name@townofwiley.gov`. For a web page, use the full `https://` address.
   - **linkLabel** — the button text residents will see, like `Call` or `Send email`
4. Click **Save**.
5. Refresh the /contact page and confirm the update.

To add a new contact, click **Create officialContact** and fill in all fields.

### Mayor and City Council roster (bullet list under leadership on /contact)

The **Mayor and Council** and **Town Administration** bullet lists on `/contact` come from the **`LeadershipRosterEntry`** model when at least one **active** row exists for that section. If Studio has no rows yet, the site keeps the bundled lines from the app (same names as today).

**What you do as Clerk**

1. Open **LeadershipRosterEntry** in Data Manager.
2. Click **Create** (or open an existing row).
3. Set **groupId** to exactly one of these keys (copy/paste):
   - `mayor-council` — bullets under **Mayor and Council** / **Alcalde y concejo**
   - `town-administration` — bullets under **Town Administration** / **Administracion del pueblo**
4. Set **displayOrder** — lower numbers appear first (for example 10, 20, 30 so you can insert lines later).
5. Fill **lineEn** and **lineEs** — one line per record, for example English `Mayor: Pat Garcia` and Spanish `Alcalde: Pat Garcia`.
6. Set **active** to **true** and save.
7. Refresh `/contact` and switch the site language to confirm both languages.

To remove someone from the list, either set **active** to **false** or delete the row. To replace the whole section from Studio, every visible bullet must have its own **LeadershipRosterEntry** row for that **groupId** (the site replaces the whole bullet list for that section when any CMS lines exist).

**Do not confuse this with OfficialContact**

The **`OfficialContact`** rows control the **clickable contact cards** higher on the contact page. **`LeadershipRosterEntry`** only drives the **non-clickable** roster bullets in the leadership blocks below.

### Change the homepage hero photo

The hero is the large photo at the top of the homepage.

1. Find a public photo web address. This must be a full web address (starting with `https://`) that anyone can open in a browser without logging in. You can get one by uploading a photo to Google Photos and setting sharing to "anyone with the link", or any public file sharing service.
2. Copy the full web address of the photo.
3. Open **SiteSettings** in Data Manager.
4. Open the one settings record.
5. Paste the photo web address into **heroImageUrl**.
6. Click **Save**.
7. Refresh the homepage and confirm the new photo appears.

To go back to the default photo, clear the **heroImageUrl** field (delete the address) and save.

### Update homepage text (title, welcome message)

1. Open **SiteSettings** in Data Manager.
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

1. Open **Business** in Data Manager.
2. Click **Create business** or open an existing one.
3. Fill in **name**, **phone**, and **address**.
4. (Optional) Fill in **website** — must be a full URL starting with `https://`.
5. (Optional) Fill in **description** — one or two sentences about the business.
6. Set **active** to **true**.
7. Set **displayOrder** — this controls the order businesses appear in the list. Lower numbers show up first. Using 10, 20, 30 makes it easy to fit a new business in between later.
8. Click **Save**.
9. Refresh the /businesses page and confirm the listing appears.

### Add a public document (for the /documents page)

**Post-migration (CMS-only):** The `/documents` hub reads **only** active `PublicDocument` rows from AppSync. There is no repo manifest to edit. Optional **titleEs**, **summaryEs**, and **statusEs** supply Spanish labels when residents switch the site to Español (English fields are used when Spanish is blank). After you save in Studio, open `/documents` once (hard refresh if needed); the page refreshes the catalog on each visit and when a resident returns to the tab—no website redeploy is required for new rows.

1. Open **PublicDocument** in Data Manager.
2. Click **Create publicDocument**.
3. Fill in **title** — the document name residents will see.
4. Fill in **summary** — one sentence describing what it is.
   4a. (Optional) Fill in **titleEs**, **summaryEs**, and **statusEs** for the Spanish site.
5. Fill in **sectionId** — this decides which section of the documents page it appears under. Use one of these exact values:
   - `records-requests` — records requests and public forms
   - `meeting-documents` — meeting packets, agendas, and minutes
   - `financial-documents` — budgets, audits, and finance documents
   - `code-references` — ordinances, codes, and reference guides
6. Fill in **href** — how residents open the file. Use a full **https://** address that works without logging in, **or** the **storage key** (or `storage:` + key) your IT contact gives you after uploading to Town document storage (see **Upload a City Council agenda packet** below).
7. Fill in **format** — the file type or delivery type, for example `PDF`, `DOCX`, or `Web link`.
8. Fill in **status** — the publishing state, for example `Current`, `Draft`, or `Archived`.
9. Set **active** to **true** so residents can see it on the live site.
10. Set **displayOrder** if needed — lower numbers appear higher in the list.
11. Click **Save**.
12. Open `/documents` and confirm the document appears in the correct section (hard refresh once if you do not see it immediately; other residents see it on their next visit or when returning to the tab).

### Upload a City Council agenda packet for public viewing

Use this when the Council packet is a **PDF** (or similar file) that residents should open from the **Meeting documents & agendas** area on the documents page (`https://townofwiley.gov/documents`, section **Meeting documents & agendas**). The same listing also feeds resident search and document-hub shortcuts that point people toward meeting materials.

**Before you start**

1. Finalize the packet as one file (usually **PDF**). Use a clear filename such as `2026-05-12-city-council-agenda-packet.pdf` so residents recognize the meeting date when they download it.
2. The file must live where the website can reach it. You have two supported options:
   - **Option A — Town document storage (recommended):** Ask your IT or website contact to upload the file into Amplify **Storage** under the meeting-documents path. Uploaded files use this pattern: `documents/meeting-documents/<unique-name>.pdf` (the system may add numbers to the name so every upload stays unique). After upload, they should give you the **full storage key** (everything from `documents/` through the filename).
   - **Option B — Public link:** If the packet is already hosted as a stable **https://** link that anyone can open without logging in, you can use that full address instead.

**Create the `PublicDocument` record in Data Manager**

1. Open **PublicDocument** in Data Manager and click **Create publicDocument** (or open an existing row to replace an old packet).
2. **title** — Use a resident-facing headline, for example `City Council agenda packet — May 12, 2026`.
3. **summary** — One sentence, for example `Agenda, resolutions packet, and supporting materials for the regular council meeting.`
4. **sectionId** — Type exactly: `meeting-documents` (this is the only value that puts the file under **Meeting documents & agendas** on `/documents`).
5. **href** — Paste one of the following (do not invent a path; use what IT gave you):
   - The **storage key** from Option A, for example `documents/meeting-documents/1737123456789-2026-05-12-city-council-agenda-packet.pdf`, **or**
   - The prefix form `storage:` plus that key (some records use this; both work on the live site), **or**
   - The full **https://** URL from Option B.
6. **format** — Usually `PDF`.
7. **status** — Use `Current` or `Published` so residents know it is the active packet (match whatever your office already uses for other meeting files).
8. **downloadFileName** — Optional but helpful: the filename residents should see when they save the file, for example `2026-05-12-city-council-agenda-packet.pdf`.
9. **keywords** — Optional. If your Data Manager form supports it, add a few plain words (for example `city council`, `agenda`, `may 2026`) so site search can find the packet. If you are not sure how to enter keywords, skip this field or ask your IT contact.
10. Set **active** to **true**.
11. Set **displayOrder** if you need this packet to appear above older meeting rows in the same section (lower numbers appear first, same rule as other documents).
12. Click **Save**.

**Check it on the website**

1. Open `https://townofwiley.gov/documents` and scroll to **Meeting documents & agendas** (or use the anchor `https://townofwiley.gov/documents#meeting-documents`).
2. Click your new title and confirm the PDF opens.
3. Open `https://townofwiley.gov/meetings` and confirm any calendar text still matches the meeting date; if the agenda button should point residents to the hub, your IT contact can align that with the document hub (see [town-document-publishing-guide.md](./town-document-publishing-guide.md) only if staff still maintain separate static archive files — most day-to-day packets should use this **PublicDocument** flow in Studio).

**If something goes wrong**

- If the row saves but the link does nothing or errors, the **href** is usually wrong (typo in the key, file never uploaded, or a private link). Send the exact **href** string and the filename to your IT contact; they can verify the file in Storage or re-upload.
- Do **not** paste a long Google Docs **edit** link that requires a login. Residents need a **public** PDF or **https** download.

### Add an external news link (for /news "From Other Sources")

1. Open **ExternalNewsLink** in Data Manager.
2. Click **Create externalNewsLink**.
3. Fill in **title** — a short description, like `Lamar Ledger — Wiley and Prowers County Coverage`.
4. Fill in **url** — the full website address residents should open, like `https://www.lamarledger.com/`.
5. Fill in **source** — the publication name shown with the link, like `Lamar Ledger`.
6. Set **active** to **true**.
7. Click **Save**.
8. Refresh the /news page and confirm it appears under "From Other Sources."

### Change where a Town email address delivers mail

This controls where mail sent to a public Town address (like `clerk@townofwiley.gov`) actually lands. Residents never see this — it is purely behind the scenes.

Example: mail sent to `clerk@townofwiley.gov` gets quietly forwarded to Deb's personal work inbox.

1. Open **EmailAlias** in Data Manager.
2. Find the forwarding entry you want to update, or click **Create emailAlias** to add a new one.
3. In **aliasAddress**, type the public Town email address residents send mail to — for example `clerk@townofwiley.gov`.
4. In **destinationAddress**, type the private staff inbox where that mail should be delivered — for example the staff member's actual email address.
5. Set **active** to **true**.
6. Click **Save**.
7. Send a real test email to the Town address and confirm it arrives in the correct inbox.

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

| Problem                                                             | What to do                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Cannot log in to Amplify Studio                                     | Ask for a new invitation email from your IT contact                  |
| Data Manager shows "Access denied"                                  | Your account permissions need updating — ask for help                |
| Saved a record but nothing changed after 30 seconds                 | Hold Shift and press F5 to force-refresh, then check again           |
| You updated email forwarding but mail still goes to the wrong place | The routing function may need to re-sync — ask for help              |
| Not sure which model to open                                        | Check the table in Part 3 of this guide                              |
| Hero photo does not appear after saving the URL                     | Make sure the URL starts with `https://` and opens without any login |

---

## Quick Reference Card

Print or screenshot this section and keep it at your desk.

```
LOG IN:   https://townofwiley.gov/admin/login  (Town staff — contact updates)
EDIT CMS: https://us-east-2.console.aws.amazon.com/amplify/apps/d331voxr1fhoir/branches/main/data
PUBLIC:   https://townofwiley.gov

WHAT TO OPEN IN DATA MANAGER:
  Homepage text or hero photo   ->  SiteSettings
  Emergency banner              ->  AlertBanner
  Notices and announcements     ->  Announcement
  Meetings and events           ->  Event
  Staff contact cards           ->  OfficialContact
  Business directory listings   ->  Business
  Public documents              ->  PublicDocument
  External news links           ->  ExternalNewsLink
  Email forwarding (where Town addresses deliver)  ->  EmailAlias

EVERY TIME:
  Open Data Manager -> Edit the correct model -> Save -> Refresh the public site
```
