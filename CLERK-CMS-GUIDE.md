# Wiley Website CMS Guide

This guide is for staff who need to update the Town of Wiley homepage without editing code.

## What Changed

The old browser-only editor is gone.

Homepage publishing now happens in Amplify Studio. The website reads the shared CMS content from AWS so the same update appears for everyone.

The `/admin` page still exists, but it is now only a reminder page. It does not save homepage changes.

## Where To Edit The Site

1. Sign in to the AWS console.
2. Open the Amplify app for Town of Wiley.
3. Open Amplify Studio or the Data Manager for the app.
4. Edit the record you need.
5. Save the record.
6. Refresh the public homepage and confirm the update.

## Which Record Controls What

- `SiteSettings`: homepage title, welcome copy, and top-of-page text
- `AlertBanner`: the emergency banner near the top of the homepage
- `Announcement`: notice cards on the homepage
- `OfficialContact`: public contact cards

## Fastest Way To Post A Notice

1. Open Amplify Studio.
2. Open the `Announcement` model.
3. Create a new record or edit an existing one.
4. Fill in the title and detail.
5. Mark the notice as active.
6. Save the record.
7. Refresh the homepage and confirm the notice looks right.

## How To Post An Emergency Banner

1. Open Amplify Studio.
2. Open the `AlertBanner` model.
3. Turn `enabled` on.
4. Fill in the label, headline, and message.
5. Save the record.
6. Refresh the homepage and confirm the banner appears.

## How To Update Contact Information

1. Open Amplify Studio.
2. Open the `OfficialContact` model.
3. Edit the name, phone number, email, or help text.
4. Save the record.
5. Refresh the homepage and confirm the card looks right.

## Writing Tips

Good notice titles:

- `Water service interruption on Main Street`
- `Town Hall closing early Friday`
- `City Council meeting moved to 7:00 PM`

Good date labels:

- `Today`
- `Tonight`
- `This Week`
- `April 3, 2026`
- `Until Further Notice`

Good notice details:

- say what happened
- say who is affected
- say when it starts
- say when it ends, if known
- say who to call if residents need help

Example:

```text
Water will be shut off on Main Street from 10:00 PM to about 2:00 AM while crews repair a broken line. If you have an urgent issue, call Town Hall at (719) 829-4974.
```

## Safe Publishing Routine

Every time you update the site:

1. Make the change in Amplify Studio.
2. Save the record.
3. Refresh the public homepage.
4. Read the page exactly as a resident would.
5. Fix typos or stale alerts immediately if needed.

## Important Reminder

Do not rely on `/admin` to publish content.

That page is now read-only guidance. All real homepage publishing happens in Amplify Studio.

## When To Ask For Help

Ask for help if:

- Amplify Studio does not open
- a saved record does not appear on the homepage after refresh
- you need a new content type that is not in the current models
- the homepage falls back to old starter content instead of the shared CMS data
