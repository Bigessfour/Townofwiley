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
      '/businesses',
      '/news',
      '/contact',
    ]);

    for (const label of siteContent.navLabels) {
      await expect(homePage.sectionNavLinks.filter({ hasText: label })).toHaveCount(1);
    }

    // Expanded coverage for new pages
    await homePage.page.goto('/businesses');
    await expect(homePage.page.locator('h1')).toContainText('Wiley Community Business Directory');
    await expect(homePage.page.locator('p-card')).toHaveCount(10); // cards + samples

    await homePage.page.goto('/news');
    await expect(homePage.page.locator('h1')).toContainText('Town News and Announcements');
    const newsCardCountInNavTest = await homePage.page.locator('p-card').count();
    expect(newsCardCountInNavTest).toBeGreaterThan(0);
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

    await homePage.searchFor('business directory');
    await expect(homePage.searchResults.first()).toContainText(siteContent.searchMatches.businesses);
    await expect(homePage.searchResults.first()).toHaveAttribute('href', '/businesses');

    await homePage.searchFor('town news');
    await expect(homePage.searchResults.first()).toContainText(siteContent.searchMatches.news);
    await expect(homePage.searchResults.first()).toHaveAttribute('href', '/news');

    await homePage.searchFor('snowmobile permit banana');
    await expect(homePage.searchResults).toHaveCount(0);
    await expect(homePage.emptySearchState).toContainText(siteContent.emptySearchMessage);
  });

  test('verifies buttons trigger logging, colors/fonts/theme match design across pages', async ({ homePage }) => {
    const logs: string[] = [];
    homePage.page.on('console', (msg) => {
      if (msg.type() === 'info' && msg.text().includes('Button')) {
        logs.push(msg.text());
      }
    });

    await homePage.goto();

    // Check fonts and colors on hero/heading (design validation)
    const headingFont = await homePage.page.evaluate(() => {
      const el = document.querySelector('h1');
      return el ? getComputedStyle(el).fontFamily : '';
    });
    expect(headingFont).toContain('Fraunces');

    const civicBlue = await homePage.page.evaluate(() => {
      const el = document.querySelector('h1');
      return el ? getComputedStyle(el).color : '';
    });
    expect(civicBlue).toBe(siteContent.expectedStyles.civicBlue);

    // Test language buttons trigger logging
    const initialLogCount = logs.length;
    await homePage.page.locator('#site-language-es').click();
    expect(logs.length).toBeGreaterThan(initialLogCount);

    // Test business directory buttons/logging
    await homePage.page.goto('/businesses');
    await expect(homePage.page.locator('h1')).toContainText(siteContent.cmsHeadings.businesses);
    const businessLogCount = logs.length;
    await homePage.page.locator('a[href*="tempelgrain"]').first().click();
    expect(logs.length).toBeGreaterThan(businessLogCount);

    await homePage.page.goto('/news');
    await expect(homePage.page.locator('h1')).toContainText(siteContent.cmsHeadings.news);

    const newsCardCount = await homePage.page.locator('p-card').count();
    expect(newsCardCount).toBeGreaterThan(3);

    // Verify design consistency (colors, fonts) on news page too
    const newsHeadingFont = await homePage.page.evaluate(() => {
      const el = document.querySelector('h1');
      return el ? getComputedStyle(el).fontFamily : '';
    });
    expect(newsHeadingFont).toContain('Fraunces');

    const newsCivicBlue = await homePage.page.evaluate(() => {
      const el = document.querySelector('h1');
      return el ? getComputedStyle(el).color : '';
    });
    expect(newsCivicBlue).toBe(siteContent.expectedStyles.civicBlue);
  });
});
