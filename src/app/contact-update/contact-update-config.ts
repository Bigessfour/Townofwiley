import { readAdminRuntimeConfig } from '../admin-runtime-config';

interface RuntimeContactUpdateConfig {
  apiEndpoint: string;
}

export interface RuntimeContactUpdateReviewConfig {
  /** JWT-protected API Gateway URL (CONTACT_UPDATE_REVIEW_API_URL). Preferred in production. */
  reviewApiEndpoint: string;
  /** Public proxy Function URL (SigV4 to IAM review Lambda). Never the raw IAM review URL. */
  reviewProxyEndpoint: string;
}

interface PublicRuntimeConfigShape {
  contactUpdate?: {
    apiEndpoint?: string;
  };
}

export function getContactUpdateRuntimeConfig(): RuntimeContactUpdateConfig {
  const runtimeWindow =
    typeof window === 'undefined'
      ? undefined
      : (window as Window & {
          __TOW_RUNTIME_CONFIG__?: PublicRuntimeConfigShape;
          __TOW_RUNTIME_CONFIG_OVERRIDE__?: PublicRuntimeConfigShape;
        });
  const runtimeConfig = runtimeWindow?.__TOW_RUNTIME_CONFIG__;
  const runtimeConfigOverride = runtimeWindow?.__TOW_RUNTIME_CONFIG_OVERRIDE__;
  const overrideEndpoint = runtimeConfigOverride?.contactUpdate?.apiEndpoint;

  if (overrideEndpoint !== undefined) {
    return { apiEndpoint: overrideEndpoint.trim() };
  }

  return {
    apiEndpoint: runtimeConfig?.contactUpdate?.apiEndpoint?.trim() ?? '',
  };
}

/** Staff review URLs come from `/runtime-config-admin.js`, not the public bundle. */
export function getContactUpdateReviewRuntimeConfig(): RuntimeContactUpdateReviewConfig {
  const admin = readAdminRuntimeConfig()?.contactUpdate;
  return {
    reviewApiEndpoint: admin?.reviewApiEndpoint?.trim() ?? '',
    reviewProxyEndpoint: admin?.reviewProxyEndpoint?.trim() ?? '',
  };
}

const CONTACT_REVIEW_PLACEHOLDER_MARKERS = [
  'contact-review-not-deployed',
  '.townofwiley.local',
] as const;

/** True when runtime-config exposes a real HTTP(S) review URL (not a build placeholder). */
export function isContactReviewEndpointConfigured(endpoint: string): boolean {
  const trimmed = endpoint.trim();
  if (!trimmed.startsWith('https://')) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  return !CONTACT_REVIEW_PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}
