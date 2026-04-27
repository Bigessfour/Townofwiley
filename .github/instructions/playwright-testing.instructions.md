---
description: "Use when working on Playwright e2e tests, page objects, fixtures, locators, trace debugging, or flaky test repairs in this repo."
name: "Playwright Testing Standards"
applyTo:
  - "playwright.config.ts"
  - "e2e/**/*.ts"
---
# Playwright Testing Standards

- Keep tests in `e2e/specs/`, shared page objects in `e2e/pages/`, and test setup in `e2e/fixtures/`.
- Prefer user-facing locators first: `getByRole`, `getByLabel`, `getByText`, and `getByTestId`.
- Avoid brittle CSS or XPath selectors unless there is no better contract.
- Use Playwright's web-first assertions such as `toBeVisible`, `toHaveText`, and `toHaveURL`.
- Keep each test isolated and deterministic; reuse fixtures instead of depending on prior tests.
- Prefer repo fixtures and route mocks for stable data over live third-party dependencies.
- Use `playwright.config.ts` as the source of truth for base URL, retries, projects, and artifact settings.
- Debug failures with trace, screenshot, and video artifacts before changing test flow.
- Keep helper logic in page objects or fixtures when it is reused across tests.
- Match the existing local workflow: `npm run test:e2e`, `npm run test:e2e:smoke`, `npm run test:e2e:headed`, and `npm run test:e2e:ui`.