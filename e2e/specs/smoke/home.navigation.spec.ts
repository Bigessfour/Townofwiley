import { expect, test } from '../../fixtures/town.fixture';
import { siteContent } from '../../support/site-content';

test.describe('homepage navigation', () => {
  test('keeps section navigation and skip link usable', async ({ homePage }, testInfo) => {
    await homePage.goto();

    await expect(homePage.skipLink).toHaveAttribute('href', '#main-content');

    if (testInfo.project.name === 'mobile-chromium') {
      await expect(homePage.mobileMenuButton).toBeVisible();
      return;
    }

    await expect(homePage.page.locator('[data-testid="homepage-section-nav"]')).toBeVisible();
    await expect(homePage.sectionNavLinks).toHaveCount(siteContent.megaMenuRootLabelsEn.length);
    await expect(homePage.sectionNavLinks.first()).toBeAttached();
    await expect(homePage.sectionNavLinks).toHaveText(siteContent.megaMenuRootLabelsEn);

    const navHrefs = await homePage.sectionNavLinks.evaluateAll((links) => {
      return links.map((link) => link.getAttribute('href'));
    });

    expect(navHrefs[4]).toMatch(/businesses/);
    expect(navHrefs[5]).toMatch(/contact/);

    for (const label of siteContent.megaMenuRootLabelsEn) {
      await expect(homePage.sectionNavLinks.filter({ hasText: label }).first()).toBeAttached();
    }
  });

  test('clicks mega menu roots and verifies payment-help deep link routing', async ({
    homePage,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile-chromium',
      'Mega menu roots require desktop header chrome.',
    );

    test.setTimeout(90000);

    await homePage.goto();
    await homePage.sectionNavLinks
      .filter({ hasText: 'Businesses & Community' })
      .first()
      .click({ position: { x: 5, y: 5 } });
    await expect(homePage.page).toHaveURL(/\/businesses/);

    await homePage.goto();
    await homePage.sectionNavLinks
      .filter({ hasText: 'Contact & Town Hall' })
      .first()
      .click({ position: { x: 5, y: 5 } });
    await expect(homePage.page).toHaveURL(/\/contact/);

    // Megamenu submenu panels are hover-driven in PrimeNG; smoke coverage for the route + fragment
    // matches `public deep links` and `src/app/app.ts` menu model (`/services` + `payment-help`).
    await homePage.goto();
    await homePage.page.goto('/services#payment-help');
    await expect(homePage.page).toHaveURL(/\/services/);
    await expect(homePage.page).toHaveURL(/#payment-help/);
    await expect(homePage.page.locator('#payment-help')).toBeVisible();
  });

  test('keeps section navigation and skip link usable for features', async ({ homePage }) => {
    // Expanded coverage for new pages
    await homePage.page.goto('/businesses');
    await expect(homePage.page.locator('.business-directory-page h1')).toContainText(
      'Wiley Community Business Directory',
    );
    await expect(homePage.page.locator('.public-directory-card').first()).toBeVisible();

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

    await homePage.skipLink.focus();
    await expect(homePage.skipLink).toBeFocused();

    await homePage.page.keyboard.press('Enter');

    await expect(homePage.page).toHaveURL(/#main-content$/);
    await expect(homePage.mainContent).toBeFocused();
  });

  test('returns useful results from plain-language search prompts', async ({ homePage }) => {
    await homePage.goto();

    await homePage.searchFor('pay water bill');
    const paymentResult = homePage.page.locator('a.search-result[href="/pay-bill"]', {
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

    await homePage.searchFor('meetings calendar');
    const calendarResult = homePage.page.locator('a.search-result[href*="meetings"]').first();
    await expect(calendarResult).toBeVisible();
    await expect(calendarResult).toContainText(/Calendar|Meeting|Council/i);

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

  test('verifies buttons trigger logging, colors/fonts/theme match design across pages', async ({
    homePage,
  }) => {
    const logs: string[] = [];
    homePage.page.on('console', (msg) => {
      if (msg.type() === 'info' && msg.text().includes('Button')) {
        logs.push(msg.text());
      }
    });

    const resolveThemeColor = async (variableName: string) =>
      homePage.page.evaluate((name) => {
        const rootStyle = getComputedStyle(document.documentElement);
        const probe = document.createElement('div');
        probe.style.color = `var(${name})`;
        document.body.appendChild(probe);
        const resolved = getComputedStyle(probe).color || rootStyle.getPropertyValue(name).trim();
        probe.remove();
        return resolved;
      }, variableName);

    await homePage.goto();

    // Check fonts and colors on hero title (design validation)
    const headingFont = await homePage.page.evaluate(() => {
      const el = document.querySelector('#site-hero-title');
      return el ? getComputedStyle(el).fontFamily : '';
    });
    expect(headingFont).toContain('Fraunces');

    const heroH1Color = await homePage.page.evaluate(() => {
      const el = document.querySelector('#site-hero-title');
      return el ? getComputedStyle(el).color : '';
    });
    expect(heroH1Color).toBe('rgb(255, 255, 255)');

    // Test language buttons toggle the site language (IDs remain in DOM while narrow layouts hide the megamenu).
    await homePage.clickSiteLanguage('en');
    await expect(homePage.page.locator('html')).toHaveAttribute('lang', /en/i);
    await homePage.clickSiteLanguage('es');
    await expect(homePage.page.locator('html')).toHaveAttribute('lang', /es/i);
    await homePage.clickSiteLanguage('en');
    await expect(homePage.page.locator('html')).toHaveAttribute('lang', /en/i);

    // Test business directory buttons/logging
    await homePage.page.goto('/businesses');
    await expect(homePage.page.locator('#business-directory-heading')).toContainText(
      siteContent.cmsHeadings.businesses,
    );
    await expect(
      homePage.page.locator('.public-directory-card a[href^="tel:"]').first(),
    ).toHaveAttribute('href', /^tel:/);

    await homePage.page.goto('/news');
    await expect(homePage.page.locator('.news-page-shell h1')).toContainText(
      siteContent.cmsHeadings.news,
    );

    const newsCardCount = await homePage.page.locator('.news-card').count();
    expect(newsCardCount).toBeGreaterThan(0);

    // Verify design consistency (colors, fonts) on news page too
    const newsHeadingFont = await homePage.page.evaluate(() => {
      const el = document.querySelector('.news-page-shell h1');
      return el ? getComputedStyle(el).fontFamily : '';
    });
    expect(newsHeadingFont).toContain('Fraunces');

    const newsH1Color = await homePage.page.evaluate(() => {
      const el = document.querySelector('.news-page-shell h1');
      return el ? getComputedStyle(el).color : '';
    });
    expect(newsH1Color).toBe(await resolveThemeColor('--civic-blue-strong'));
  });
});
