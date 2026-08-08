/**
 * Same-origin relative return URLs only for post-login navigation.
 * Blocks open redirects via absolute/protocol-relative URLs (including encoded forms).
 */
export function sanitizeStaffReturnUrl(raw: string | null | undefined): string {
  const fallback = '/admin';
  if (!raw) {
    return fallback;
  }
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }
  if (trimmed.includes('://') || trimmed.includes('\\')) {
    return fallback;
  }
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded.startsWith('//') || decoded.includes('://') || decoded.includes('\\')) {
      return fallback;
    }
  } catch {
    return fallback;
  }
  return trimmed;
}
