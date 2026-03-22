import { expect, test } from '../../fixtures/town.fixture';
import { siteContent } from '../../support/site-content';

test.describe('homepage smoke', () => {
  test('renders the Wiley landing page scaffold', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.page).toHaveTitle(siteContent.documentTitle);
    await expect(homePage.heroHeading).toContainText(siteContent.heading);
    await expect(homePage.weatherPanel).toBeVisible();
    await expect(homePage.weatherHeading).toContainText('National Weather Service forecast');
    await expect(homePage.communityFacts).toHaveCount(3);
    await expect(homePage.topTaskCards).toHaveCount(4);
    await expect(homePage.noticeCards).toHaveCount(3);
    await expect(homePage.serviceCards).toHaveCount(6);
    await expect(homePage.contactCards).toHaveCount(4);
  });

  test('surfaces the expected resident-first tasks', async ({ homePage }) => {
    await homePage.goto();

    for (const label of siteContent.topTaskHeadings) {
      await expect(homePage.topTaskCards.filter({ hasText: label })).toHaveCount(1);
    }
  });
});
