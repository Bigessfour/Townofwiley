export const ALLOWED_FIELDS = new Set([
  'fullName',
  'serviceAddress',
  'poBox',
  'phone',
  'email',
  'notes',
  'locale',
  'source',
]);

const FIELD_MAX_LENGTH = 1000;

/** Allowlisted keys only; string values capped (matches client sanitizer upper bound). */
export function sanitizeContactUpdateBody(body) {
  return Object.fromEntries(
    Object.entries(body)
      .filter(([k]) => ALLOWED_FIELDS.has(k))
      .map(([k, v]) => [k, String(v ?? '').slice(0, FIELD_MAX_LENGTH)]),
  );
}
