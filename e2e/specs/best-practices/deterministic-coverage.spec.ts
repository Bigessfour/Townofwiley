import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../fixtures/town.fixture';
import { mockDirectNwsRoutes, mockWeatherProxyRoute } from '../../support/weather-mocks';

async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function readHeaderControlMetrics(locator: Locator): Promise<
  {
    height: number;
    minHeight: number;
    fontSize: number;
    lineHeight: number;
    letterSpacing: string;
  }[]
> {
  return locator.evaluateAll((elements) =>
    elements.map((element) => {
      const styles = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      return {
        height: rect.height,
        minHeight: Number.parseFloat(styles.minHeight),
        fontSize: Number.parseFloat(styles.fontSize),
        lineHeight: Number.parseFloat(styles.lineHeight),
        letterSpacing: styles.letterSpacing,
      };
    }),
  );
}

function expectNormalizedHeaderMetrics(
  metrics: {
    height: number;
    minHeight: number;
    fontSize: number;
    lineHeight: number;
    letterSpacing: string;
  }[],
): void {
  expect(metrics.length).toBeGreaterThan(0);

  for (const metric of metrics) {
    expect(metric.height).toBeGreaterThanOrEqual(44);
    expect(metric.minHeight).toBeGreaterThanOrEqual(44);
    expect(metric.fontSize).toBeGreaterThanOrEqual(12);
    expect(metric.fontSize).toBeLessThanOrEqual(16);
    expect(metric.lineHeight).toBeGreaterThanOrEqual(metric.fontSize * 1.15);
    expect(metric.letterSpacing).toBe('normal');
  }
}

const useVisualSnapshots =
  process.platform === 'win32' || process.env.PLAYWRIGHT_VISUAL_SNAPSHOTS === '1';

