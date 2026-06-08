import { afterEach, describe, expect, it } from 'vitest';
import {
  getContactUpdateReviewRuntimeConfig,
  getContactUpdateRuntimeConfig,
  isContactReviewEndpointConfigured,
} from './contact-update-config';

type RuntimeWindow = Window & {
  __TOW_RUNTIME_CONFIG__?: {
    contactUpdate?: {
      apiEndpoint?: string;
      reviewApiEndpoint?: string;
      reviewProxyEndpoint?: string;
    };
  };
  __TOW_RUNTIME_CONFIG_OVERRIDE__?: RuntimeWindow['__TOW_RUNTIME_CONFIG__'];
};

describe('contact-update-config', () => {
  afterEach(() => {
    delete (window as RuntimeWindow).__TOW_RUNTIME_CONFIG__;
    delete (window as RuntimeWindow).__TOW_RUNTIME_CONFIG_OVERRIDE__;
  });

  it('reads reviewApiEndpoint and reviewProxyEndpoint from runtime config', () => {
    (window as RuntimeWindow).__TOW_RUNTIME_CONFIG__ = {
      contactUpdate: {
        reviewApiEndpoint: 'https://api.example/contact-updates',
        reviewProxyEndpoint: 'https://proxy.example',
      },
    };

    expect(getContactUpdateReviewRuntimeConfig()).toEqual({
      reviewApiEndpoint: 'https://api.example/contact-updates',
      reviewProxyEndpoint: 'https://proxy.example',
    });
  });

  it('prefers override for intake apiEndpoint', () => {
    (window as RuntimeWindow).__TOW_RUNTIME_CONFIG__ = {
      contactUpdate: { apiEndpoint: 'https://prod.example' },
    };
    (window as RuntimeWindow).__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      contactUpdate: { apiEndpoint: '/api/local' },
    };

    expect(getContactUpdateRuntimeConfig().apiEndpoint).toBe('/api/local');
  });

  it('rejects placeholder review API URLs', () => {
    expect(isContactReviewEndpointConfigured('')).toBe(false);
    expect(
      isContactReviewEndpointConfigured(
        'https://contact-review-not-deployed.townofwiley.local/contact-updates',
      ),
    ).toBe(false);
    expect(
      isContactReviewEndpointConfigured(
        'https://lmppzxwh3h.execute-api.us-east-2.amazonaws.com/contact-updates',
      ),
    ).toBe(true);
  });

  it('honors empty-string review overrides so E2E can force the proxy path', () => {
    (window as RuntimeWindow).__TOW_RUNTIME_CONFIG__ = {
      contactUpdate: {
        reviewApiEndpoint: 'https://api.example/contact-updates',
        reviewProxyEndpoint: '',
      },
    };
    (window as RuntimeWindow).__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      contactUpdate: {
        reviewApiEndpoint: '',
        reviewProxyEndpoint: '/api/contact-updates-review',
      },
    };

    expect(getContactUpdateReviewRuntimeConfig()).toEqual({
      reviewApiEndpoint: '',
      reviewProxyEndpoint: '/api/contact-updates-review',
    });
  });
});
