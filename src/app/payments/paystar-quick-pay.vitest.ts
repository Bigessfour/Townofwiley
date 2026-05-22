import { describe, expect, it } from 'vitest';
import type { RuntimePaystarConfig } from './paystar-config';
import { resolveQuickPayHref } from './paystar-quick-pay';

function cfg(partial: Partial<RuntimePaystarConfig>): RuntimePaystarConfig {
  return {
    provider: 'paystar',
    mode: 'none',
    portalUrl: '',
    apiEndpoint: '',
    ...partial,
  };
}

describe('resolveQuickPayHref', () => {
  it('disables the CTA when Paystar mode is none', () => {
    expect(resolveQuickPayHref(cfg({ mode: 'none' }))).toEqual({
      href: null,
      isPlaceholder: false,
      disabled: true,
    });
  });

  it('returns the configured portal URL for hosted mode', () => {
    expect(
      resolveQuickPayHref(
        cfg({ mode: 'hosted', portalUrl: 'https://secure.paystar.io/pay/townofwiley-utility' }),
      ),
    ).toEqual({
      href: 'https://secure.paystar.io/pay/townofwiley-utility',
      isPlaceholder: false,
      disabled: false,
    });
  });

  it('disables without a placeholder href when hosted mode has an empty portalUrl', () => {
    expect(resolveQuickPayHref(cfg({ mode: 'hosted', portalUrl: '' }))).toEqual({
      href: null,
      isPlaceholder: true,
      disabled: true,
    });
  });

  it('disables without a placeholder href when api mode has no portalUrl', () => {
    expect(
      resolveQuickPayHref(
        cfg({ mode: 'api', portalUrl: '', apiEndpoint: 'https://api.example/paystar' }),
      ),
    ).toEqual({
      href: null,
      isPlaceholder: true,
      disabled: true,
    });
  });

  it('trims whitespace from portalUrl', () => {
    expect(
      resolveQuickPayHref(cfg({ mode: 'hosted', portalUrl: '  https://pay.example/  ' })),
    ).toEqual({
      href: 'https://pay.example/',
      isPlaceholder: false,
      disabled: false,
    });
  });
});