test.describe('deterministic regression coverage', () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-chromium',
      'These deterministic contracts are authored for the desktop baseline project.',
    );
  });

  test('captures the homepage section navigation accessibility tree', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.page.getByTestId('homepage-section-nav')).toMatchAriaSnapshot(`
      - navigation "Homepage sections":
        - link "Top Tasks":
          - /url: /#top-tasks
        - link "Weather":
          - /url: /weather
        - link "Notices":
          - /url: /notices
        - link "Meetings":
          - /url: /meetings
        - link "Services":
          - /url: /services
        - link "Records":
          - /url: /records
        - link "Documents":
          - /url: /documents
        - link "Accessibility":
          - /url: /accessibility
        - link "Businesses":
          - /url: /businesses
        - link "News":
          - /url: /news
        - link "Contact":
          - /url: /contact
    `);
  });

  test('captures the site-language accessibility group', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.page.getByRole('group', { name: 'Site language' })).toMatchAriaSnapshot(`
      - group "Site language":
        - button "ES"
        - button "EN" [pressed]
    `);
  });

  test('keeps the default homepage free of emergency alert copy', async ({ homePage }) => {
    await mockDirectNwsRoutes(homePage.page, []);
    await homePage.goto();

    await expect(homePage.siteAlert).toHaveCount(0);
    await expect(homePage.page.getByText('Urgent town update')).toHaveCount(0);
    await expect(homePage.page.getByText('Weather alerts load here')).toHaveCount(0);
  });

  test('keeps header controls on normalized desktop sizing', async ({ homePage }) => {
    await mockDirectNwsRoutes(homePage.page, []);
    await homePage.goto();
    await waitForFonts(homePage.page);

    expectNormalizedHeaderMetrics(await readHeaderControlMetrics(homePage.sectionNavLinks));
    expectNormalizedHeaderMetrics(
      await readHeaderControlMetrics(homePage.page.locator('.header-meta-link')),
    );
    expectNormalizedHeaderMetrics(
      await readHeaderControlMetrics(
        homePage.page.getByRole('group', { name: 'Site language' }).getByRole('button'),
      ),
    );
    expectNormalizedHeaderMetrics(
      await readHeaderControlMetrics(homePage.page.getByRole('button', { name: 'Search' })),
    );
  });

  test('keeps header controls on normalized mobile sizing', async ({ homePage }) => {
    await mockDirectNwsRoutes(homePage.page, []);
    await homePage.page.setViewportSize({ width: 375, height: 667 });
    await homePage.goto();
    await waitForFonts(homePage.page);

    await expect(homePage.page.getByTestId('homepage-section-nav')).toBeHidden();
    await expect(homePage.page.locator('.desktop-mega-menu')).toBeHidden();
    await expect(homePage.page.locator('.mobile-menu-bar')).toBeVisible();
    expectNormalizedHeaderMetrics(
      await readHeaderControlMetrics(homePage.page.locator('.mobile-menu-button')),
    );
    expectNormalizedHeaderMetrics(
      await readHeaderControlMetrics(
        homePage.page.getByRole('group', { name: 'Site language' }).getByRole('button'),
      ),
    );
  });

  test('keeps the homepage hero visually stable', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.goto();
    await waitForFonts(homePage.page);

    await expect(homePage.page.getByTestId('homepage-hero')).toHaveScreenshot('homepage-hero.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.02,
    });
  });

  test('keeps the weather summary card visually stable', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.enableWeatherProxy('/mock-weather-visual');
    await homePage.enableAlertSignup('/mock-alert-signup');
    await mockWeatherProxyRoute(homePage.page, '/mock-weather-visual', {
      locationLabel: 'Wiley, CO',
      updatedAt: '2026-03-22T12:57:10+00:00',
      periods: [
        {
          name: 'Today',
          startTime: '2026-03-22T09:00:00-06:00',
          isDaytime: true,
          temperature: 67,
          temperatureUnit: 'F',
          probabilityOfPrecipitation: { value: 1 },
          windSpeed: '15 to 20 mph',
          windDirection: 'NE',
          icon: null,
          shortForecast: 'Partly Sunny',
          detailedForecast: 'Partly sunny, with a high near 67. Northeast wind 15 to 20 mph.',
        },
        {
          name: 'Tonight',
          startTime: '2026-03-22T18:00:00-06:00',
          isDaytime: false,
          temperature: 36,
          temperatureUnit: 'F',
          probabilityOfPrecipitation: { value: 1 },
          windSpeed: '5 to 15 mph',
          windDirection: 'ESE',
          icon: null,
          shortForecast: 'Mostly Cloudy',
          detailedForecast: 'Mostly cloudy, with a low around 36.',
        },
      ],
      alerts: [
        {
          event: 'High Wind Warning',
          headline: 'High Wind Warning for Prowers County.',
          severity: 'Severe',
          urgency: 'Immediate',
          instruction: 'Avoid unnecessary travel.',
          expires: '2026-03-22T20:00:00-06:00',
        },
      ],
    });

    await homePage.page.goto('/weather', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.getByTestId('weather-current-card')).toContainText('Partly Sunny');
    await expect(homePage.page.getByRole('heading', { name: '7-day forecast' })).toBeVisible();
    await expect(
      homePage.page.getByRole('heading', { name: 'Active watches, warnings, and advisories' }),
    ).toBeVisible();

    await expect(homePage.page.getByTestId('weather-current-card')).toHaveScreenshot(
      'weather-current-card.png',
      {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.02,
      },
    );
  });

  test('filters external news coverage against a fixed clock', async ({ homePage }) => {
    await homePage.page.clock.setFixedTime(new Date('2026-04-12T12:00:00-06:00'));
    await homePage.page.goto('/news', { waitUntil: 'domcontentloaded' });

    const externalNewsCards = homePage.page.locator('.news-card--external');

    await expect(externalNewsCards).toHaveCount(1);
    await expect(externalNewsCards.first()).toContainText('Lamar Ledger');
    await expect(externalNewsCards.first()).toContainText('Wiley and Prowers County Coverage');
    await expect(homePage.page.getByText('Prowers County Community Event')).toHaveCount(0);
  });

  test('business directory snapshot', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Snapshots are opt-in outside win32.');
    await homePage.page.goto('/businesses', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('app-business-directory')).toHaveScreenshot(
      'business-directory.png',
      {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.05,
      },
    );
  });
});

test.describe('homepage section visual coverage', () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-chromium',
      'These deterministic contracts are authored for the desktop baseline project.',
    );
  });

  test('keeps site header visually stable on desktop', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.goto();
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('.site-header')).toHaveScreenshot('header-desktop.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.02,
    });
  });

  test('keeps site header visually stable on mobile', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.page.setViewportSize({ width: 375, height: 667 });
    await homePage.goto();
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('.site-header')).toHaveScreenshot('header-mobile.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.03,
    });
  });

  test('keeps top-tasks grid visually stable', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.goto();
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('#top-tasks')).toHaveScreenshot('top-tasks-grid.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.02,
    });
  });

  test('keeps feature-hub cards visually stable', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.goto();
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('.feature-hub')).toHaveScreenshot('feature-hub.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.03,
    });
  });

  test('keeps support strip visually stable', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.goto();
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('.support-strip')).toHaveScreenshot('support-strip.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.02,
    });
  });

  test('keeps calendar panel visually stable', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.page.clock.setFixedTime(new Date('2026-04-12T12:00:00-06:00'));
    await homePage.page.goto('/meetings', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('.calendar-panel')).toHaveScreenshot('calendar-panel.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.03,
    });
  });
});

