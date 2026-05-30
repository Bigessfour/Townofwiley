interface RuntimeContactUpdateConfig {
  apiEndpoint: string;
}

export interface RuntimeContactUpdateReviewConfig {
  /** JWT-protected API Gateway URL (CONTACT_UPDATE_REVIEW_API_URL). Preferred in production. */
  reviewApiEndpoint: string;
  /** Public proxy Function URL (SigV4 to IAM review Lambda). Never the raw IAM review URL. */
  reviewProxyEndpoint: string;
}

interface RuntimeConfigShape {
  contactUpdate?: {
    apiEndpoint?: string;
    reviewApiEndpoint?: string;
    reviewProxyEndpoint?: string;
  };
}

export function getContactUpdateRuntimeConfig(): RuntimeContactUpdateConfig {
  const runtimeWindow =
    typeof window === 'undefined'
      ? undefined
      : (window as Window & {
          __TOW_RUNTIME_CONFIG__?: RuntimeConfigShape;
          __TOW_RUNTIME_CONFIG_OVERRIDE__?: RuntimeConfigShape;
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

export function getContactUpdateReviewRuntimeConfig(): RuntimeContactUpdateReviewConfig {
  const runtimeWindow =
    typeof window === 'undefined'
      ? undefined
      : (window as Window & {
          __TOW_RUNTIME_CONFIG__?: RuntimeConfigShape;
          __TOW_RUNTIME_CONFIG_OVERRIDE__?: RuntimeConfigShape;
        });
  const runtimeConfig = runtimeWindow?.__TOW_RUNTIME_CONFIG__;
  const runtimeConfigOverride = runtimeWindow?.__TOW_RUNTIME_CONFIG_OVERRIDE__;

  const pick = (key: 'reviewApiEndpoint' | 'reviewProxyEndpoint'): string =>
    runtimeConfigOverride?.contactUpdate?.[key]?.trim() ||
    runtimeConfig?.contactUpdate?.[key]?.trim() ||
    '';

  return {
    reviewApiEndpoint: pick('reviewApiEndpoint'),
    reviewProxyEndpoint: pick('reviewProxyEndpoint'),
  };
}
