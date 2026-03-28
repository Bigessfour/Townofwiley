import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../../fixtures/town.fixture';

const publicPages = [
  { path: '/', label: 'landing page' },
  { path: '/notices', label: 'notices page' },
  { path: '/meetings', label: 'meetings page' },
  { path: '/weather', label: 'weather page' },
  { path: '/services', label: 'services page' },
  { path: '/records', label: 'records page' },
  { path: '/businesses', label: 'businesses page' },
  { path: '/news', label: 'news page' },
  { path: '/contact', label: 'contact page' },
  { path: '/accessibility', label: 'accessibility page' },
  { path: '/documents', label: 'documents page' },
];

test.describe('homepage accessibility', () => {
  test.describe.configure({ mode: 'serial' });

  for (const publicPage of publicPages) {
    test(`has no critical or serious axe violations on the ${publicPage.label}`, async ({
      homePage,
    }) => {
      test.setTimeout(90000);

      await homePage.page.goto(publicPage.path, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await expect(homePage.page.locator('#main-content')).toBeVisible();
      // Angular's RouterLink sets href asynchronously via a host binding. Waiting for
      // the town-logo anchor to have its href attribute confirms that Angular has
      // completed its first full lifecycle (router hydration + all @if renders).
      await expect(homePage.page.locator('a.town-logo[href]')).toBeAttached({ timeout: 15000 });

      const results = await new AxeBuilder({ page: homePage.page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
        .disableRules(['aria-valid-attr-value', 'scrollable-region-focusable']) // Upstream PrimeNG DOM anomalies
        .analyze();

      const impactfulViolations = results.violations.filter((violation) => {
        return violation.impact === 'critical' || violation.impact === 'serious';
      });

      expect(
        impactfulViolations,
        impactfulViolations
          .map((violation) => `${violation.id}: ${violation.help}`)
          .join('\n\n'),
      ).toEqual([]);
    });
  }
});
