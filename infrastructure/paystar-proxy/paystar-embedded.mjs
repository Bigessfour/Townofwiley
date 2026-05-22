/**
 * Paystar Embedded Session API scaffold for Town of Wiley.
 * @see https://docs.paystar.io/api/embedded/
 * @see src/app/payments/paystar-embedded-contract.ts
 */

export const PAYSTAR_EMBEDDED_DOCS_URL = 'https://docs.paystar.io/api/embedded/';

/** @type {import('../../src/app/payments/paystar-embedded-contract.ts').PaystarEmbeddedSessionType[]} */
export const EMBEDDED_SESSION_TYPES = [
  'payment',
  'autopay',
  'paperless',
  'oneTimeScheduledPayment',
  'manageScheduledPayments',
  'wallet',
  'notifications',
];

const SESSION_ROUTES = {
  payment: '/integrations/embedded/initiate',
  autopay: '/integrations/embedded/initiate-manage-autopay',
  paperless: '/integrations/embedded/initiate-manage-paperless',
  oneTimeScheduledPayment: '/integrations/embedded/initiate-schedule-payment-session',
  manageScheduledPayments: '/integrations/embedded/initiate-manage-schedule-payments',
  wallet: '/integrations/embedded/initiate-manage-wallet',
  notifications: '/integrations/embedded/initiate-manage-notifications',
};

const DEFAULT_GATEWAY_BASE = 'https://stage-gateway.paystar.io';

export function getEmbeddedGatewayBase() {
  return process.env.PAYSTAR_EMBEDDED_GATEWAY_BASE_URL?.trim() || DEFAULT_GATEWAY_BASE;
}

export function getBusinessUnitSlug() {
  return process.env.PAYSTAR_BUSINESS_UNIT_SLUG?.trim() || '';
}

export function getEmbeddedApiKey() {
  return process.env.PAYSTAR_UPSTREAM_API_KEY?.trim() || '';
}

export function embeddedConfigured() {
  return Boolean(getEmbeddedGatewayBase() && getBusinessUnitSlug() && getEmbeddedApiKey());
}

/**
 * @param {string} path
 * @param {Record<string, unknown>} body
 */
export function isEmbeddedSessionRequest(path, body) {
  if (body && typeof body.sessionType === 'string' && SESSION_ROUTES[body.sessionType]) {
    return true;
  }
  return typeof path === 'string' && path.includes('/embedded/');
}

/**
 * Split "Jordan Resident" → { FirstName, LastName } for ClientUser (immutable after first sync).
 * @param {string} fullName
 */
export function splitClientName(fullName) {
  const trimmed = typeof fullName === 'string' ? fullName.trim() : '';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { FirstName: 'Resident', LastName: 'Wiley' };
  }
  if (parts.length === 1) {
    return { FirstName: parts[0], LastName: 'Resident' };
  }
  return { FirstName: parts[0], LastName: parts.slice(1).join(' ') };
}

/**
 * Map browser payload → Paystar Create Payment Session (QuickPay).
 * Amounts are integer cents per Paystar spec.
 * @param {Record<string, unknown>} townBody
 */
export function buildPaymentSessionRequest(townBody) {
  const slug = getBusinessUnitSlug();
  const amountInCents =
    typeof townBody.amountInCents === 'number'
      ? Math.round(townBody.amountInCents)
      : typeof townBody.amount === 'number'
        ? Math.round(Number(townBody.amount) * 100)
        : undefined;

  const accountNumber =
    typeof townBody.accountNumber === 'string' ? townBody.accountNumber.trim() : '';
  const contact =
    typeof townBody.email === 'string' && townBody.email.includes('@')
      ? townBody.email.trim()
      : typeof townBody.preferredContact === 'string' && townBody.preferredContact.includes('@')
        ? townBody.preferredContact.trim()
        : '';

  const nameParts = splitClientName(
    typeof townBody.residentName === 'string' ? townBody.residentName : '',
  );

  /** @type {import('../../src/app/payments/paystar-embedded-contract.ts').PaystarEmbeddedPaymentSessionRequest} */
  const request = {
    BusinessUnitSlug: slug,
    Channel: 'QuickPay',
    Charges: [
      {
        Amount: amountInCents ?? 0,
        Description:
          typeof townBody.billSummary === 'string' && townBody.billSummary.trim()
            ? townBody.billSummary.trim().slice(0, 200)
            : 'Town of Wiley utility payment',
        ...(accountNumber
          ? {
              ClientAccount: {
                AccountNumber: accountNumber,
                Name: typeof townBody.residentName === 'string' ? townBody.residentName : undefined,
                Address:
                  typeof townBody.serviceAddress === 'string' ? townBody.serviceAddress : undefined,
              },
            }
          : {}),
      },
    ],
    CustomMeta: {
      source: typeof townBody.source === 'string' ? townBody.source : 'town-website',
      locale: typeof townBody.locale === 'string' ? townBody.locale : 'en',
    },
  };

  if (contact) {
    request.ClientUser = {
      EmailAddress: contact,
      FirstName: nameParts.FirstName,
      LastName: nameParts.LastName,
    };
  }

  if (typeof townBody.returnUrl === 'string' && townBody.returnUrl.trim()) {
    request.ReturnUrl = townBody.returnUrl.trim();
  }
  if (typeof townBody.successUrl === 'string' && townBody.successUrl.trim()) {
    request.SuccessUrl = townBody.successUrl.trim();
  }
  if (typeof townBody.clientReference === 'string' && townBody.clientReference.trim()) {
    request.ClientReference = townBody.clientReference.trim();
  }

  return request;
}

