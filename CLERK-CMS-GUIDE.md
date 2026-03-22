# Wiley Website Clerk Guide

This guide is for staff who need to update the Town of Wiley website without editing code.

## What This Page Does

The clerk editor lets you update the main parts of the homepage.

Use it for items such as:

- homepage welcome text
- emergency alerts
- water outages
- street closures
- meeting reminders
- town office schedule changes
- public contact information

## How To Open The Editor

1. Open the website in your browser.
2. Add `/admin` to the end of the website address.

Example:

```text
https://www.townofwiley.gov/admin
```

If you are testing locally, the address may look different, but it will still end with `/admin`.

## What You Will See

The portal includes these main sections:

- Homepage text: the main title and welcome text at the top of the homepage
- Emergency banner: a large alert message shown near the top of the page
- Notices: the announcement cards shown on the homepage
- Contacts: the public contact cards residents use for help

The notice cards still use 3 main fields:

- Notice title: the short headline people see first
- Display date or label: a simple label like `Today`, `This Week`, `March 2026`, or `Until Further Notice`
- Notice detail: the full message residents need to read

You will also see these buttons:

- `Add new notice`: creates a new notice card
- `Save homepage notices`: saves all of your homepage changes
- `Discard local edits`: throws away changes you made since the last save
- `Restore starter notices`: brings back the original sample notices
- `Return to homepage`: takes you back to the public site

## Fastest Way To Post A Notice

1. Open `/admin`.
2. Click `Add new notice`.
3. Type a short, clear title.
4. Add a simple date or time label.
5. Write the message in plain language.
6. Click `Save homepage notices`.
7. Click `Return to homepage` and confirm the notice looks correct.

## How To Post An Emergency Banner

1. Open `/admin`.
2. Go to the `Emergency banner` section.
3. Turn on `Show emergency banner on homepage`.
4. Fill in the banner headline and message.
5. Add a button label and link if needed.
6. Click `Save homepage notices`.
7. Return to the homepage and confirm the alert shows at the top.

## How To Update Contact Information

1. Open `/admin`.
2. Go to the `Public contact cards` section.
3. Edit the name, phone number, email, or help text.
4. Click `Save homepage notices`.
5. Return to the homepage and make sure the contact card looks right.

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

## Best Practices

- Keep titles short
- Keep the first sentence direct
- Use normal everyday wording
- Put the most important fact first
- Double-check phone numbers, dates, and times before saving
- If you turn on the emergency banner, keep it short and urgent

## Avoid These Mistakes

- Do not leave any field blank
- Do not write very long titles
- Do not use internal notes meant only for staff
- Do not assume residents already know the situation
- Do not leave an old emergency banner turned on after the situation ends

## Important Limitation Right Now

At this stage, the editor saves changes in the current browser only.

That means:

- the saved changes stay on the device and browser where you edited them
- another computer may not see the same changes yet
- clearing browser data can remove the saved changes

This is a starter version while the shared AWS-backed publishing system is being built.

## Safe Editing Routine

Every time you update the site:

1. Open `/admin`.
2. Make your changes in the correct section.
3. Click `Save homepage notices`.
4. Return to the homepage.
5. Read the page exactly as a resident would.
6. Fix typos immediately if needed.

## When To Ask For Help

Ask for help if:

- the editor page does not open
- the save message does not appear
- the homepage does not show your updated notice
- you need a new type of content that is not in the portal yet
- you need changes to appear for everyone on all devices

## Short Version

1. Open `/admin`
2. Update the section you need
3. Click `Save homepage notices`
4. Return to the homepage and confirm it looks right
