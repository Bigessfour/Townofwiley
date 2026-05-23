const DEFAULT_ALLOWED_ORIGIN = 'https://www.townofwiley.gov';

export function isAllowedOrigin(origin, allowedOrigin = DEFAULT_ALLOWED_ORIGIN) {
  if (!origin) return false;
  if (origin === allowedOrigin) return true;
  try {
    const host = new URL(origin).hostname;
    return host === 'townofwiley.gov' || host.endsWith('.townofwiley.gov');
  } catch {
    return false;
  }
}
