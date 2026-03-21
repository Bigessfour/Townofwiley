import { expect, test } from '../../fixtures/town.fixture';
import { siteContent } from '../../support/site-content';

test.describe('homepage responsive behavior', () => {
  test('keeps essential resident tasks visible across viewport projects', async ({
    homePage,
  }, testInfo) => {
    await homePage.goto();

    await expect(
      homePage.page.getByText(siteContent.serviceLabels[0], { exact: true }),
    ).toBeVisible();
    await expect(homePage.page.getByText('Accessibility statement', { exact: true })).toBeVisible();

    if (testInfo.project.name === 'mobile-chromium') {
      await expect(homePage.sectionNavLinks.first()).toBeVisible();
      await expect(homePage.searchInput).toBeVisible();
    }
  });
});
