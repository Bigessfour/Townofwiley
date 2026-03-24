# E2E Test Project

This project uses Playwright to validate the Town of Wiley website end to end.

## Goals

- Keep smoke coverage for every deploy.
- Verify accessibility on critical resident-facing pages.
- Support desktop and mobile test projects from one config.
- Make future pages easy to add through page objects, shared fixtures, and content fixtures.

## Structure

```text
e2e/
  fixtures/
    town.fixture.ts
  pages/
    home.page.ts
  specs/
    accessibility/
    responsive/
    smoke/
  support/
    site-content.ts
```

## Commands

```bash
npm run test:e2e:install
npm run test:e2e
npm run test:e2e:smoke
npm run test:e2e:headed
npm run test:e2e:ui
```

## Local vs Remote Runs

- Local default: starts `ng serve` automatically at `http://127.0.0.1:4300`.
- Override the local port with `E2E_PORT` if you need a different isolated test port.
- Remote deployment: set `E2E_BASE_URL` and run against Amplify.

PowerShell example:

```powershell
$env:E2E_BASE_URL = 'https://main.d331voxr1fhoir.amplifyapp.com'
npm run test:e2e:smoke
```

## Expansion Plan

- Add page objects for payments, meetings, records, permits, and contact flows.
- Add API-backed test data when real services are connected.
- Add visual regression checks for high-value templates once branding stabilizes.
- Add authenticated admin or clerk workflows in a separate fixture tree if a CMS or service portal is introduced.
- Add contract tests around forms, notifications, and external payment redirects when those integrations go live.

## Recommended Coverage Layers

- Smoke: homepage, core links, no broken critical UI.
- Accessibility: axe checks on every public template.
- Workflows: payments, issue reporting, records requests, permit requests.
- Responsive: mobile and desktop task completion.
- Content integrity: notices, meetings, and emergency messaging visibility.
