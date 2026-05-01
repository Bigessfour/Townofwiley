const ALLOWED_ORIGINS = new Set([
  'https://townofwiley.gov',
  'https://www.townofwiley.gov',
  'https://staging.townofwiley.gov',
  'http://localhost:4200',
  'http://localhost:4300',
  'http://127.0.0.1:4200',
  'http://127.0.0.1:4300',
]);

function buildCorsHeaders(requestOrigin) {
  const origin = ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : 'https://townofwiley.gov';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'Origin',
  };
}

const WILEY_LAT = 38.154;
const WILEY_LON = -102.72;
const WILEY_ZIP = '81092';
const wileyPointUrl = `https://api.weather.gov/points/${WILEY_LAT},${WILEY_LON}`;

function jsonResponse(statusCode, body, requestOrigin) {
  return {
    statusCode,
    headers: {
      ...buildCorsHeaders(requestOrigin ?? ''),
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  };
}

function normalizeWhitespace(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

async function fetchNwsJson(url, userAgent, apiKey) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/geo+json',
      'user-agent': userAgent,
      ...(apiKey ? { 'api-key': apiKey } : {}),
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      normalizeWhitespace(responseText).slice(0, 400) ||
        `NWS request failed with ${response.status}`,
    );
  }

  return JSON.parse(responseText);
}

function mapAlert(properties) {
  return {
    event: properties?.event || 'Alert',
    headline:
      normalizeWhitespace(properties?.headline) ||
      normalizeWhitespace(properties?.description?.split('\n')?.[0]) ||
      properties?.event ||
      'Alert',
    severity: properties?.severity || 'Unknown severity',
    urgency: properties?.urgency || 'Unknown urgency',
    instruction: properties?.instruction ? normalizeWhitespace(properties.instruction) : undefined,
    expires: properties?.expires || undefined,
  };
}

/**
 * Computes approximate sunrise and sunset times for Wiley, CO.
 * Uses the NOAA simplified solar calculator algorithm.
 */
function computeSolarTimes(dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  const year = date.getFullYear();
  const dayOfYear = Math.ceil((date - new Date(year, 0, 0)) / 86_400_000);
  const latRad = WILEY_LAT * (Math.PI / 180);
  const declDeg = 23.45 * Math.sin(((360 * (284 + dayOfYear)) / 365) * (Math.PI / 180));
  const declRad = declDeg * (Math.PI / 180);
  const cosHA = -Math.tan(latRad) * Math.tan(declRad);
  const haDeg = Math.acos(Math.max(-1, Math.min(1, cosHA))) * (180 / Math.PI);

  // Colorado DST: MDT (UTC-6) from 2nd Sunday in March to 1st Sunday in November
  const dstStart = new Date(year, 2, 8 + ((7 - new Date(year, 2, 8).getDay()) % 7));
  const dstEnd = new Date(year, 10, 1 + ((7 - new Date(year, 10, 1).getDay()) % 7));
  const utcOffset = date >= dstStart && date < dstEnd ? -6 : -7;

  // Solar noon in local clock hours (longitude → UTC offset, then shift to local wall clock)
  const solarNoon = 12 - WILEY_LON / 15 + utcOffset;

  const fmt = (h) => {
    const hr = ((Math.floor(h) % 24) + 24) % 24;
    const frac = h - Math.floor(h);
    const min = Math.round((frac < 0 ? frac + 1 : frac) * 60) % 60;
    const ampm = hr >= 12 ? 'PM' : 'AM';
    return `${hr % 12 || 12}:${String(min).padStart(2, '0')} ${ampm}`;
  };

  return {
    sunrise: fmt(solarNoon - haDeg / 15),
    sunset: fmt(solarNoon + haDeg / 15),
    photoperiod: `${((haDeg / 15) * 2).toFixed(1)}h`,
  };
}

/**
 * Fetches AQI from AirNow for ZIP 81092 when an API key is configured.
 * Returns null gracefully if the key is absent or the call fails.
 */
