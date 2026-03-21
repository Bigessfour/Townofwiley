import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../../fixtures/town.fixture';

test.describe('homepage accessibility', () => {
  test('has no critical or serious axe violations on the landing page', async ({ homePage }) => {
    await homePage.goto();

    const results = await new AxeBuilder({ page: homePage.page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const impactfulViolations = results.violations.filter((violation) => {
      return violation.impact === 'critical' || violation.impact === 'serious';
    });

    expect(impactfulViolations).toEqual([]);
  });
});
