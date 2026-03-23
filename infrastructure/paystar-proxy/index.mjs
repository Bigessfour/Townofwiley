const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
};

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

function getPortalUrl() {
  return process.env.PAYSTAR_PORTAL_URL?.trim() || '';
}

export async function handler(event) {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.requestContext?.http?.method === 'GET') {
    return jsonResponse(200, {
      ok: true,
      provider: 'paystar',
      mode: getPortalUrl() ? 'hosted' : 'none',
    });
  }

  if (event.requestContext?.http?.method !== 'POST') {
    return jsonResponse(405, {
      error: 'Method not allowed.',
    });
  }

  const portalUrl = getPortalUrl();

  if (!portalUrl) {
    return jsonResponse(500, {
      error:
        'Paystar proxy is missing PAYSTAR_PORTAL_URL. Public Paystar documentation supports a hosted payment portal link, so this scaffold returns that launch URL until a deeper vendor-backed API contract is confirmed.',
    });
  }

  let requestBody;

  try {
    requestBody = event.body ? JSON.parse(event.body) : {};
  } catch {
    return jsonResponse(400, {
      error: 'Request body must be valid JSON.',
    });
  }

  return jsonResponse(200, {
    provider: 'paystar',
    mode: 'hosted',
    launchUrl: portalUrl,
    referenceId:
      typeof requestBody?.serviceAddress === 'string' && requestBody.serviceAddress.trim()
        ? requestBody.serviceAddress.trim()
        : undefined,
  });
}
