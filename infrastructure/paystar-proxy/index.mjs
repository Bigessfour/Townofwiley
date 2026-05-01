const PAYSTAR_DOCS_URL = 'https://docs.paystar.io/';

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

function getHttpMethod(event) {
  return (
    event.requestContext?.http?.method ||
    event.httpMethod ||
    event.requestContext?.httpMethod ||
    ''
  ).toUpperCase();
}

/** API Gateway HTTP API v2, Function URL, or REST proxy. */
function getPath(event) {
  const raw = event.rawPath || event.path || event.requestContext?.http?.path || '/';
  const path = typeof raw === 'string' ? raw.split('?')[0] : '/';
  return path || '/';
}

function getPortalUrl() {
  return process.env.PAYSTAR_PORTAL_URL?.trim() || '';
}

function getUpstreamLaunchUrl() {
  return process.env.PAYSTAR_UPSTREAM_LAUNCH_URL?.trim() || '';
}

function getUpstreamApiKey() {
  return process.env.PAYSTAR_UPSTREAM_API_KEY?.trim() || '';
}

function getUpstreamReceiptUrlTemplate() {
  return process.env.PAYSTAR_UPSTREAM_RECEIPT_URL_TEMPLATE?.trim() || '';
}

function upstreamLaunchConfigured() {
  return Boolean(getUpstreamLaunchUrl() && getUpstreamApiKey());
}

function upstreamReceiptConfigured() {
  const t = getUpstreamReceiptUrlTemplate();
  return Boolean(t && t.includes('{id}') && getUpstreamApiKey());
}

/**
 * Scaffold payload for Paystar REST until tenant-specific OpenAPI is available.
 * @see https://docs.paystar.io/
 */
function buildUpstreamLaunchBody(requestBody) {
  const amountInCents =
    typeof requestBody?.amountInCents === 'number'
      ? requestBody.amountInCents
      : typeof requestBody?.amount === 'number'
        ? Math.round(Number(requestBody.amount) * 100)
        : undefined;

  return {
    source: 'town-of-wiley-website',
    payer: {
      name: requestBody?.residentName,
      email: requestBody?.preferredContact,
    },
    billing: {
      serviceAddress: requestBody?.serviceAddress,
      accountNumber: requestBody?.accountNumber,
      dueDate: requestBody?.dueDate,
      invoiceNumber: requestBody?.invoiceNumber,
    },
    amountCents: amountInCents,
    locale: requestBody?.locale,
    clientNote: requestBody?.accountQuestion || requestBody?.billSummary,
  };
}

/**
 * Normalize vendor JSON into the shape the Angular app expects.
 * Field names are guesses until Paystar confirms webhook / REST payloads.
 */
function mapUpstreamJsonToTownLaunchResponse(upstreamJson) {
  if (!upstreamJson || typeof upstreamJson !== 'object') {
    return null;
  }

  const launchUrl =
    upstreamJson.launchUrl ||
    upstreamJson.checkoutUrl ||
    upstreamJson.redirectUrl ||
    upstreamJson.url ||
    upstreamJson.paymentUrl ||
    '';

  const referenceId =
    upstreamJson.referenceId ||
    upstreamJson.id ||
    upstreamJson.sessionId ||
    upstreamJson.paymentId ||
    upstreamJson.transactionId;

  if (!launchUrl) {
    return null;
  }

  return {
    provider: 'paystar',
    mode: 'api',
    launchUrl: String(launchUrl),
    ...(referenceId != null ? { referenceId: String(referenceId) } : {}),
    ...(upstreamJson.expiresAt != null ? { expiresAt: String(upstreamJson.expiresAt) } : {}),
  };
}

async function tryUpstreamLaunch(requestBody, cors) {
  const url = getUpstreamLaunchUrl();
  const apiKey = getUpstreamApiKey();
  if (!url || !apiKey) {
    return null;
  }

  const upstreamRes = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      accept: 'application/json',
    },
    body: JSON.stringify(buildUpstreamLaunchBody(requestBody ?? {})),
  });

  const text = await upstreamRes.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!upstreamRes.ok) {
    return jsonResponse(
      upstreamRes.status >= 400 && upstreamRes.status < 600 ? upstreamRes.status : 502,
      {
        error: 'Paystar upstream rejected the launch request.',
        documentation: PAYSTAR_DOCS_URL,
        upstreamStatus: upstreamRes.status,
        detail:
          typeof json === 'object' && json && 'message' in json ? json.message : text.slice(0, 500),
      },
      cors,
    );
  }

  const mapped = mapUpstreamJsonToTownLaunchResponse(json);
  if (!mapped) {
    return jsonResponse(
      502,
      {
        error:
          'Paystar upstream returned JSON without a recognizable checkout URL. Update PAYSTAR_UPSTREAM_LAUNCH_URL or adjust mapUpstreamJsonToTownLaunchResponse once Paystar confirms response fields.',
        documentation: PAYSTAR_DOCS_URL,
      },
      cors,
    );
  }

  return jsonResponse(200, mapped, cors);
}

