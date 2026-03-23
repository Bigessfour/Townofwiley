import { expect, test } from '../../fixtures/town.fixture';
import { mockWeatherProxyRoute } from '../../support/weather-mocks';

test.describe('homepage weather', () => {
  test('renders the weather panel from the AWS proxy configuration', async ({ homePage }) => {
    await homePage.enableWeatherProxy();

    let directWeatherGovRequestCount = 0;
    await homePage.page.route('https://api.weather.gov/**', async (route) => {
      directWeatherGovRequestCount += 1;
      await route.fulfill({
        status: 599,
        contentType: 'text/plain',
        body: 'Proxy-mode weather test should not hit weather.gov directly.',
      });
    });

    await mockWeatherProxyRoute(homePage.page, '/mock-weather', {
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

    await homePage.goto();

    await expect(homePage.weatherSource).toContainText('AWS weather service');
    await expect(homePage.weatherHeading).toContainText('Wiley, CO');
    await expect(homePage.weatherCurrentCard).toContainText('Partly Sunny');
    await expect(homePage.weatherCurrentCard).toContainText('67°F');
    await expect(homePage.weatherCurrentCard).toContainText('NE 15 to 20 mph');
    await expect(homePage.weatherCurrentCard).toContainText('1% chance of precipitation');
    await expect(homePage.weatherAlertPill).toContainText('1 active alert');
    await expect(homePage.weatherAlertCards.first()).toContainText('High Wind Warning');
    await expect(homePage.weatherAlertCards.first()).toContainText('Severe · Immediate');
    await expect(homePage.weatherAlertCards.first()).toContainText('Avoid unnecessary travel.');
    expect(directWeatherGovRequestCount).toBe(0);
  });

  test('refreshes weather data without leaving the page', async ({ homePage }) => {
    await homePage.enableWeatherProxy('/mock-weather-refresh');

    let requestCount = 0;
    let releaseRefreshResponse = () => {};
    const refreshResponseGate = new Promise<void>((resolve) => {
      releaseRefreshResponse = resolve;
    });

    await homePage.page.route('**/mock-weather-refresh', async (route) => {
      requestCount += 1;

      const payload =
        requestCount === 1
          ? {
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
                  detailedForecast:
                    'Partly sunny, with a high near 67. Northeast wind 15 to 20 mph.',
                },
              ],
              alerts: [],
            }
          : {
              locationLabel: 'Wiley, CO',
              updatedAt: '2026-03-22T13:30:10+00:00',
              periods: [
                {
                  name: 'This Afternoon',
                  startTime: '2026-03-22T12:00:00-06:00',
                  isDaytime: true,
                  temperature: 70,
                  temperatureUnit: 'F',
                  probabilityOfPrecipitation: { value: 0 },
                  windSpeed: '10 to 15 mph',
                  windDirection: 'E',
                  icon: null,
                  shortForecast: 'Mostly Sunny',
                  detailedForecast: 'Mostly sunny, with a high near 70. East wind 10 to 15 mph.',
                },
              ],
              alerts: [],
            };

      if (requestCount === 2) {
        await refreshResponseGate;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });

    await homePage.goto();

    await expect(homePage.weatherCurrentCard).toContainText('Partly Sunny');
    await homePage.tapWeatherRefresh();
    await expect(homePage.weatherRefreshButton).toBeDisabled();
    await expect(homePage.weatherRefreshButton).toContainText('Refreshing...');
    releaseRefreshResponse();
    await expect(homePage.weatherCurrentCard).toContainText('Mostly Sunny');
    await expect(homePage.weatherCurrentCard).toContainText('70°F');
    await expect(homePage.weatherCurrentCard).toContainText('E 10 to 15 mph');
    await expect(homePage.weatherUpdatedLabel).toContainText('Forecast updated');
    expect(requestCount).toBe(2);
  });

  test('submits the severe weather signup form when alert signups are enabled', async ({
    homePage,
  }) => {
    await homePage.enableWeatherProxy();
    await homePage.enableAlertSignup('/mock-alert-signup');

    const signupRequests: Array<Record<string, unknown>> = [];

    await mockWeatherProxyRoute(homePage.page, '/mock-weather');
    await homePage.page.route('**/mock-alert-signup/subscriptions', async (route) => {
      signupRequests.push(route.request().postDataJSON() as Record<string, unknown>);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message:
            'Thanks. Check your inbox or phone for the confirmation step before Wiley alerts begin.',
        }),
      });
    });

    await homePage.goto();

    await expect(homePage.weatherSignupShell).toBeVisible();
    await expect(homePage.weatherSignupChannel).toHaveValue('sms');
    await expect(homePage.weatherSignupZipCode).toHaveValue('81092');
    await expect(homePage.weatherSignupLanguage).toHaveValue('en');

    await homePage.weatherSignupChannel.selectOption('email');
    await homePage.submitWeatherAlertSignup('resident@example.com', 'Jordan Resident');

    await expect(homePage.weatherSignupStatus).toContainText(
      'Check your inbox or phone for the confirmation step',
    );
    await expect(homePage.weatherSignupDestination).toHaveValue('');
    await expect(homePage.weatherSignupFullName).toHaveValue('');
    expect(signupRequests).toEqual([
      {
        channel: 'email',
        preferredLanguage: 'en',
        destination: 'resident@example.com',
        fullName: 'Jordan Resident',
        zipCode: '81092',
      },
    ]);
  });

  test('submits Spanish severe weather signups when a resident chooses Spanish alerts', async ({
    homePage,
  }) => {
    await homePage.enableWeatherProxy();
    await homePage.enableAlertSignup('/mock-alert-signup');

    const signupRequests: Array<Record<string, unknown>> = [];

    await mockWeatherProxyRoute(homePage.page, '/mock-weather');
    await homePage.page.route('**/mock-alert-signup/subscriptions', async (route) => {
      signupRequests.push(route.request().postDataJSON() as Record<string, unknown>);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message:
            'Gracias. Revise su correo o telefono para completar la confirmacion antes de que comiencen las alertas.',
        }),
      });
    });

    await homePage.goto();

    await homePage.weatherSignupChannel.selectOption('email');
    await homePage.submitWeatherAlertSignup('resident@example.com', 'Jordan Resident', 'es');

    await expect(homePage.weatherSignupStatus).toContainText('Gracias');
    expect(signupRequests).toEqual([
      {
        channel: 'email',
        preferredLanguage: 'es',
        destination: 'resident@example.com',
        fullName: 'Jordan Resident',
        zipCode: '81092',
      },
    ]);
  });
});
