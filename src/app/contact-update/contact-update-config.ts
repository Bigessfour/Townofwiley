interface RuntimeContactUpdateConfig {
  apiEndpoint: string;
}

interface RuntimeConfigShape {
  contactUpdate?: {
    apiEndpoint?: string;
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
