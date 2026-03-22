import type { Page } from '@playwright/test';

interface MockForecastPeriod {
  name: string;
  startTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  probabilityOfPrecipitation: {
    value: number | null;
  };
  windSpeed: string;
  windDirection: string;
  icon: string | null;
  shortForecast: string;
  detailedForecast: string;
}

interface MockWeatherAlert {
  event: string;
  headline: string;
  severity: string;
  urgency: string;
  instruction?: string;
  expires?: string;
}

export interface MockWeatherProxyPayload {
  locationLabel: string;
  updatedAt: string;
  periods: MockForecastPeriod[];
  alerts: MockWeatherAlert[];
}

const pointPayload = {
  properties: {
    forecast: 'https://api.weather.gov/gridpoints/PUB/162,56/forecast',
    forecastZone: 'https://api.weather.gov/zones/forecast/COZ098',
    relativeLocation: {
      properties: {
        city: 'Wiley',
        state: 'CO',
      },
    },
  },
};

const forecastPayload = {
  properties: {
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
      {
        name: 'Monday',
        startTime: '2026-03-23T06:00:00-06:00',
        isDaytime: true,
        temperature: 73,
        temperatureUnit: 'F',
        probabilityOfPrecipitation: { value: 0 },
        windSpeed: '10 to 30 mph',
        windDirection: 'SE',
        icon: null,
        shortForecast: 'Partly Sunny',
        detailedForecast: 'Partly sunny, with a high near 73.',
      },
      {
        name: 'Monday Night',
        startTime: '2026-03-23T18:00:00-06:00',
        isDaytime: false,
        temperature: 36,
        temperatureUnit: 'F',
        probabilityOfPrecipitation: { value: 2 },
        windSpeed: '5 to 25 mph',
        windDirection: 'SE',
        icon: null,
        shortForecast: 'Partly Cloudy',
        detailedForecast: 'Partly cloudy, with a low around 36.',
      },
      {
        name: 'Tuesday',
        startTime: '2026-03-24T06:00:00-06:00',
        isDaytime: true,
        temperature: 88,
        temperatureUnit: 'F',
        probabilityOfPrecipitation: { value: 0 },
        windSpeed: '5 to 10 mph',
        windDirection: 'SSW',
        icon: null,
        shortForecast: 'Mostly Sunny',
        detailedForecast: 'Mostly sunny, with a high near 88.',
      },
    ],
  },
};

const alertPayload = {
  features: [],
};

export const defaultProxyWeatherPayload: MockWeatherProxyPayload = {
  locationLabel: 'Wiley, CO',
  updatedAt: '2026-03-22T12:57:10+00:00',
  periods: forecastPayload.properties.periods,
  alerts: [],
};

export async function mockDirectNwsRoutes(page: Page): Promise<void> {
  await page.route('https://api.weather.gov/points/38.154,-102.72', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pointPayload),
    });
  });

  await page.route('https://api.weather.gov/gridpoints/PUB/162,56/forecast', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(forecastPayload),
    });
  });

  await page.route('https://api.weather.gov/alerts/active?zone=COZ098', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(alertPayload),
    });
  });
}

export async function mockWeatherProxyRoute(
  page: Page,
  apiEndpoint = '/mock-weather',
  payload: MockWeatherProxyPayload = defaultProxyWeatherPayload,
): Promise<void> {
  await page.route(`**${apiEndpoint}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
}
