import { expect, test } from '../../fixtures/town.fixture';
import { siteContent } from '../../support/site-content';

test.describe('homepage navigation', () => {
  test('keeps section navigation and skip link usable', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.skipLink).toHaveAttribute('href', '#main-content');
    await expect(homePage.sectionNavLinks.first()).toBeVisible();
    await expect(homePage.sectionNavLinks).toHaveText(siteContent.navLabels);

    const navHrefs = await homePage.sectionNavLinks.evaluateAll((links) => {
      return links.map((link) => link.getAttribute('href'));
    });

    expect(navHrefs).toEqual([
      '/#top-tasks',
      '/weather',
      '/notices',
      '/meetings',
      '/services',
      '/records',
      '/documents',
      '/accessibility',
      '/businesses',
      '/news',
      '/contact',
    ]);

    for (const label of siteContent.navLabels) {
      await expect(homePage.sectionNavLinks.filter({ hasText: label }).first()).toBeVisible();
    }

    // Expanded coverage for new pages
    await homePage.page.goto('/businesses');
    await expect(homePage.page.locator('.business-directory-page h1')).toContainText(
      'Wiley Community Business Directory',
    );
    await expect(homePage.page.locator('.public-directory-card')).toHaveCount(10);

    await homePage.page.goto('/news');
    await expect(homePage.page.locator('.news-page-shell h1')).toContainText(
      'Town News and Announcements',
    );
    const newsCardCountInNavTest = await homePage.page.locator('.news-card').count();
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
    const paymentResult = homePage.page.locator('a.search-result[href="/services#payment-help"]', {
      hasText: siteContent.searchMatches.payments,
    });
    await expect(paymentResult.first()).toBeVisible();

    await homePage.searchFor('street outage');
    const issueResult = homePage.page.locator('a.search-result[href="/services#issue-report"]', {
      hasText: siteContent.searchMatches.issues,
    });
    await expect(issueResult.first()).toBeVisible();

    await homePage.searchFor('city council meeting');
    const meetingResult = homePage.page.locator('a.search-result[href="/meetings"]', {
      hasText: siteContent.searchMatches.meetings,
    });
    await expect(meetingResult.first()).toBeVisible();

    await homePage.searchFor('community calendar');
    const calendarResult = homePage.page.locator('a.search-result[href="/meetings"]', {
      hasText: siteContent.searchMatches.calendar,
    });
    await expect(calendarResult.first()).toBeVisible();

    await homePage.searchFor('screen reader support');
    const accessibilityResult = homePage.page.locator('a.search-result[href="/accessibility"]', {
      hasText: siteContent.searchMatches.accessibility,
    });
    await expect(accessibilityResult.first()).toBeVisible();

    await homePage.searchFor('city clerk deb dillon');
    const clerkResult = homePage.page.locator(
      'a.search-result[href="mailto:deb.dillon@townofwiley.gov"]',
      {
        hasText: siteContent.searchMatches.clerk,
      },
    );
    await expect(clerkResult.first()).toBeVisible();

    await homePage.searchFor('business directory');
    const businessResult = homePage.page.locator('a.search-result[href="/businesses"]', {
      hasText: siteContent.searchMatches.businesses,
    });
    await expect(businessResult.first()).toBeVisible();

    await homePage.searchFor('town news');
    const newsResult = homePage.page.locator('a.search-result[href="/news"]', {
      hasText: siteContent.searchMatches.news,
    });
    await expect(newsResult.first()).toBeVisible();

    await homePage.searchFor('snowmobile permit banana');
    await expect(homePage.searchResults).toHaveCount(0);
    await expect(homePage.emptySearchState).toContainText(siteContent.emptySearchMessage);
  });

  test('shows visit website actions only for verified business links', async ({ homePage }) => {
    await homePage.page.goto('/businesses');

    await expect(homePage.page.locator('a[href*="example.com"]')).toHaveCount(0);

    const mountainViewCard = homePage.page.locator('article.public-directory-card', {
      hasText: 'Mountain View Cafe',
    });
    const townPharmacyCard = homePage.page.locator('article.public-directory-card', {
      hasText: 'Town Pharmacy',
    });

    await expect(mountainViewCard.getByRole('link', { name: 'Visit website' })).toHaveCount(0);
    await expect(townPharmacyCard.getByRole('link', { name: 'Visit website' })).toHaveCount(0);
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
    expect([siteContent.expectedStyles.civicBlue, 'rgb(19, 36, 62)']).toContain(civicBlue);

    // Test language buttons trigger logging
    const initialLogCount = logs.length;
    await homePage.page.locator('#site-language-es').click();
    expect(logs.length).toBeGreaterThan(initialLogCount);

    // Test business directory buttons/logging
    await homePage.page.goto('/businesses');
    await expect(homePage.page.locator('#business-directory-heading')).toContainText(
      siteContent.cmsHeadings.businesses,
    );
    const businessLogCount = logs.length;
    await homePage.page.locator('a[href*="tempelgrain"]').first().click();
    expect(logs.length).toBeGreaterThan(businessLogCount);

    await homePage.page.goto('/news');
    await expect(homePage.page.locator('.news-page-shell h1')).toContainText(siteContent.cmsHeadings.news);

    const newsCardCount = await homePage.page.locator('.news-card').count();
    expect(newsCardCount).toBeGreaterThan(0);

    // Verify design consistency (colors, fonts) on news page too
    const newsHeadingFont = await homePage.page.evaluate(() => {
      const el = document.querySelector('.news-page-shell h1');
      return el ? getComputedStyle(el).fontFamily : '';
    });
    expect(newsHeadingFont).toContain('Fraunces');

    const newsCivicBlue = await homePage.page.evaluate(() => {
      const el = document.querySelector('.news-page-shell h1');
      return el ? getComputedStyle(el).color : '';
    });
    expect([siteContent.expectedStyles.civicBlue, 'rgb(19, 36, 62)']).toContain(newsCivicBlue);
  });
});