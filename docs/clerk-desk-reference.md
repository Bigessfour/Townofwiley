# Clerk desk reference — Town website

One-page reference for Town Hall staff. **Admin pages are English only.** The public site (townofwiley.gov) stays bilingual — fill Spanish fields in the editor when they appear.

## Bookmarks

| Page                      | URL                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff sign-in             | https://townofwiley.gov/admin/login                                                                                                                                                                                                                                                                        |
| Update website (task hub) | https://townofwiley.gov/admin                                                                                                                                                                                                                                                                              |
| Content editor (AWS)      | Use https://townofwiley.gov/admin → "Content editor URL" (Gen 2 AppSync console: https://us-east-2.console.aws.amazon.com/appsync/home?region=us-east-2#/x7poehudqvamneqni5s6e2cjxy/v1/queries ; search "townofwiley"). Gen 1 AppSync j7b2x3sh7rcezekekkxxiak7hi and Amplify ID d331voxr1fhoir are legacy. |

## Every update (same steps)

1. Open **https://townofwiley.gov/admin**
2. Pick a task → **Edit content** → save in the AWS editor
3. **See on website** → hard-refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
4. Still wrong? Call Town Hall **(719) 829-4974**

## Common tasks

| I want to…                   | Task on /admin                        | Editor model          |
| ---------------------------- | ------------------------------------- | --------------------- |
| Post news or notice          | Post news or notice                   | Announcement          |
| Add meeting                  | Add meeting or event                  | Event                 |
| Change homepage photo/text   | Change homepage photo or welcome text | SiteSettings          |
| Add a PDF/form               | Add a form or PDF                     | PublicDocument        |
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

## Uploads (optional)

Sign in at `/admin/login` first.

- **Homepage photo:** use “Upload homepage photo” on `/admin`, copy the web address into **Photo web address** in SiteSettings.
- **Newsletter PDF:** upload on `/admin`, copy the **file code** into the newsletter Announcement row (ask IT if unsure).

## Help

- Full guide: [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md)
- IT troubleshooting: open **Advanced and IT troubleshooting** at the bottom of `/admin`
