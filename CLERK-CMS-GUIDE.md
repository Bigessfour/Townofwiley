# Wiley Website CMS Guide

This guide is for staff who need to update the Town of Wiley homepage without editing code.

## What Changed

The old browser-only editor is gone.

Homepage publishing now happens in Amplify Studio. The website reads the shared CMS content from AWS so the same update appears for everyone.

The `/admin` page still exists, but it is now only a reminder page. It does not save homepage changes.

## Where To Edit The Site

Live Town CMS links:

- Clerk setup page: https://townofwiley.gov/clerk-setup
- Studio home: https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/home
- Data Manager: https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/data

1. Sign in to the AWS console.
2. Open the clerk setup page above first.
3. Open Data Manager for the app.
4. Edit the record you need.
5. Save the record.
6. Refresh the public homepage and confirm the update.

## First Sign-In Notes

- The clerk setup page is the cleanest shareable link for Deb Dillon.
- These links are for the live `Townofwiley` Amplify app in `us-east-2`.
- The clerk needs an AWS console login that can open Amplify Studio for the Town AWS account.
- There are currently no separate CMS-only Cognito users provisioned for Studio access.
- If the clerk does not already have AWS console access, provision that first and then send the Studio home link.

## Which Record Controls What

- `SiteSettings`: homepage title, welcome copy, and top-of-page text
- `AlertBanner`: the emergency banner near the top of the homepage
- `Announcement`: notice cards on the homepage
- `Event`: the public calendar cards and featured event timing on the homepage
- `OfficialContact`: public contact cards
- `EmailAlias`: private town email forwarding rules used by AWS mail routing

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

## How To Publish A Calendar Event

1. Open Amplify Studio.
2. Open the `Event` model.
3. Create a new record or edit an existing one.
4. Enter the event title.
5. Add the event start time.
6. Add the end time if you know it.
7. Add the location and a short description if needed.
8. Mark the event as active.
9. Save the record.
10. Refresh the homepage and confirm the event appears in the calendar section.

## How To Add Or Change A Town Email Alias

Use this when the Town wants residents to keep using a `townofwiley.gov` address while the message forwards to a staff member's current inbox.

Example:

- Public alias: `steve.mckitrick@townofwiley.gov`
- Current destination inbox: `bigessfour@gmail.com`

Important:

- `OfficialContact` is public and appears on the website.
- `EmailAlias` is private and is only used by the AWS mail-forwarding system.
- Do not put a private forwarding destination in `OfficialContact` unless the Town actually wants that inbox shown on the public website.

Steps:

1. Open Amplify Studio.
2. Open the `EmailAlias` model.
3. Create a new record or edit the existing record for that mailbox.
4. Set `aliasAddress` to the public Town email address.
5. Set `destinationAddress` to the staff member's current inbox.
6. Set `active` to on.
7. Fill in `displayName` if you want the forwarded message to show a clearer sender label.
8. Fill in `roleLabel` if you want the forwarded message to include the staff role.
9. Use `notes` for anything future staff should know about that mailbox.
10. Save the record.
11. Send a test email to the public alias and confirm it reaches the right inbox.

## How To Turn Off A Town Email Alias

1. Open Amplify Studio.
2. Open the `EmailAlias` model.
3. Open the alias record.
4. Turn `active` off.
5. Save the record.
6. Tell staff the alias is disabled until it is corrected or replaced.

## Email Alias Field Reference

- `aliasAddress`: the public `townofwiley.gov` email residents use
- `destinationAddress`: the private inbox that should receive forwarded mail
- `displayName`: optional sender label for the forwarded message
- `roleLabel`: optional staff role included in forwarding metadata
- `active`: turns forwarding on or off for that alias
- `notes`: internal-only context for future staff

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
- a saved `EmailAlias` record does not forward after a live test message
- you need a new content type that is not in the current models
- the homepage falls back to old starter content instead of the shared CMS data
