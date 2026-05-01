import { afterEach, describe, expect, it } from 'vitest';
import { getPaystarRuntimeConfig } from './paystar-config';

describe('getPaystarRuntimeConfig', () => {
  afterEach(() => {
    delete (window as Window & { __TOW_RUNTIME_CONFIG__?: unknown }).__TOW_RUNTIME_CONFIG__;
    delete (window as Window & { __TOW_RUNTIME_CONFIG_OVERRIDE__?: unknown })
      .__TOW_RUNTIME_CONFIG_OVERRIDE__;
  });

  it('returns none mode with empty URLs when unset', () => {
    expect(getPaystarRuntimeConfig()).toEqual({
      provider: 'paystar',
      mode: 'none',
      portalUrl: '',
      apiEndpoint: '',
    });
  });

  it('reads hosted mode from base runtime config', () => {
    (window as Window & { __TOW_RUNTIME_CONFIG__?: object }).__TOW_RUNTIME_CONFIG__ = {
      payments: {
        paystar: {
          mode: 'hosted',
          portalUrl: 'https://pay.example/hosted',
          apiEndpoint: 'ignored',
        },
      },
    };

    expect(getPaystarRuntimeConfig()).toEqual({
      provider: 'paystar',
      mode: 'hosted',
      portalUrl: 'https://pay.example/hosted',
      apiEndpoint: 'ignored',
    });
  });

  it('override wins over base for mode and endpoints', () => {
    (window as Window & { __TOW_RUNTIME_CONFIG__?: object }).__TOW_RUNTIME_CONFIG__ = {
      payments: {
        paystar: {
          mode: 'hosted',
          portalUrl: 'https://old.example',
          apiEndpoint: '/old',
        },
      },
    };
    (
      window as Window & { __TOW_RUNTIME_CONFIG_OVERRIDE__?: object }
    ).__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      payments: {
        paystar: {
          mode: 'api',
          apiEndpoint: '/e2e-mock-paystar',
          portalUrl: '',
        },
      },
    };

    expect(getPaystarRuntimeConfig()).toEqual({
      provider: 'paystar',
      mode: 'api',
      portalUrl: '',
      apiEndpoint: '/e2e-mock-paystar',
    });
  });

  it('treats invalid mode as none', () => {
    (window as Window & { __TOW_RUNTIME_CONFIG__?: object }).__TOW_RUNTIME_CONFIG__ = {
      payments: { paystar: { mode: 'invalid' as never, portalUrl: 'x', apiEndpoint: 'y' } },
    };

    expect(getPaystarRuntimeConfig().mode).toBe('none');
  });

  it('coerces non-string URLs to empty string', () => {
    (window as Window & { __TOW_RUNTIME_CONFIG__?: object }).__TOW_RUNTIME_CONFIG__ = {
      payments: { paystar: { mode: 'api', portalUrl: 123 as never, apiEndpoint: null as never } },
    };

    const cfg = getPaystarRuntimeConfig();
    expect(cfg.portalUrl).toBe('');
    expect(cfg.apiEndpoint).toBe('');
  });
});