test.describe('feature panel visual coverage', () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-chromium',
      'These deterministic contracts are authored for the desktop baseline project.',
    );
  });

  test('notices panel snapshot', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.page.clock.setFixedTime(new Date('2026-04-12T12:00:00-06:00'));
    await homePage.page.goto('/notices', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('#alerts')).toHaveScreenshot('notices-panel.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.05,
    });
  });

  test('meetings list panel snapshot', async ({ homePage }) => {
    // Calendar datepicker renders the live month name — aria-snapshot the list panel only.
    await homePage.page.clock.setFixedTime(new Date('2026-04-12T12:00:00-06:00'));
    await homePage.page.goto('/meetings', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page.locator('[aria-labelledby="meetings-heading"]'))
      .toMatchAriaSnapshot(`
      - paragraph: Meetings and Calendar
      - heading "Meeting access and community updates" [level=2]
      - article:
        - strong: Town council regular meeting
        - text: Every second Monday at 6:00 PM
        - paragraph: Wiley Town Hall, 304 Main Street
        - text: In person at Wiley Town Hall with agenda materials posted ahead of time.
        - paragraph: Residents can call Town Hall at (719) 829-4974 or email the clerk before the meeting if they want to be placed on the agenda.
        - link "Open calendar":
          - /url: /meetings#calendar
      - article:
        - strong: Planning and zoning review
        - text: First Thursday at 5:30 PM
        - paragraph: Wiley Town Hall, 304 Main Street
        - text: Public hearing for planning, zoning, and land use items.
        - paragraph: Agenda packets, hearing notices, and filing deadlines should stay linked from the calendar entry.
        - link "View meeting details":
          - /url: /meetings#calendar
      - article:
        - strong: Community deadlines and service updates
        - text: Seasonal notices and recurring town reminders
        - paragraph: Town-wide notices and service locations
        - text: A rolling summary for cleanup days, closures, utility interruptions, and other timing updates.
        - paragraph: Use this space for community items that are easier to follow on a calendar.
        - link "Browse notices":
          - /url: /notices
      - link "Open the full town calendar":
        - /url: "#calendar"
    `);
  });

  test('services panel snapshot', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.page.goto('/services', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('#services')).toHaveScreenshot('services-panel.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('records panel snapshot', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.page.goto('/records', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('#records')).toHaveScreenshot('records-panel.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('accessibility panel snapshot', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.page.goto('/accessibility', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('#accessibility')).toHaveScreenshot(
      'accessibility-panel.png',
      {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.01,
      },
    );
  });

  test('contact panel snapshot', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.page.goto('/contact', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('#contact')).toHaveScreenshot('contact-panel.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.005,
    });
  });

  test('news page snapshot', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.page.clock.setFixedTime(new Date('2026-04-12T12:00:00-06:00'));
    await homePage.page.goto('/news', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('app-news')).toHaveScreenshot('news-page.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.05,
    });
  });

  test('document hub snapshot', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.page.goto('/documents', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('app-document-hub')).toHaveScreenshot('document-hub.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe('homepage subsection visual coverage', () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-chromium',
      'These deterministic contracts are authored for the desktop baseline project.',
    );
  });

  test('keeps civic grid (meetings + notices) visually stable', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Visual screenshot baselines are opt-in outside win32.');

    await homePage.page.clock.setFixedTime(new Date('2026-04-12T12:00:00-06:00'));
    await homePage.goto();
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('.landing-civic-grid')).toHaveScreenshot('civic-grid.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.05,
    });
  });

  test('keeps site footer visually stable', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Set PLAYWRIGHT_VISUAL_SNAPSHOTS=1 to update or verify screenshot baselines.');

    await homePage.goto();
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('.site-footer')).toHaveScreenshot('site-footer.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.005,
    });
  });

  test('keeps section navigation visually stable', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Set PLAYWRIGHT_VISUAL_SNAPSHOTS=1 to update or verify screenshot baselines.');

    await homePage.goto();
    await waitForFonts(homePage.page);

    await expect(homePage.page.getByTestId('homepage-section-nav')).toHaveScreenshot(
      'section-nav.png',
      {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.005,
      },
    );
  });
});

