/**
 * Shared CMS media URL helpers for staff upload + public hero resolution.
 * Temporary S3 GetObject URLs must never be stored as SiteSettings.heroImageUrl.
 */

export const DEFAULT_HERO_IMAGE_PATH = '/hero-wiley.webp';

/** AWS SigV4 / temporary GetObject query params — not durable for public homepage media. */
const EPHEMERAL_ASSET_URL_PATTERN =
  /X-Amz-(?:Signature|Expires|Credential|Security-Token)=/i;

/**
 * True when a URL is a short-lived S3 (or similar) signed object URL.
 * Clerks must not save these into CMS fields rendered on the public site.
 */
export function isEphemeralCmsAssetUrl(url?: string | null): boolean {
  const trimmed = typeof url === 'string' ? url.trim() : '';
  if (!trimmed) {
    return false;
  }
  return EPHEMERAL_ASSET_URL_PATTERN.test(trimmed);
}

/**
 * Resolve a durable public hero URL. CMS clerks sometimes paste short-lived
 * S3 presigned URLs that break after expiry — fall back to the bundled asset.
 */
export function resolvePublicHeroImageUrl(url?: string | null): string {
  const trimmed = typeof url === 'string' ? url.trim() : '';
  if (!trimmed || isEphemeralCmsAssetUrl(trimmed)) {
    return DEFAULT_HERO_IMAGE_PATH;
  }
  return trimmed;
}

/** True when a hero field value is safe to publish to visitors. */
export function isDurablePublicHeroImageUrl(url?: string | null): boolean {
  const trimmed = typeof url === 'string' ? url.trim() : '';
  if (!trimmed) {
    return false;
  }
  if (isEphemeralCmsAssetUrl(trimmed)) {
    return false;
  }
  // Relative site asset or absolute http(s) without signature query.
  if (trimmed.startsWith('/')) {
    return true;
  }
  return /^https?:\/\//i.test(trimmed);
}
