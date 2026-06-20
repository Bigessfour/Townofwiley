import { afterEach, describe, expect, it } from 'vitest';
import { getPaystarRuntimeConfig } from './paystar-config';

describe('getPaystarRuntimeConfig', () => {
  afterEach(() => {
    delete (window as Window & { __TOW_RUNTIME_CONFIG__?: unknown }).__TOW_RUNTIME_CONFIG__;
    delete (window as Window & { __TOW_RUNTIME_CONFIG_OVERRIDE__?: unknown })
      .__TOW_RUNTIME_CONFIG_OVERRIDE__;
  });

  it('returns none mode with empty portalUrl when unset', () => {
    expect(getPaystarRuntimeConfig()).toEqual({
      provider: 'paystar',
      mode: 'none',
      portalUrl: '',
    });
  });

  it('reads hosted mode from base runtime config', () => {
    (window as Window & { __TOW_RUNTIME_CONFIG__?: object }).__TOW_RUNTIME_CONFIG__ = {
      payments: {
        paystar: {
          mode: 'hosted',
          portalUrl: 'https://pay.example/hosted',
        },
      },
    };

    expect(getPaystarRuntimeConfig()).toEqual({
      provider: 'paystar',
      mode: 'hosted',
      portalUrl: 'https://pay.example/hosted',
    });
  });

  it('override wins over base for mode and portalUrl', () => {
    (window as Window & { __TOW_RUNTIME_CONFIG__?: object }).__TOW_RUNTIME_CONFIG__ = {
      payments: {
        paystar: {
          mode: 'hosted',
          portalUrl: 'https://old.example',
        },
      },
    };
    (
      window as Window & { __TOW_RUNTIME_CONFIG_OVERRIDE__?: object }
    ).__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      payments: {
        paystar: {
          mode: 'none',
          portalUrl: '',
        },
      },
    };

    expect(getPaystarRuntimeConfig()).toEqual({
      provider: 'paystar',
      mode: 'none',
      portalUrl: '',
    });
  });

  it('treats invalid mode as none', () => {
    (window as Window & { __TOW_RUNTIME_CONFIG__?: object }).__TOW_RUNTIME_CONFIG__ = {
      payments: { paystar: { mode: 'invalid' as never, portalUrl: 'x' } },
    };

    expect(getPaystarRuntimeConfig().mode).toBe('none');
  });

  it('treats legacy api mode as none', () => {
    (window as Window & { __TOW_RUNTIME_CONFIG__?: object }).__TOW_RUNTIME_CONFIG__ = {
      payments: { paystar: { mode: 'api' as never, portalUrl: 'https://pay.example' } },
    };

    expect(getPaystarRuntimeConfig()).toEqual({
      provider: 'paystar',
      mode: 'none',
      portalUrl: 'https://pay.example',
    });
  });

  it('coerces non-string portalUrl to empty string', () => {
    (window as Window & { __TOW_RUNTIME_CONFIG__?: object }).__TOW_RUNTIME_CONFIG__ = {
      payments: { paystar: { mode: 'hosted', portalUrl: 123 as never } },
    };

    expect(getPaystarRuntimeConfig().portalUrl).toBe('');
  });
});
