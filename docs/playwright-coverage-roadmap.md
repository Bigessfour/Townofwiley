# Playwright Coverage Roadmap

This repo already covers core homepage navigation, search, chatbot flows, weather refresh, weather signup, language toggles, and a few feature-page links. The next Playwright work should focus on higher-value interactive flows that are still uncovered.

## Highest-Priority Gaps

- Resident services form submissions and panel toggles.
- Business directory contact actions such as call buttons, map links, and site links.
- Accessibility report form interactions and submit behavior.
- Records and document discovery links inside the CMS-driven pages.
- Additional chat dialog open/close and keyboard interaction coverage.

## Recommended Next Specs

1. `e2e/specs/smoke/resident-services-forms.spec.ts`
2. `e2e/specs/smoke/business-directory.spec.ts`
3. `e2e/specs/smoke/accessibility-barrier-report.spec.ts`
4. `e2e/specs/smoke/records-center.spec.ts`
5. `e2e/specs/smoke/news-links.spec.ts`
6. Extend `e2e/specs/smoke/home.chat.spec.ts` for dialog controls and Escape handling

## Reuse Existing Patterns

- Keep shared setup in `e2e/fixtures/town.fixture.ts`.
- Keep repeated controls in page objects under `e2e/pages/`.
- Use user-facing locators, web-first assertions, and route mocks.
- Validate new flows with `npm run test:e2e:smoke` before widening to the full suite.
