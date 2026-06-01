import type { Page } from '@playwright/test';

import type { HomePage } from '../pages/home.page';
import {
  mockDirectNwsRoutes,
  mockWeatherProxyRoute,
  type MockWeatherAlert,
} from './weather-mocks';

const DEFAULT_ACTIVE_ALERT: MockWeatherAlert = {
  event: 'Severe Thunderstorm Warning',
  headline: 'Severe Thunderstorm Warning issued for Wiley.',
  severity: 'Severe',
  urgency: 'Immediate',
  instruction: 'Move indoors and stay away from windows.',
  expires: '2026-03-22T20:00:00-06:00',
};

/** Prime homepage NWS banner + proxy weather for inventory and smoke parity. */
export async function primeHomepageNwsAlert(
  homePage: HomePage,
  alert: MockWeatherAlert = DEFAULT_ACTIVE_ALERT,
  proxyPath = '/mock-homepage-weather',
): Promise<void> {
  await mockDirectNwsRoutes(homePage.page, [alert]);
  await homePage.enableWeatherProxy(proxyPath);
  await mockWeatherProxyRoute(homePage.page, proxyPath, {
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
    alerts: [alert],
  });
}

export async function activateSkipToMainContent(page: Page): Promise<void> {
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await skipLink.focus();
  await page.keyboard.press('Enter');
}
