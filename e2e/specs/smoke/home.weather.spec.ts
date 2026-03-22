import { expect, test } from '../../fixtures/town.fixture';
import { mockWeatherProxyRoute } from '../../support/weather-mocks';

test.describe('homepage weather', () => {
  test('renders the weather panel from the AWS proxy configuration', async ({ homePage }) => {
    await homePage.enableWeatherProxy();
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
    await expect(homePage.weatherCurrentCard).toContainText('Partly Sunny');
    await expect(homePage.weatherAlertPill).toContainText('1 active alert');
    await expect(homePage.weatherAlertCards.first()).toContainText('High Wind Warning');
  });

  test('refreshes weather data without leaving the page', async ({ homePage }) => {
    await homePage.enableWeatherProxy('/mock-weather-refresh');

    let requestCount = 0;
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

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });

    await homePage.goto();

    await expect(homePage.weatherCurrentCard).toContainText('Partly Sunny');
    await homePage.tapWeatherRefresh();
    await expect(homePage.weatherCurrentCard).toContainText('Mostly Sunny');
  });
});
