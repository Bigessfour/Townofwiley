import { expect, test } from '../fixtures/town.fixture';

/**
 * Minimal environment seed for `npx playwright init-agents` / playwright-test-generator workflows.
 * Keeps a passing smoke check without duplicating full homepage coverage.
 */
test.describe('playwright agent seed', () => {
  test('loads the Angular shell for generator tooling', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.mainContent).toBeVisible();
    await expect(homePage.heroHeading).toBeVisible();
  });
});