function hostedLaunchFromPortal(requestBody, cors) {
  const portalUrl = getPortalUrl();

  if (!portalUrl) {
    return jsonResponse(
      500,
      {
        error: configurePaystarErrorMessage(),
        documentation: PAYSTAR_DOCS_URL,
      },
      cors,
    );
  }

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

function configurePaystarErrorMessage() {
  const hasKey = Boolean(getUpstreamApiKey());
  const hasLaunch = Boolean(getUpstreamLaunchUrl());
  if (hasKey && !hasLaunch) {
    return 'Paystar proxy has PAYSTAR_UPSTREAM_API_KEY but is missing PAYSTAR_UPSTREAM_LAUNCH_URL. Set both from Paystar’s tenant documentation, or set PAYSTAR_PORTAL_URL for hosted-portal mode.';
  }
  if (!hasKey && hasLaunch) {
    return 'Paystar proxy has PAYSTAR_UPSTREAM_LAUNCH_URL but is missing PAYSTAR_UPSTREAM_API_KEY. Store the key in Lambda environment or Secrets Manager—not in the public site.';
  }
  return (
    'Paystar proxy needs either PAYSTAR_PORTAL_URL (hosted payer portal) or PAYSTAR_UPSTREAM_LAUNCH_URL ' +
    'and PAYSTAR_UPSTREAM_API_KEY (REST launch). See ' +
    PAYSTAR_DOCS_URL
  );
}

function getModeForStatus() {
  if (upstreamLaunchConfigured()) {
    return 'api';
  }
  if (getPortalUrl()) {
    return 'hosted';
  }
  return 'none';
}

async function handleGetReceipt(receiptId, locale, cors) {
  if (!upstreamReceiptConfigured()) {
    return jsonResponse(
      501,
      {
        error:
          'Receipt lookup is not configured. After Paystar provides a query or events contract, set PAYSTAR_UPSTREAM_RECEIPT_URL_TEMPLATE (include {id}) and PAYSTAR_UPSTREAM_API_KEY on this function.',
        documentation: PAYSTAR_DOCS_URL,
      },
      cors,
    );
  }

  const template = getUpstreamReceiptUrlTemplate();
  const url = template.replace('{id}', encodeURIComponent(receiptId));
  const apiKey = getUpstreamApiKey();

  const upstreamRes = await fetch(url, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: 'application/json',
      ...(locale ? { 'accept-language': locale } : {}),
    },
  });

  const text = await upstreamRes.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    return jsonResponse(
      502,
      {
        error: 'Receipt endpoint did not return JSON.',
        documentation: PAYSTAR_DOCS_URL,
      },
      cors,
    );
  }

  if (!upstreamRes.ok) {
    return jsonResponse(
      upstreamRes.status >= 400 && upstreamRes.status < 600 ? upstreamRes.status : 502,
      {
        error: 'Receipt lookup failed upstream.',
        documentation: PAYSTAR_DOCS_URL,
        detail:
          typeof json === 'object' && json && 'message' in json ? json.message : text.slice(0, 500),
      },
      cors,
    );
  }

  return jsonResponse(200, json, cors);
}

/**
 * Match `/receipt/{id}` with optional stage prefix (e.g. `/prod/receipt/x`).
 */
function extractReceiptId(path) {
  const match = path.match(/\/receipt\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function handler(event) {
  const requestOrigin = getRequestOrigin(event);
  const cors = buildCorsHeaders(requestOrigin);

  if (getHttpMethod(event) === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: cors,
      body: '',
    };
  }

  const method = getHttpMethod(event);
  const path = getPath(event);

  if (method === 'GET') {
    const receiptId = extractReceiptId(path);
    if (receiptId) {
      const locale =
        typeof event.queryStringParameters?.locale === 'string'
          ? event.queryStringParameters.locale
          : '';
      return handleGetReceipt(receiptId, locale, cors);
    }

    return jsonResponse(
      200,
      {
        ok: true,
        provider: 'paystar',
        mode: getModeForStatus(),
        upstreamLaunchConfigured: upstreamLaunchConfigured(),
        upstreamReceiptConfigured: upstreamReceiptConfigured(),
        documentation: PAYSTAR_DOCS_URL,
      },
      cors,
    );
  }

  if (method !== 'POST') {
    return jsonResponse(
      405,
      {
        error: 'Method not allowed.',
        documentation: PAYSTAR_DOCS_URL,
      },
      cors,
    );
  }

  const isLaunchPost =
    path === '/' || path === '' || path.endsWith('/launch') || !extractReceiptId(path);

  if (!isLaunchPost && extractReceiptId(path)) {
    return jsonResponse(
      405,
      {
        error: 'Use GET for receipt resources.',
        documentation: PAYSTAR_DOCS_URL,
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
        documentation: PAYSTAR_DOCS_URL,
      },
      cors,
    );
  }

  if (upstreamLaunchConfigured()) {
    const upstreamResult = await tryUpstreamLaunch(requestBody, cors);
    if (upstreamResult) {
      return upstreamResult;
    }
  }

  return hostedLaunchFromPortal(requestBody, cors);
}
