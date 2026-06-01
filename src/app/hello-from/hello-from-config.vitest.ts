import { afterEach, describe, expect, it } from 'vitest';
import { getGuestbookRuntimeConfig } from './hello-from-config';

describe('getGuestbookRuntimeConfig', () => {
  afterEach(() => {
    delete (window as Window & { __TOW_RUNTIME_CONFIG__?: unknown }).__TOW_RUNTIME_CONFIG__;
    delete (window as Window & { __TOW_RUNTIME_CONFIG_OVERRIDE__?: unknown })
      .__TOW_RUNTIME_CONFIG_OVERRIDE__;
  });

  it('reads apiEndpoint from runtime config', () => {
    (window as Window & { __TOW_RUNTIME_CONFIG__?: unknown }).__TOW_RUNTIME_CONFIG__ = {
      guestbook: { apiEndpoint: 'https://example.lambda-url.us-east-2.on.aws/' },
    };
    expect(getGuestbookRuntimeConfig().apiEndpoint).toBe(
      'https://example.lambda-url.us-east-2.on.aws',
    );
  });
});
