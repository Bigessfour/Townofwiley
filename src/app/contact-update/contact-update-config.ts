interface RuntimeContactUpdateConfig {
  apiEndpoint: string;
}

export interface RuntimeContactUpdateReviewConfig {
  /** Public proxy Function URL (SigV4 to IAM review Lambda). Never the raw IAM review URL. */
  reviewProxyEndpoint: string;
}

interface RuntimeConfigShape {
  contactUpdate?: {
    apiEndpoint?: string;
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

  return {
    apiEndpoint:
      runtimeConfigOverride?.contactUpdate?.apiEndpoint?.trim() ||
      runtimeConfig?.contactUpdate?.apiEndpoint?.trim() ||
      '',
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

  return {
    reviewProxyEndpoint:
      runtimeConfigOverride?.contactUpdate?.reviewProxyEndpoint?.trim() ||
      runtimeConfig?.contactUpdate?.reviewProxyEndpoint?.trim() ||
      '',
  };
}
