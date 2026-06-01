import { afterEach, describe, expect, it, vi } from 'vitest';
import { readWeatherRuntimeConfig } from './weather-runtime-config';

describe('readWeatherRuntimeConfig', () => {
  afterEach(() => {
    delete (window as Window & { __TOW_RUNTIME_CONFIG__?: unknown }).__TOW_RUNTIME_CONFIG__;
    delete (window as Window & { __TOW_RUNTIME_CONFIG_OVERRIDE__?: unknown })
      .__TOW_RUNTIME_CONFIG_OVERRIDE__;
    vi.unstubAllGlobals();
  });

  it('does not throw when import.meta.env is undefined (production bundle shape)', () => {
    vi.stubGlobal('import', { meta: {} });

    (window as Window & { __TOW_RUNTIME_CONFIG__?: unknown }).__TOW_RUNTIME_CONFIG__ = {
      weather: {
        apiEndpoint: 'https://example.lambda-url.us-east-2.on.aws/',
        allowBrowserFallback: false,
      },
    };

    expect(() => readWeatherRuntimeConfig()).not.toThrow();
    expect(readWeatherRuntimeConfig().apiEndpoint).toBe(
      'https://example.lambda-url.us-east-2.on.aws/',
    );
  });
});
