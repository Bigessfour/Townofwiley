import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../../fixtures/town.fixture';

const publicPages = [
  { path: '/', label: 'landing page' },
  { path: '/weather', label: 'weather page' },
  { path: '/services', label: 'services page' },
  { path: '/records', label: 'records page' },
  { path: '/accessibility', label: 'accessibility page' },
];

test.describe('homepage accessibility', () => {
  for (const publicPage of publicPages) {
    test(`has no critical or serious axe violations on the ${publicPage.label}`, async ({
      homePage,
    }) => {
      await homePage.page.goto(publicPage.path, { waitUntil: 'domcontentloaded' });
      await expect(homePage.page.locator('#main-content')).toBeVisible();

      const results = await new AxeBuilder({ page: homePage.page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const impactfulViolations = results.violations.filter((violation) => {
        return violation.impact === 'critical' || violation.impact === 'serious';
      });

      expect(impactfulViolations).toEqual([]);
    });
  }
});