async function fetchAqi(apiKey) {
  if (!apiKey) return null;

  try {
    const url =
      `https://www.airnowapi.org/aq/observation/zipCode/current/` +
      `?format=application/json&zipCode=${WILEY_ZIP}&distance=25&API_KEY=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, { headers: { accept: 'application/json' } });

    if (!response.ok) return null;

    const data = JSON.parse(await response.text());

    if (!Array.isArray(data) || data.length === 0) return null;

    const obs = data.find((d) => d.ParameterName === 'PM2.5') ?? data[0];

    return {
      category: obs?.Category?.Name ?? 'Unknown',
      aqi: obs?.AQI ?? null,
      parameter: obs?.ParameterName ?? 'AQI',
    };
  } catch {
    return null;
  }
}

export async function handler(event) {
  const requestOrigin = event.headers?.origin ?? event.headers?.Origin ?? '';

  if (event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: buildCorsHeaders(requestOrigin),
      body: '',
    };
  }

  if (event.requestContext?.http?.method !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed.' }, requestOrigin);
  }

  const userAgent = process.env.NWS_USER_AGENT?.trim();
  const apiKey = process.env.NWS_API_KEY?.trim();
  const airnowApiKey = process.env.AIRNOW_API_KEY?.trim();

  if (!userAgent) {
    return jsonResponse(
      500,
      {
        error: 'NWS proxy is missing the required NWS_USER_AGENT configuration.',
      },
      requestOrigin,
    );
  }

  try {
    const pointResponse = await fetchNwsJson(wileyPointUrl, userAgent, apiKey);
    const forecastUrl = pointResponse?.properties?.forecast;
    const hourlyForecastUrl = pointResponse?.properties?.forecastHourly;
    const forecastZoneUrl = pointResponse?.properties?.forecastZone;
    const location = pointResponse?.properties?.relativeLocation?.properties;
    const zoneCode =
      typeof forecastZoneUrl === 'string' ? forecastZoneUrl.split('/').pop()?.trim() : '';

    if (!forecastUrl || !zoneCode) {
      return jsonResponse(
        502,
        {
          error: 'NWS point response did not include the expected forecast metadata.',
        },
        requestOrigin,
      );
    }

    const [forecastResponse, alertResponse, hourlyResponse, aqi] = await Promise.all([
      fetchNwsJson(forecastUrl, userAgent, apiKey),
      fetchNwsJson(`https://api.weather.gov/alerts/active?zone=${zoneCode}`, userAgent, apiKey),
      hourlyForecastUrl
        ? fetchNwsJson(hourlyForecastUrl, userAgent, apiKey).catch(() => null)
        : Promise.resolve(null),
      fetchAqi(airnowApiKey),
    ]);

    const firstPeriodDate = forecastResponse?.properties?.periods?.[0]?.startTime ?? null;
    const solar = computeSolarTimes(firstPeriodDate);

    return jsonResponse(
      200,
      {
        provider: 'nws',
        source: 'aws-proxy',
        locationLabel:
          location?.city && location?.state ? `${location.city}, ${location.state}` : 'Wiley, CO',
        updatedAt: forecastResponse?.properties?.updatedAt ?? '',
        periods: Array.isArray(forecastResponse?.properties?.periods)
          ? forecastResponse.properties.periods
          : [],
        hourlyPeriods: Array.isArray(hourlyResponse?.properties?.periods)
          ? hourlyResponse.properties.periods.slice(0, 12)
          : [],
        alerts: Array.isArray(alertResponse?.features)
          ? alertResponse.features.map((feature) => mapAlert(feature?.properties))
          : [],
        solar,
        aqi,
      },
      requestOrigin,
    );
  } catch (error) {
    return jsonResponse(
      502,
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : 'Unable to reach the National Weather Service right now.',
      },
      requestOrigin,
    );
  }
}
