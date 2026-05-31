const MAX = {
  displayName: 80,
  message: 200,
  placeLabel: 120,
  countryCode: 8,
  locale: 8,
  pagePath: 120,
  source: 64,
};

const BLOCKED_MESSAGE =
  /\b(https?:\/\/|www\.|@[\w.-]+\.\w{2,})\b/i;

function capString(value, maxLen) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/**
 * @param {unknown} body
 */
export function sanitizeVisitBody(body) {
  const input = body && typeof body === 'object' ? body : {};
  const locale = capString(input.locale, MAX.locale).toLowerCase();
  return {
    kind: 'visit',
    pagePath: capString(input.pagePath, MAX.pagePath) || '/hello-from',
    source: capString(input.source, MAX.source) || 'hello-from',
    locale: locale === 'es' ? 'es' : 'en',
  };
}

/**
 * @param {unknown} body
 */
export function sanitizeMessageBody(body) {
  const input = body && typeof body === 'object' ? body : {};
  const message = capString(input.message, MAX.message);
  const displayName = capString(input.displayName, MAX.displayName);
  const placeLabel = capString(input.placeLabel, MAX.placeLabel);
  const countryCode = capString(input.countryCode, MAX.countryCode).toUpperCase();
  const locale = capString(input.locale, MAX.locale).toLowerCase();
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const publicConsent =
    input.publicConsent === true ||
    input.publicConsent === 'true' ||
    input.publicConsent === 1;

  if (!message || message.length < 2) {
    return { error: 'Message is required.' };
  }
  if (BLOCKED_MESSAGE.test(message)) {
    return { error: 'Links and email addresses are not allowed in messages.' };
  }
  if (!placeLabel || !countryCode) {
    return { error: 'Please choose where you are visiting from.' };
  }
  if (!publicConsent) {
    return { error: 'Consent is required to show your message publicly.' };
  }

  return {
    kind: 'message',
    message,
    displayName: displayName || 'Anonymous',
    placeLabel,
    countryCode,
    lat: Number.isFinite(lat) ? Math.max(-90, Math.min(90, lat)) : 0,
    lng: Number.isFinite(lng) ? Math.max(-180, Math.min(180, lng)) : 0,
    locale: locale === 'es' ? 'es' : 'en',
    status: 'published',
  };
}
