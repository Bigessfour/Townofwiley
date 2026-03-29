import assert from 'node:assert/strict';
import test from 'node:test';

import { handler } from './index.mjs';

const successPointPayload = {
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

const successForecastPayload = {
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
    ],
  },
};

const successAlertPayload = {
  features: [
    {
      properties: {
        event: 'High Wind Warning',
        headline: 'High Wind Warning for Prowers County',
        severity: 'Severe',
        urgency: 'Immediate',
        instruction: 'Avoid unnecessary travel.',
        expires: '2026-03-22T20:00:00-06:00',
      },
    },
  ],
};

function jsonFetchResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  };
}

test('returns 500 when NWS_USER_AGENT is missing', async () => {
  const originalUserAgent = process.env.NWS_USER_AGENT;

  delete process.env.NWS_USER_AGENT;

  try {
    const response = await handler({ requestContext: { http: { method: 'GET' } } });
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 500);
    assert.match(body.error, /NWS_USER_AGENT/);
  } finally {
    if (originalUserAgent) {
      process.env.NWS_USER_AGENT = originalUserAgent;
    }
  }
});

test('proxies the NWS forecast and alert payloads with the configured headers', async (t) => {
  const originalFetch = global.fetch;
  const originalUserAgent = process.env.NWS_USER_AGENT;
  const originalApiKey = process.env.NWS_API_KEY;
  const fetchCalls = [];

  process.env.NWS_USER_AGENT = 'TownOfWileyWeather/1.0 (contact: bigessfour@gmail.com)';
  process.env.NWS_API_KEY = 'test-api-key';
  global.fetch = async (url, options) => {
    fetchCalls.push({ url, options });

    if (url === 'https://api.weather.gov/points/38.154,-102.72') {
      return jsonFetchResponse(200, successPointPayload);
    }

    if (url === 'https://api.weather.gov/gridpoints/PUB/162,56/forecast') {
      return jsonFetchResponse(200, successForecastPayload);
    }

    if (url === 'https://api.weather.gov/alerts/active?zone=COZ098') {
      return jsonFetchResponse(200, successAlertPayload);
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  t.after(() => {
    global.fetch = originalFetch;

    if (originalUserAgent) {
      process.env.NWS_USER_AGENT = originalUserAgent;
    } else {
      delete process.env.NWS_USER_AGENT;
    }

    if (originalApiKey) {
      process.env.NWS_API_KEY = originalApiKey;
    } else {
      delete process.env.NWS_API_KEY;
    }
  });

  const response = await handler({ requestContext: { http: { method: 'GET' } } });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(body.provider, 'nws');
  assert.equal(body.source, 'aws-proxy');
  assert.equal(body.locationLabel, 'Wiley, CO');
  assert.equal(body.periods.length, 1);
  assert.equal(body.alerts.length, 1);
  assert.equal(body.alerts[0].event, 'High Wind Warning');
  assert.equal(fetchCalls.length, 3);
  assert.equal(fetchCalls[0].options.headers['user-agent'], process.env.NWS_USER_AGENT);
  assert.equal(fetchCalls[0].options.headers['api-key'], 'test-api-key');
});

test('returns 502 when the upstream NWS request fails', async (t) => {
  const originalFetch = global.fetch;
  const originalUserAgent = process.env.NWS_USER_AGENT;

  process.env.NWS_USER_AGENT = 'TownOfWileyWeather/1.0 (contact: bigessfour@gmail.com)';
  global.fetch = async () => {
    return {
      ok: false,
      status: 503,
      text: async () => 'Temporary NWS outage',
    };
  };

  t.after(() => {
    global.fetch = originalFetch;

    if (originalUserAgent) {
      process.env.NWS_USER_AGENT = originalUserAgent;
    } else {
      delete process.env.NWS_USER_AGENT;
    }
  });

  const response = await handler({ requestContext: { http: { method: 'GET' } } });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 502);
  assert.match(body.error, /Temporary NWS outage/);
});

test('returns 204 for OPTIONS preflight with CORS headers', async () => {
  const response = await handler({ requestContext: { http: { method: 'OPTIONS' } } });

  assert.equal(response.statusCode, 204);
  assert.equal(response.headers['access-control-allow-origin'], '*');
  assert.match(response.headers['access-control-allow-methods'], /GET/);
});

test('returns 405 for unsupported methods', async () => {
  const response = await handler({ requestContext: { http: { method: 'POST' } } });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 405);
  assert.match(body.error, /Method not allowed/);
});

test('omits api-key header when NWS_API_KEY is not set', async (t) => {
  const originalFetch = global.fetch;
  const originalUserAgent = process.env.NWS_USER_AGENT;
  const originalApiKey = process.env.NWS_API_KEY;
  const fetchCalls = [];

  process.env.NWS_USER_AGENT = 'TownOfWileyWeather/1.0 (contact: bigessfour@gmail.com)';
  delete process.env.NWS_API_KEY;

  global.fetch = async (url, options) => {
    fetchCalls.push({ url, options });
    return jsonFetchResponse(200, successPointPayload);
  };

  t.after(() => {
    global.fetch = originalFetch;

    if (originalUserAgent) {
      process.env.NWS_USER_AGENT = originalUserAgent;
    } else {
      delete process.env.NWS_USER_AGENT;
    }

    if (originalApiKey) {
      process.env.NWS_API_KEY = originalApiKey;
    } else {
      delete process.env.NWS_API_KEY;
    }
  });

  // First fetch will be the points call — it returns successPointPayload which
  // lacks a forecast URL, so the handler returns 502 from the guard. That is
  // fine — we only care that api-key was absent from the headers.
  await handler({ requestContext: { http: { method: 'GET' } } });

  assert.ok(fetchCalls.length >= 1, 'at least one NWS fetch was made');
  assert.equal(
    fetchCalls[0].options.headers['api-key'],
    undefined,
    'api-key header must not be sent when NWS_API_KEY is unset',
  );
});
