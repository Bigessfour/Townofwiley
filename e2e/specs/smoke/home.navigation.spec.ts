import { expect, test } from '../../fixtures/town.fixture';
import { siteContent } from '../../support/site-content';

test.describe('homepage navigation', () => {
  test('keeps section navigation and skip link usable', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.skipLink).toHaveAttribute('href', '#main-content');
    await expect(homePage.sectionNavLinks).toHaveCount(siteContent.navLabels.length);

    for (const label of siteContent.navLabels) {
      await expect(homePage.sectionNavLinks.filter({ hasText: label })).toHaveCount(1);
    }
  });

  test('supports keyboard skip-link navigation to main content', async ({ homePage }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile-chromium',
      'Desktop covers hardware-keyboard skip-link behavior; mobile emulation is not reliable for that flow.',
    );

    await homePage.goto();

    await homePage.page.keyboard.press('Tab');

    await expect(homePage.skipLink).toBeFocused();

    await homePage.page.keyboard.press('Enter');

    await expect(homePage.page).toHaveURL(/#main-content$/);
    await expect(homePage.mainContent).toBeFocused();
  });

  test('returns useful results from plain-language search prompts', async ({ homePage }) => {
    await homePage.goto();

    await homePage.searchFor('pay water bill');
    await expect(homePage.searchResults.first()).toContainText(siteContent.searchMatches.payments);

    await homePage.searchFor('street outage');
    await expect(homePage.searchResults.first()).toContainText(siteContent.searchMatches.issues);

    await homePage.searchFor('next town meeting');
    await expect(homePage.searchResults.first()).toContainText(siteContent.searchMatches.meetings);

    await homePage.searchFor('community calendar');
    await expect(homePage.searchResults.first()).toContainText(siteContent.searchMatches.calendar);

    await homePage.searchFor('city council 2nd monday');
    await expect(homePage.searchResults.first()).toContainText(siteContent.searchMatches.council);
  });
});
