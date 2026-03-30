# Wiley Website Clerk Guide

This guide is written for the Town Clerk or any staff member who manages the Wiley website. No technical knowledge is needed. Every step is explained exactly as written.

---

## Part 1 — Get Access (Do This Once)

### Step 1 — Ask for an invitation

You need an invitation before you can log in. Contact the person who manages the website (your IT contact or the person who set this up) and ask them to invite you to Amplify Studio for the `townofwiley` app.

They will send you an email from AWS with the subject **"You are invited to collaborate on an application in AWS Amplify Studio"**.

### Step 2 — Accept the invitation

1. Open the invitation email.
2. Click the **Accept invitation** button.
3. It will open a page in your web browser.
4. Create a password. Write it down and keep it somewhere safe.
5. You will land on the Amplify Studio home page.

If the link has expired (they expire after 24 hours), ask for a new invitation.

### Step 3 — Bookmark your two links

Bookmark both of these links in your browser now. You will use them every time.

| Link | What it is |
| --- | --- |
| [Studio Home](https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/home) | Starting page for Amplify Studio |
| [Data Manager](https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/data) | Where you edit all website content |

### Step 4 — Log in for the first time

1. Go to the Studio Home link above.
2. It will ask for your email and password.
3. Enter the ones you created in Step 2.
4. You are in. You do not need a full AWS account. This is its own login.

---

## Part 2 — The Basics You Need to Know

### Where you make changes

All website content is managed in one place: **Data Manager**.

Direct link: https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/data

**Do not** try to edit the website from:
- The `/admin` page on the public website — that is a read-only status page
- Code files — leave those alone entirely
- Any other tool

### How changes work

When you save a record in Data Manager, the website automatically shows the new content within a few seconds. You do not need to click "publish" or "deploy."

### The rule for every change

1. Open Data Manager.
2. Find the right model (explained in the table below).
3. Create or edit the record.
4. Save.
5. Refresh the public website and check what residents see.

---

## Part 3 — What Each Model Controls

Every piece of content on the website lives in one of these models in Data Manager.

| What you are updating | Open this model |
| --- | --- |
| Homepage title, welcome text, and hero photo | `SiteSettings` |
| Emergency banner shown at the top of the homepage | `AlertBanner` |
| Public notices, closures, and general announcements | `Announcement` |
| Meetings, hearings, and calendar events | `Event` |
| Staff contact cards for names, phones, and emails | `OfficialContact` |
| Business directory listings | `Business` |
| Public document archive for forms, guides, and downloads | `PublicDocument` |
| External news links shown on the /news page | `ExternalNewsLink` |
| Town email forwarding rules for behind-the-scenes delivery | `EmailAlias` |

---

## Part 4 — Step-by-Step Tasks

### Post a new public notice or announcement

Use this for closures, reminders, utility updates, and general public notices.

1. Open [Data Manager](https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/data).
2. Click **Announcement** in the left sidebar.
3. Click **Create announcement** (top-right button).
4. Fill in **title** — keep it short and clear, like a headline.
5. Fill in **detail** — explain what happened, who is affected, and when.
6. Fill in **date** — use the format `YYYY-MM-DD`, for example `2026-04-15`.
7. Set **active** to **true** (toggle it on).
8. Set **priority** — lower numbers appear first. Use `1` for the most urgent notice, `10` for a routine update.
9. (Optional) Paste a public photo web address into **imageUrl** if you have a relevant photo.
10. Click **Save**.
11. Open https://townofwiley.gov/news in a new browser tab, refresh it, and confirm the notice appears.

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

1. Open **PublicDocument** in Data Manager.
2. Click **Create publicDocument**.
3. Fill in **title** — the document name residents will see.
4. Fill in **summary** — one sentence describing what it is.
5. Fill in **sectionId** — this decides which section of the documents page it appears under. Use one of these exact values:
   - `records-requests` — records requests and public forms
   - `meeting-documents` — meeting packets, agendas, and minutes
   - `financial-documents` — budgets, audits, and finance documents
   - `code-references` — ordinances, codes, and reference guides
6. Fill in **href** — the document link residents will open. It must be a full web address that works without logging in.
7. Fill in **format** — the file type or delivery type, for example `PDF`, `DOCX`, or `Web link`.
8. Fill in **status** — the publishing state, for example `Current`, `Draft`, or `Archived`.
9. Set **active** to **true** so residents can see it on the live site.
10. Set **displayOrder** if needed — lower numbers appear higher in the list.
11. Click **Save**.
12. Refresh the /documents page and confirm the document appears in the correct section.

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

| Problem | What to do |
| --- | --- |
| Cannot log in to Amplify Studio | Ask for a new invitation email from your IT contact |
| Data Manager shows "Access denied" | Your account permissions need updating — ask for help |
| Saved a record but nothing changed after 30 seconds | Hold Shift and press F5 to force-refresh, then check again |
| You updated email forwarding but mail still goes to the wrong place | The routing function may need to re-sync — ask for help |
| Not sure which model to open | Check the table in Part 3 of this guide |
| Hero photo does not appear after saving the URL | Make sure the URL starts with `https://` and opens without any login |

---

## Quick Reference Card

Print or screenshot this section and keep it at your desk.

```
LOG IN:   https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/home
EDIT:     https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/data
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
