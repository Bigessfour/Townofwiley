import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../../fixtures/town.fixture';
import { accessibilityRouteContracts } from '../../support/public-routes';

test.describe('homepage accessibility', () => {
  test.describe.configure({ mode: 'serial' });

  for (const publicPage of accessibilityRouteContracts) {
    test(`has no critical or serious axe violations on the ${publicPage.label}`, async ({
      homePage,
    }) => {
      test.setTimeout(90000);

      await homePage.page.goto(publicPage.path, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await expect(homePage.page.locator('#main-content')).toBeVisible();
      // The standalone document hub does not render the standard town header shell
      if (publicPage.standardShell !== false) {
        await expect(homePage.page.locator('a.town-logo[href]')).toBeAttached({ timeout: 15000 });
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
        .disableRules(['aria-valid-attr-value', 'scrollable-region-focusable']) // Upstream PrimeNG DOM anomalies
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
