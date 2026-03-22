const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const wileyPointUrl = 'https://api.weather.gov/points/38.154,-102.72';

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
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

export async function handler(event) {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.requestContext?.http?.method !== 'GET') {
    return jsonResponse(405, {
      error: 'Method not allowed.',
    });
  }

  const userAgent = process.env.NWS_USER_AGENT?.trim();
  const apiKey = process.env.NWS_API_KEY?.trim();

  if (!userAgent) {
    return jsonResponse(500, {
      error: 'NWS proxy is missing the required NWS_USER_AGENT configuration.',
    });
  }

  try {
    const pointResponse = await fetchNwsJson(wileyPointUrl, userAgent, apiKey);
    const forecastUrl = pointResponse?.properties?.forecast;
    const forecastZoneUrl = pointResponse?.properties?.forecastZone;
    const location = pointResponse?.properties?.relativeLocation?.properties;
    const zoneCode =
      typeof forecastZoneUrl === 'string' ? forecastZoneUrl.split('/').pop()?.trim() : '';

    if (!forecastUrl || !zoneCode) {
      return jsonResponse(502, {
        error: 'NWS point response did not include the expected forecast metadata.',
      });
    }

    const [forecastResponse, alertResponse] = await Promise.all([
      fetchNwsJson(forecastUrl, userAgent, apiKey),
      fetchNwsJson(`https://api.weather.gov/alerts/active?zone=${zoneCode}`, userAgent, apiKey),
    ]);

    return jsonResponse(200, {
      provider: 'nws',
      source: 'aws-proxy',
      locationLabel:
        location?.city && location?.state ? `${location.city}, ${location.state}` : 'Wiley, CO',
      updatedAt: forecastResponse?.properties?.updatedAt || '',
      periods: Array.isArray(forecastResponse?.properties?.periods)
        ? forecastResponse.properties.periods
        : [],
      alerts: Array.isArray(alertResponse?.features)
        ? alertResponse.features.map((feature) => mapAlert(feature?.properties))
        : [],
    });
  } catch (error) {
    return jsonResponse(502, {
      error:
        error instanceof Error && error.message
          ? error.message
          : 'Unable to reach the National Weather Service right now.',
    });
  }
}