/**
 * Map manage-* sessions (scaffold — same ClientAccount/User pattern).
 * @param {Record<string, unknown>} townBody
 */
export function buildAccountManageSessionRequest(townBody) {
  const slug = getBusinessUnitSlug();
  const accountNumber =
    typeof townBody.accountNumber === 'string' ? townBody.accountNumber.trim() : '';
  const contact =
    typeof townBody.email === 'string' && townBody.email.includes('@')
      ? townBody.email.trim()
      : typeof townBody.preferredContact === 'string' && townBody.preferredContact.includes('@')
        ? townBody.preferredContact.trim()
        : '';

  const nameParts = splitClientName(
    typeof townBody.residentName === 'string' ? townBody.residentName : '',
  );

  return {
    BusinessUnitSlug: slug,
    SyncAccount: true,
    ClientAccount: {
      AccountNumber: accountNumber || 'UNKNOWN',
      Name: typeof townBody.residentName === 'string' ? townBody.residentName : undefined,
      Address: typeof townBody.serviceAddress === 'string' ? townBody.serviceAddress : undefined,
    },
    ClientUser: {
      EmailAddress: contact || 'resident@example.invalid',
      FirstName: nameParts.FirstName,
      LastName: nameParts.LastName,
    },
  };
}

/**
 * @param {string} sessionType
 * @param {Record<string, unknown>} townBody
 */
export function buildEmbeddedUpstreamBody(sessionType, townBody) {
  switch (sessionType) {
    case 'payment':
      return buildPaymentSessionRequest(townBody);
    case 'wallet':
    case 'notifications': {
      const slug = getBusinessUnitSlug();
      const contact =
        typeof townBody.email === 'string' && townBody.email.includes('@')
          ? townBody.email.trim()
          : typeof townBody.preferredContact === 'string' && townBody.preferredContact.includes('@')
            ? townBody.preferredContact.trim()
            : 'resident@example.invalid';
      const nameParts = splitClientName(
        typeof townBody.residentName === 'string' ? townBody.residentName : '',
      );
      return {
        BusinessUnitSlug: slug,
        ClientUser: {
          EmailAddress: contact,
          FirstName: nameParts.FirstName,
          LastName: nameParts.LastName,
        },
      };
    }
    case 'autopay':
    case 'paperless':
    case 'oneTimeScheduledPayment':
    case 'manageScheduledPayments':
      return buildAccountManageSessionRequest(townBody);
    default:
      return null;
  }
}

/**
 * Normalize Paystar embedded envelope → town launch response for Angular.
 * @param {string} sessionType
 * @param {Record<string, unknown>} envelope
 */
export function mapEmbeddedEnvelopeToTownLaunch(sessionType, envelope) {
  if (!envelope || typeof envelope !== 'object' || envelope.hasErrors) {
    return null;
  }

  const data = envelope.data;
  if (!data || typeof data !== 'object') {
    return null;
  }

  if (sessionType === 'payment') {
    const launchUrl =
      data.PaymentLogInLink || data.paymentLogInLink || data.SessionLink || data.sessionLink;
    const referenceId = data.PaymentSessionIdentifier || data.paymentSessionIdentifier;
    if (!launchUrl || typeof launchUrl !== 'string') {
      return null;
    }
    return {
      provider: 'paystar',
      mode: 'api',
      launchUrl: String(launchUrl),
      ...(referenceId != null ? { referenceId: String(referenceId) } : {}),
    };
  }

  const launchUrl = data.SessionLink || data.sessionLink;
  const referenceId = data.PaymentSessionIdentifier || data.paymentSessionIdentifier;
  if (!launchUrl || typeof launchUrl !== 'string') {
    return null;
  }
  return {
    provider: 'paystar',
    mode: 'api',
    launchUrl: String(launchUrl),
    ...(referenceId != null ? { referenceId: String(referenceId) } : {}),
    ...(data.ValidUntil != null ? { expiresAt: String(data.ValidUntil) } : {}),
  };
}

