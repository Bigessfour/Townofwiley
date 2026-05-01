const ALLOWED_ORIGINS = new Set([
  'https://townofwiley.gov',
  'https://www.townofwiley.gov',
  'https://staging.townofwiley.gov',
  'http://localhost:4200',
  'http://localhost:4300',
  'http://127.0.0.1:4200',
  'http://127.0.0.1:4300',
]);

function getRequestOrigin(event) {
  const headers = event.headers || {};
  const origin = headers.origin ?? headers.Origin;
  return typeof origin === 'string' ? origin.trim() : '';
}

function buildCorsHeaders(requestOrigin) {
  const origin = ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : 'https://townofwiley.gov';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'Origin',
  };
}

function jsonResponse(statusCode, body, corsHeaders) {
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
  const requestOrigin = getRequestOrigin(event);
  const cors = buildCorsHeaders(requestOrigin);

  if (event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: cors,
      body: '',
    };
  }

  if (event.requestContext?.http?.method === 'GET') {
    return jsonResponse(
      200,
      {
        ok: true,
        provider: 'paystar',
        mode: getPortalUrl() ? 'hosted' : 'none',
      },
      cors,
    );
  }

  if (event.requestContext?.http?.method !== 'POST') {
    return jsonResponse(
      405,
      {
        error: 'Method not allowed.',
      },
      cors,
    );
  }

  const portalUrl = getPortalUrl();

  if (!portalUrl) {
    return jsonResponse(
      500,
      {
        error:
          'Paystar proxy is missing PAYSTAR_PORTAL_URL. Public Paystar documentation supports a hosted payment portal link, so this scaffold returns that launch URL until a deeper vendor-backed API contract is confirmed.',
      },
      cors,
    );
  }

  let requestBody;

  try {
    requestBody = event.body ? JSON.parse(event.body) : {};
  } catch {
    return jsonResponse(
      400,
      {
        error: 'Request body must be valid JSON.',
      },
      cors,
    );
  }

  // Prefer accountNumber for reference tracking; fall back to streetAddress, then legacy serviceAddress.
  const referenceId =
    (typeof requestBody?.accountNumber === 'string' && requestBody.accountNumber.trim()) ||
    (typeof requestBody?.streetAddress === 'string' && requestBody.streetAddress.trim()) ||
    (typeof requestBody?.serviceAddress === 'string' && requestBody.serviceAddress.trim()) ||
    undefined;

  return jsonResponse(
    200,
    {
      provider: 'paystar',
      mode: 'hosted',
      launchUrl: portalUrl,
      referenceId: referenceId || undefined,
    },
    cors,
  );
}
