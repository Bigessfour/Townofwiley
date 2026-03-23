export type PaystarMode = 'none' | 'hosted' | 'api';

export interface RuntimePaystarConfig {
  provider: 'paystar';
  mode: PaystarMode;
  portalUrl: string;
  apiEndpoint: string;
}

interface RuntimeConfigShape {
  payments?: {
    provider?: string;
    paystar?: Partial<RuntimePaystarConfig>;
  };
}

export function getPaystarRuntimeConfig(): RuntimePaystarConfig {
  const runtimeWindow =
    typeof window === 'undefined'
      ? undefined
      : (window as Window & {
          __TOW_RUNTIME_CONFIG__?: RuntimeConfigShape;
          __TOW_RUNTIME_CONFIG_OVERRIDE__?: RuntimeConfigShape;
        });
  const runtimeConfig = runtimeWindow?.__TOW_RUNTIME_CONFIG__;
  const runtimeConfigOverride = runtimeWindow?.__TOW_RUNTIME_CONFIG_OVERRIDE__;
  const paystarConfig = {
    ...(runtimeConfig?.payments?.paystar ?? {}),
    ...(runtimeConfigOverride?.payments?.paystar ?? {}),
  };
  const mode = paystarConfig.mode;

  return {
    provider: 'paystar',
    mode: mode === 'hosted' || mode === 'api' ? mode : 'none',
    portalUrl: typeof paystarConfig.portalUrl === 'string' ? paystarConfig.portalUrl : '',
    apiEndpoint: typeof paystarConfig.apiEndpoint === 'string' ? paystarConfig.apiEndpoint : '',
  };
}
