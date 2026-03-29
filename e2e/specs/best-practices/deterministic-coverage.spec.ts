import { expect, test } from '../../fixtures/town.fixture';
import { mockWeatherProxyRoute } from '../../support/weather-mocks';

async function waitForFonts(page: Parameters<typeof test>[0]['page']): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

const supportsVisualSnapshots = process.platform === 'win32';

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
        - list:
          - listitem:
            - link /Top Tasks/
          - listitem:
            - link /Weather/
          - listitem:
            - link /Notices/
          - listitem:
            - link /Meetings/
          - listitem:
            - link /Services/
          - listitem:
            - link /Records/
          - listitem:
            - link /Documents/
          - listitem:
            - link /Accessibility/
          - listitem:
            - link /Businesses/
          - listitem:
            - link /News/
          - listitem:
            - link /Contact/
    `);
  });

  test('captures the site-language accessibility group', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.page.getByRole('group', { name: 'Site language' })).toMatchAriaSnapshot(`
      - group "Site language":
        - 'button "Site language: ES"': ES
        - 'button "Site language: EN" [pressed]': EN
    `);
  });

  test('keeps the homepage hero visually stable', async ({ homePage }) => {
    test.skip(!supportsVisualSnapshots, 'Visual screenshot baselines are maintained on win32.');

    await homePage.goto();
    await waitForFonts(homePage.page);

    await expect(homePage.page.getByTestId('homepage-hero')).toHaveScreenshot(
      'homepage-hero.png',
      {
        animations: 'disabled',
        caret: 'hide',
      },
    );
  });

  test('keeps the weather summary card visually stable', async ({ homePage }) => {
    test.skip(!supportsVisualSnapshots, 'Visual screenshot baselines are maintained on win32.');

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

    await expect(homePage.page.getByTestId('weather-current-card')).toHaveScreenshot(
      'weather-current-card.png',
      {
        animations: 'disabled',
        caret: 'hide',
      },
    );
  });

  test('filters external news coverage against a fixed clock', async ({ homePage }) => {
    await homePage.page.clock.setFixedTime(new Date('2026-04-12T12:00:00-06:00'));
    await homePage.page.goto('/news', { waitUntil: 'domcontentloaded' });

    const externalNewsCards = homePage.page.locator('.news-card--external');

    await expect(externalNewsCards).toHaveCount(1);
    await expect(externalNewsCards.first()).toContainText('Wiley CO News Update');
    await expect(externalNewsCards.first()).toContainText('Lamar Ledger');
    await expect(homePage.page.getByText('Prowers County Community Event')).toHaveCount(0);
  });

  test('business directory snapshot', async ({ homePage }) => {
    test.skip(!supportsVisualSnapshots, 'Snapshots are bound to Windows CI baseline.');
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