/**
 * @param {string} sessionType
 * @param {Record<string, unknown>} townBody
 * @param {Record<string, string>} cors
 */
export async function tryEmbeddedSession(sessionType, townBody, cors) {
  const route = SESSION_ROUTES[sessionType];
  if (!route) {
    return {
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({
        error: `Unknown Paystar embedded sessionType: ${sessionType}`,
        documentation: PAYSTAR_EMBEDDED_DOCS_URL,
        supportedSessionTypes: EMBEDDED_SESSION_TYPES,
      }),
    };
  }

  if (!embeddedConfigured()) {
    return {
      statusCode: 501,
      headers: cors,
      body: JSON.stringify({
        error:
          'Paystar Embedded API is not configured. Set PAYSTAR_EMBEDDED_GATEWAY_BASE_URL, PAYSTAR_BUSINESS_UNIT_SLUG, and PAYSTAR_UPSTREAM_API_KEY on the town proxy.',
        documentation: PAYSTAR_EMBEDDED_DOCS_URL,
        sessionType,
        upstreamPath: route,
        plannedStatus:
          sessionType === 'payment' ? 'planned-imminent' : 'planned-future-or-deferred',
      }),
    };
  }

  const upstreamBody = buildEmbeddedUpstreamBody(sessionType, townBody);
  if (!upstreamBody) {
    return {
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({
        error: 'Could not build Paystar embedded request body.',
        documentation: PAYSTAR_EMBEDDED_DOCS_URL,
      }),
    };
  }

  const url = `${getEmbeddedGatewayBase().replace(/\/$/, '')}${route}`;
  const apiKey = getEmbeddedApiKey();

  const upstreamRes = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Paystar-Api-Key': apiKey,
      accept: 'application/json',
    },
    body: JSON.stringify(upstreamBody),
  });

  const text = await upstreamRes.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    return {
      statusCode: 502,
      headers: { ...cors, 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        error: 'Paystar Embedded API did not return JSON.',
        documentation: PAYSTAR_EMBEDDED_DOCS_URL,
        upstreamStatus: upstreamRes.status,
      }),
    };
  }

  if (!upstreamRes.ok) {
    return {
      statusCode: upstreamRes.status >= 400 && upstreamRes.status < 600 ? upstreamRes.status : 502,
      headers: { ...cors, 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        error: 'Paystar Embedded API rejected the session request.',
        documentation: PAYSTAR_EMBEDDED_DOCS_URL,
        upstreamStatus: upstreamRes.status,
        detail: json,
      }),
    };
  }

  const mapped = mapEmbeddedEnvelopeToTownLaunch(sessionType, json);
  if (!mapped) {
    return {
      statusCode: 502,
      headers: { ...cors, 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        error:
          'Paystar Embedded response missing session URL. Update mapEmbeddedEnvelopeToTownLaunch when tenant confirms response fields.',
        documentation: PAYSTAR_EMBEDDED_DOCS_URL,
        upstream: json,
      }),
    };
  }

  return {
    statusCode: 200,
    headers: { ...cors, 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(mapped),
  };
}

/**
 * Resolve session type from proxy path or body.
 * @param {string} path
 * @param {Record<string, unknown>} body
 */
export function resolveEmbeddedSessionType(path, body) {
  if (body && typeof body.sessionType === 'string' && SESSION_ROUTES[body.sessionType]) {
    return body.sessionType;
  }
  if (typeof path !== 'string') {
    return null;
  }
  if (path.includes('initiate-manage-autopay')) return 'autopay';
  if (path.includes('initiate-manage-paperless')) return 'paperless';
  if (path.includes('initiate-schedule-payment-session')) return 'oneTimeScheduledPayment';
  if (path.includes('initiate-manage-schedule-payments')) return 'manageScheduledPayments';
  if (path.includes('initiate-manage-wallet')) return 'wallet';
  if (path.includes('initiate-manage-notifications')) return 'notifications';
  if (path.includes('/embedded/initiate')) return 'payment';
  return null;
}
