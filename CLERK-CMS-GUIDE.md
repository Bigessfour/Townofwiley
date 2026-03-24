# Wiley Website Daily Clerk Guide

This guide is written for a non-technical Town clerk.

## One CMS Only

There is only one place to change the website each day:


Do not use these to edit live website content:

- the `/admin` page

Those pages can help you find the CMS, but they do not publish changes.

## Start Here Every Time

Use these live links:

- Clerk start page: https://townofwiley.gov/clerk-setup
- Studio home: https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/home
- Data Manager: https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/data

Daily rule:

1. Open the clerk start page.
2. Open Data Manager.
3. Make the change.
4. Save.
5. Refresh the public website and confirm the change.

## What To Edit

If you want to change this site area, open this model in Data Manager:

| If you want to change... | Open this model |
| --- | --- |
| Homepage title or welcome text | `SiteSettings` |
| Emergency banner at the top of the homepage | `AlertBanner` |
| Notice cards or announcements | `Announcement` |
| Meeting or calendar items | `Event` |
| Public phone numbers, emails, or contact cards | `OfficialContact` |
| Private forwarding from a Town email address to a staff inbox | `EmailAlias` |

## Daily Website Tasks

### Post a new notice

Use this for public updates, closures, reminders, and general notices.

1. Open `Announcement`.
2. Create a new record or open the record you want to change.
3. Fill in the title.
4. Fill in the detail.
5. Add the date if it helps residents.
6. Make sure `active` is turned on.
7. Save.
8. Refresh the public site and confirm the notice appears.

### Turn on an emergency banner

Use this only for urgent or highly visible information.

Examples:

- water outage
- road closure
- office closed today
- emergency public safety update

Steps:

1. Open `AlertBanner`.
2. Open the active banner record.
3. Turn `enabled` on.
4. Fill in the short label.
5. Fill in the title.
6. Fill in the detail.
7. Add a link only if residents should click somewhere next.
8. Save.
9. Refresh the homepage and confirm the banner is visible.

### Turn off an emergency banner

1. Open `AlertBanner`.
2. Open the active banner record.
3. Turn `enabled` off.
4. Save.
5. Refresh the homepage and confirm the banner is gone.

### Add or update a meeting or event

1. Open `Event`.
2. Create a new record or open the one you want to change.
3. Enter the event title.
4. Enter the start date and time.
5. Enter the end date and time if known.
6. Add the location.
7. Add a short description if needed.
8. Make sure `active` is turned on.
9. Save.
10. Refresh the public site and confirm the event appears.

### Update public contact information

1. Open `OfficialContact`.
2. Open the record you want to change.
3. Update the public label, phone number, email, or detail text.
4. Save.
5. Refresh the public site and confirm the contact card looks correct.

### Change a Town email forwarding address

This is not a public website card. This is for Town email routing behind the scenes.

Example:

- Public address: `clerk@townofwiley.gov`
- Private destination inbox: a staff member's current email inbox

Steps:

1. Open `EmailAlias`.
2. Open the alias record or create a new one.
3. Set `aliasAddress` to the public Town email address.
4. Set `destinationAddress` to the private inbox that should receive the mail.
5. Turn `active` on.
6. Save.
7. Send a real test email and confirm it reaches the correct inbox.

## Five-Minute Daily Check

After every website change:

1. Refresh the public page.
2. Read it exactly as a resident would.
3. Check spelling.
4. Check dates and times.
5. Check phone numbers and email links.
6. If the change is urgent, check it again on a phone.

## What Not To Do

Do not:

- edit website text in code files
- use `/admin` as if it were the editor
- leave an emergency banner on after the event is over
- create duplicate notices for the same update unless the old one should stay visible
- put a private forwarding inbox in `OfficialContact` unless the Town wants that email shown publicly

## Writing Rules

Good notice titles:

- `Water service interruption on Main Street`
- `Town Hall closing early Friday`
- `City Council meeting moved to 7:00 PM`

Good details:

- say what happened
- say who is affected
- say when it starts
- say when it ends if known
- say who to call if residents need help

Example:

```text
Water will be shut off on Main Street from 10:00 PM to about 2:00 AM while crews repair a broken line. If you have an urgent issue, call Town Hall at (719) 829-4974.
```

## If Something Does Not Work

Ask for help if:

- Amplify Studio will not open
- Data Manager shows an access denied message
- you saved a record and nothing changed on the public site
- an `EmailAlias` record saved but mail is not forwarding
- you are not sure which model to open

## Short Version

Remember this sentence:

- Open Data Manager, edit the correct model, save, then refresh the public site.
