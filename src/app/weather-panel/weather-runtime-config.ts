/**
 * Browser runtime weather settings from `public/runtime-config.js`
 * (`window.__TOW_RUNTIME_CONFIG__` / `__TOW_RUNTIME_CONFIG_OVERRIDE__`).
 */
export interface WeatherRuntimeAlertSignupConfig {
  enabled: boolean;
  apiEndpoint: string;
}

export interface WeatherRuntimeConfig {
  apiEndpoint: string;
  allowBrowserFallback: boolean;
  alertSignup: WeatherRuntimeAlertSignupConfig;
}

type RuntimeWeatherWindow = Window & {
  __TOW_RUNTIME_CONFIG__?: {
    weather?: {
      apiEndpoint?: string;
      allowBrowserFallback?: boolean;
      alertSignup?: {
        enabled?: boolean;
        apiEndpoint?: string;
      };
    };
  };
  __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
    weather?: {
      apiEndpoint?: string;
      allowBrowserFallback?: boolean;
      alertSignup?: {
        enabled?: boolean;
        apiEndpoint?: string;
      };
    };
  };
};

export function readWeatherRuntimeConfig(): WeatherRuntimeConfig {
  const runtimeWindow =
    typeof window === 'undefined' ? undefined : (window as RuntimeWeatherWindow);
  const weatherConfig = {
    ...(runtimeWindow?.__TOW_RUNTIME_CONFIG__?.weather ?? {}),
    ...(runtimeWindow?.__TOW_RUNTIME_CONFIG_OVERRIDE__?.weather ?? {}),
  };

  return {
    apiEndpoint: typeof weatherConfig.apiEndpoint === 'string' ? weatherConfig.apiEndpoint : '',
    allowBrowserFallback: weatherConfig.allowBrowserFallback !== false,
    alertSignup: {
      enabled: weatherConfig.alertSignup?.enabled !== false,
      apiEndpoint:
        typeof weatherConfig.alertSignup?.apiEndpoint === 'string'
          ? weatherConfig.alertSignup.apiEndpoint
          : '',
    },
  };
}