test.describe('static page visual coverage', () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-chromium',
      'These deterministic contracts are authored for the desktop baseline project.',
    );
  });

  test('privacy policy page snapshot', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Set PLAYWRIGHT_VISUAL_SNAPSHOTS=1 to update or verify screenshot baselines.');

    await homePage.page.goto('/privacy', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('#privacy')).toHaveScreenshot('privacy-panel.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.005,
    });
  });

  test('terms page snapshot', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Set PLAYWRIGHT_VISUAL_SNAPSHOTS=1 to update or verify screenshot baselines.');

    await homePage.page.goto('/terms', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('#terms')).toHaveScreenshot('terms-panel.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.005,
    });
  });
});

test.describe('subcomponent aria contracts', () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-chromium',
      'These deterministic contracts are authored for the desktop baseline project.',
    );
  });

  test('resident services task picker aria structure', async ({ homePage }) => {
    await homePage.page.goto('/services', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page.locator('.resident-service-picker')).toMatchAriaSnapshot(`
      - region "Choose a resident task":
        - paragraph: Choose the service you need and complete the matching form below.
        - button "Pay utility bill Billing support" [pressed]:
          - strong: Pay utility bill
          - text: Billing support
        - button "Report a street or utility issue Issue reporting":
          - strong: Report a street or utility issue
          - text: Issue reporting
        - button "Request records, permits, or clerk help Clerk intake":
          - strong: Request records, permits, or clerk help
          - text: Clerk intake
    `);
  });

  test('records center guides aria structure', async ({ homePage }) => {
    await homePage.page.goto('/records', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page.locator('.records-center')).toMatchAriaSnapshot(`
      - region /Open stable public document destinations/:
        - paragraph
        - heading /document destinations/ [level=3]
        - region "Records and document guides":
          - region /Public records and FOIA guide/
          - region /Find meeting packets/
          - region /Find budget summaries/
          - region /Locate ordinances/
    `);
  });

  test('document hub nav aria structure', async ({ homePage }) => {
    await homePage.page.goto('/documents', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page.locator('.document-hub-nav')).toMatchAriaSnapshot(`
      - navigation
    `);
  });

  test('footer links aria structure', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.page.locator('.site-footer')).toMatchAriaSnapshot(`
      - link "Accessibility statement"
      - link "Weather alert privacy"
      - link "Weather alert SMS terms"
      - link "Public records and FOIA"
      - link "Meeting notices"
      - link "Contact Town Hall"
      - paragraph: /2026 Town of Wiley/
    `);
  });
});

test.describe('mobile responsive visual coverage', () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-chromium',
      'These deterministic contracts are authored for the desktop baseline project.',
    );
  });

  test('business directory renders correctly on mobile', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Set PLAYWRIGHT_VISUAL_SNAPSHOTS=1 to update or verify screenshot baselines.');

    await homePage.page.setViewportSize({ width: 375, height: 812 });
    await homePage.page.goto('/businesses', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('app-business-directory')).toHaveScreenshot(
      'business-directory-mobile.png',
      {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.05,
      },
    );
  });

  test('contact panel renders correctly on mobile', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Set PLAYWRIGHT_VISUAL_SNAPSHOTS=1 to update or verify screenshot baselines.');

    await homePage.page.setViewportSize({ width: 375, height: 812 });
    await homePage.page.goto('/contact', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('#contact')).toHaveScreenshot('contact-panel-mobile.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('news page renders correctly on mobile', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Set PLAYWRIGHT_VISUAL_SNAPSHOTS=1 to update or verify screenshot baselines.');

    await homePage.page.setViewportSize({ width: 375, height: 812 });
    await homePage.page.clock.setFixedTime(new Date('2026-04-12T12:00:00-06:00'));
    await homePage.page.goto('/news', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('app-news')).toHaveScreenshot('news-page-mobile.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.05,
    });
  });

  test('services panel renders correctly on mobile', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Set PLAYWRIGHT_VISUAL_SNAPSHOTS=1 to update or verify screenshot baselines.');

    await homePage.page.setViewportSize({ width: 375, height: 812 });
    await homePage.page.goto('/services', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('#services')).toHaveScreenshot('services-panel-mobile.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('document hub renders correctly on mobile', async ({ homePage }) => {
    test.skip(!useVisualSnapshots, 'Set PLAYWRIGHT_VISUAL_SNAPSHOTS=1 to update or verify screenshot baselines.');

    await homePage.page.setViewportSize({ width: 375, height: 812 });
    await homePage.page.goto('/documents', { waitUntil: 'domcontentloaded' });
    await waitForFonts(homePage.page);

    await expect(homePage.page.locator('app-document-hub')).toHaveScreenshot(
      'document-hub-mobile.png',
      {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.05,
      },
    );
  });
});
