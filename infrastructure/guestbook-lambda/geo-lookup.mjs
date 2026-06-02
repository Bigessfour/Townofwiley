import { createHash } from 'node:crypto';

const PRIVATE_IP = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc00:|fd)/;

/**
 * @param {string | undefined} forwardedFor
 * @returns {string}
 */
export function extractClientIp(forwardedFor) {
  if (!forwardedFor || typeof forwardedFor !== 'string') {
    return '';
  }
  const first = forwardedFor.split(',')[0]?.trim() ?? '';
  return first;
}

/**
 * @param {string} ip
 * @param {string} salt
 */
export function hashIp(ip, salt) {
  if (!ip) {
    return '';
  }
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 24);
}

/**
 * Coarse geo from IP (server-side only). Returns null when lookup fails.
 * @param {string} ip
 * @returns {Promise<{ countryCode: string; countryName: string; region: string; city: string; lat: number; lng: number } | null>}
 */
export async function lookupGeoFromIp(ip) {
  if (!ip || PRIVATE_IP.test(ip)) {
    return null;
  }

  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,lat,lon`;
    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (data.status !== 'success') {
      return null;
    }
    return {
      countryCode: String(data.countryCode ?? '').slice(0, 8),
      countryName: String(data.country ?? '').slice(0, 120),
      region: String(data.regionName ?? '').slice(0, 120),
      city: String(data.city ?? '').slice(0, 120),
      lat: typeof data.lat === 'number' ? data.lat : 0,
      lng: typeof data.lon === 'number' ? data.lon : 0,
    };
  } catch {
    return null;
  }
}

/**
 * CloudFront viewer headers when present (Amplify Hosting edge).
 * @param {Record<string, string | undefined>} headers
 */
export function readCloudFrontGeo(headers) {
  const country =
    headers['cloudfront-viewer-country'] ?? headers['CloudFront-Viewer-Country'] ?? '';
  const region =
    headers['cloudfront-viewer-country-region'] ??
    headers['CloudFront-Viewer-Country-Region'] ??
    '';
  if (!country) {
    return null;
  }
  return {
    countryCode: String(country).slice(0, 8).toUpperCase(),
    countryName: '',
    region: String(region).slice(0, 120),
    city: '',
    lat: 0,
    lng: 0,
  };
}
