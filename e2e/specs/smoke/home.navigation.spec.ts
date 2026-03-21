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

  test('returns useful results from plain-language search prompts', async ({ homePage }) => {
    await homePage.goto();

    await homePage.searchFor('pay water bill');
    await expect(homePage.searchResults.first()).toContainText(siteContent.searchMatches.payments);

    await homePage.searchFor('street outage');
    await expect(homePage.searchResults.first()).toContainText(siteContent.searchMatches.issues);

    await homePage.searchFor('next town meeting');
    await expect(homePage.searchResults.first()).toContainText(siteContent.searchMatches.meetings);
  });
});
