# Clerk desk reference — Town website

One-page reference for Town Hall staff. **Admin pages are English only.** The public site (townofwiley.gov) stays bilingual — fill Spanish fields in the editor when they appear.

## Bookmarks

| Page                      | URL                                                                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff sign-in             | https://townofwiley.gov/admin/login                                                                                                                                                           |
| Update website (task hub) | https://townofwiley.gov/admin                                                                                                                                                                 |
| Content editor (AWS)      | https://townofwiley.gov/admin → Content editor URL, or [AppSync Queries j7b2…](https://us-east-2.console.aws.amazon.com/appsync/home?region=us-east-2#/j7b2x3sh7rcezekekkxxiak7hi/v1/queries) |

## Every update (same steps)

1. Open **https://townofwiley.gov/admin**
2. Pick a task → **Edit content** → save in the on-page form
3. **See on website** → hard-refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
4. Still wrong? Call Town Hall **(719) 829-4974**

## Common tasks

| I want to…                   | Task on /admin                        | Editor model          |
| ---------------------------- | ------------------------------------- | --------------------- |
| Post news or notice          | Post news or notice                   | Announcement          |
| Add meeting                  | Add meeting or event                  | Event                 |
| Change homepage photo/text   | Change homepage photo or welcome text | SiteSettings          |
| Publish meeting agenda/minutes | Upload a meeting agenda or packet     | PublicDocument        |
| Update Town Hall phone/email | Update Town Hall or clerk contact     | OfficialContact       |
| Update mayor/council list    | Update mayor and council list         | LeadershipRosterEntry |
| Update businesses            | Update business directory             | Business              |
| Outside news link            | Add outside news link                 | ExternalNewsLink      |
| Emergency strip on homepage  | Turn on emergency banner              | AlertBanner           |

## Spanish on the public site

- **Leadership roster:** fill **English line** and **Spanish line** (`lineEn` / `lineEs`).
- **Documents:** use **Title (Spanish)** and **Summary (Spanish)** when shown.
- **Notices:** use Spanish title/body fields when your editor shows them.
- Clerk help text on `/admin` stays English; residents still switch language on the public site.

## Publish a scanned town newsletter (PDF on /news)

Sign in at `/admin/login` first.

1. **Post news or notice** → **Edit content**
2. Fill **Title** and a short **Detail** summary (for screen readers if the PDF fails to load)
3. **Kind** → **Newsletter (PDF on /news)**
4. **Newsletter PDF** → choose the PDF file (or paste the file code if IT uploaded it for you)
5. Confirm **Date** and turn **Show on website** on → **Save to website**
6. Open **See on website** for News → hard-refresh **Cmd+Shift+R** / **Ctrl+Shift+R**
7. Confirm the PDF preview appears under **Newsletter from Town Hall**

## Publish a meeting agenda (PDF on /meetings)

Sign in at `/admin/login` first.

1. **Add meeting or event** → **Edit content** → enter title, start date/time, active on → save
2. Scroll to **Document publishing** → **Upload a meeting agenda or packet**
3. Select the meeting, choose the PDF, click **Upload and publish**
4. Open **See on website** for Meetings → hard-refresh **Cmd+Shift+R** / **Ctrl+Shift+R**
5. Click **View agenda** on that row — the PDF should open in a new tab

If no PDF is posted yet, the button shows a short “not yet available” message instead of leaving the page.

Full procedure: [CMS_MEETING_AGENDA.md](./CMS_MEETING_AGENDA.md)

## Other uploads (optional)

- **Homepage photo:** use “Upload homepage photo” on `/admin`, copy the web address into **Photo web address** in SiteSettings.
- **Other document requests:** email **clerk@townofwiley.gov** (Contact page) — meeting PDFs use the upload steps above.

## Help

- Full guide: [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md)
- IT troubleshooting: open **Advanced and IT troubleshooting** at the bottom of `/admin`
