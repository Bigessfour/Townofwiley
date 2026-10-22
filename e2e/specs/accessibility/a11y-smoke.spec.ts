import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../../fixtures/town.fixture';
import { accessibilitySmokeRouteContracts } from '../../support/public-routes';

/**
 * Narrow axe smoke for scheduled CI. Full route coverage stays in home.a11y.spec.ts
 * (`npm run test:e2e:regression`).
 */
test.describe('accessibility smoke', () => {
  test.describe.configure({ mode: 'serial' });

  for (const publicPage of accessibilitySmokeRouteContracts) {
    test(`has no critical or serious axe violations on the ${publicPage.label}`, async ({
      homePage,
    }) => {
      test.setTimeout(90000);

      await homePage.page.goto(publicPage.path, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await expect(homePage.page.locator('#main-content')).toBeVisible();
      if (publicPage.standardShell !== false) {
        await expect(homePage.page.locator('.site-header a.town-logo[href]').first()).toBeAttached({
          timeout: 15000,
        });
      }

      const results = await new AxeBuilder({ page: homePage.page })
        .withTags([
          'wcag2a',
          'wcag2aa',
          'wcag21a',
          'wcag21aa',
          'wcag22a',
          'wcag22aa',
          'best-practice',
        ])
        .withRules(['page-has-heading-one'])
        // Upstream PrimeNG DOM anomalies — track on /accessibility until re-enabled.
        .disableRules(['aria-valid-attr-value', 'scrollable-region-focusable'])
        .analyze();

      const impactfulViolations = results.violations.filter((violation) => {
        return violation.impact === 'critical' || violation.impact === 'serious';
      });

      expect(
        impactfulViolations,
        impactfulViolations.map((violation) => `${violation.id}: ${violation.help}`).join('\n\n'),
      ).toEqual([]);
    });
  }
});
