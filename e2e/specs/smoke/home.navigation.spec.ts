import { expect, test } from '../../fixtures/town.fixture';
import { siteContent } from '../../support/site-content';

test.describe('homepage navigation', () => {
  test('keeps section navigation and skip link usable', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.skipLink).toHaveAttribute('href', '#main-content');
    await expect(homePage.sectionNavLinks).toHaveCount(siteContent.navLabels.length);
    await expect(homePage.sectionNavLinks).toHaveText(siteContent.navLabels);

    const navHrefs = await homePage.sectionNavLinks.evaluateAll((links) => {
      return links.map((link) => link.getAttribute('href'));
    });

    expect(navHrefs).toEqual([
      '#top-tasks',
      '/weather',
      '/notices',
      '/meetings',
      '/services',
      '/records',
      '/contact',
    ]);

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
    await expect(homePage.searchResults.first()).toHaveAttribute('href', '/services#payment-help');

    await homePage.searchFor('street outage');
    await expect(homePage.searchResults.first()).toContainText(siteContent.searchMatches.issues);
    await expect(homePage.searchResults.first()).toHaveAttribute('href', '/services#issue-report');

    await homePage.searchFor('city council meeting');
    await expect(homePage.searchResults.first()).toContainText(siteContent.searchMatches.meetings);
    await expect(homePage.searchResults.first()).toHaveAttribute('href', '/meetings');

    await homePage.searchFor('community calendar');
    await expect(homePage.searchResults.first()).toContainText(siteContent.searchMatches.calendar);
    await expect(homePage.searchResults.first()).toHaveAttribute('href', '/meetings');

    await homePage.searchFor('screen reader support');
    await expect(homePage.searchResults.first()).toContainText(
      siteContent.searchMatches.accessibility,
    );
    await expect(homePage.searchResults.first()).toHaveAttribute('href', '/accessibility');

    await homePage.searchFor('city clerk deb dillon');
    await expect(homePage.searchResults.first()).toContainText(siteContent.searchMatches.clerk);
    await expect(homePage.searchResults.first()).toHaveAttribute(
      'href',
      'mailto:deb.dillon@townofwiley.gov',
    );

    await homePage.searchFor('snowmobile permit banana');
    await expect(homePage.searchResults).toHaveCount(0);
    await expect(homePage.emptySearchState).toContainText(siteContent.emptySearchMessage);
  });
});
