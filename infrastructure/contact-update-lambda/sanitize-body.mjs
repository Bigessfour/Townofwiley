export const ALLOWED_FIELDS = new Set([
  'fullName',
  'serviceAddress',
  'poBox',
  'phone',
  'email',
  'notes',
  'locale',
  'source',
  'accountNumber',
  'preferredContactMethod',
  'consentToContact',
]);

export const PREFERRED_CONTACT_METHODS = new Set(['email', 'phone', 'sms', 'mail']);

const FIELD_MAX_LENGTH = {
  fullName: 160,
  serviceAddress: 240,
  poBox: 80,
  phone: 40,
  email: 254,
  notes: 2000,
  locale: 8,
  source: 64,
  accountNumber: 32,
  preferredContactMethod: 16,
};

const DEFAULT_MAX = 1000;

function capString(value, maxLen) {
  return String(value ?? '').slice(0, maxLen);
}

function normalizeConsent(value) {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false;
  }
  return undefined;
}

function normalizePreferredContactMethod(value) {
  const normalized = capString(value, FIELD_MAX_LENGTH.preferredContactMethod).toLowerCase();
  return PREFERRED_CONTACT_METHODS.has(normalized) ? normalized : '';
}

function normalizeAccountNumber(value) {
  return capString(value, FIELD_MAX_LENGTH.accountNumber).replace(/[^a-zA-Z0-9-]/g, '');
}

/** Allowlisted keys only; string values capped (matches client sanitizer upper bound). */
export function sanitizeContactUpdateBody(body) {
  const input = body && typeof body === 'object' ? body : {};
  const result = {};

  for (const key of ALLOWED_FIELDS) {
    if (!(key in input)) {
      continue;
    }

    const maxLen = FIELD_MAX_LENGTH[key] ?? DEFAULT_MAX;

    if (key === 'consentToContact') {
      const consent = normalizeConsent(input[key]);
      if (consent !== undefined) {
        result.consentToContact = consent;
      }
      continue;
    }

    if (key === 'preferredContactMethod') {
      const method = normalizePreferredContactMethod(input[key]);
      if (method) {
        result.preferredContactMethod = method;
      }
      continue;
    }

    if (key === 'accountNumber') {
      const account = normalizeAccountNumber(input[key]);
      if (account) {
        result.accountNumber = account;
      }
      continue;
    }

    const value = capString(input[key], maxLen);
    if (key in input) {
      result[key] = value;
    }
  }

  return result;
}
