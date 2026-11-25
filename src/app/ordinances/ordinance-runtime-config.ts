/**
 * Public ordinance assistant settings from `public/runtime-config.js`.
 * An empty endpoint keeps the page from calling the assistant.
 */
export interface OrdinanceRuntimeConfig {
  apiEndpoint: string;
  apiKey: string;
}

type OrdinanceRuntimeWindow = Window & {
  __TOW_RUNTIME_CONFIG__?: {
    ordinances?: {
      apiEndpoint?: string;
      apiKey?: string;
    };
  };
  __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
    ordinances?: {
      apiEndpoint?: string;
      apiKey?: string;
    };
  };
};

export function readOrdinanceRuntimeConfig(): OrdinanceRuntimeConfig {
  const runtimeWindow =
    typeof window === 'undefined' ? undefined : (window as OrdinanceRuntimeWindow);
  const config = {
    ...(runtimeWindow?.__TOW_RUNTIME_CONFIG__?.ordinances ?? {}),
    ...(runtimeWindow?.__TOW_RUNTIME_CONFIG_OVERRIDE__?.ordinances ?? {}),
  };

  return {
    apiEndpoint: typeof config.apiEndpoint === 'string' ? config.apiEndpoint.trim() : '',
    apiKey: typeof config.apiKey === 'string' ? config.apiKey.trim() : '',
  };
}
