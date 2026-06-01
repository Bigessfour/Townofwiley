import { afterEach, describe, expect, it } from 'vitest';
import { getBillPayRuntimeConfig } from './bill-pay-config';

type RuntimeWindow = Window & {
  __TOW_RUNTIME_CONFIG__?: { contactUpdate?: { apiEndpoint?: string } };
  __TOW_RUNTIME_CONFIG_OVERRIDE__?: { contactUpdate?: { apiEndpoint?: string } };
};

describe('getBillPayRuntimeConfig', () => {
  afterEach(() => {
    const runtimeWindow = window as RuntimeWindow;
    delete runtimeWindow.__TOW_RUNTIME_CONFIG__;
    delete runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__;
  });

  it('delegates to contactUpdate.apiEndpoint (empty override)', () => {
    const runtimeWindow = window as RuntimeWindow;
    runtimeWindow.__TOW_RUNTIME_CONFIG__ = {
      contactUpdate: { apiEndpoint: 'https://lambda.example/contact-update' },
    };
    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      contactUpdate: { apiEndpoint: '' },
    };

    expect(getBillPayRuntimeConfig()).toEqual({ apiEndpoint: '' });
  });

  it('delegates to contactUpdate override when set', () => {
    const runtimeWindow = window as RuntimeWindow;
    runtimeWindow.__TOW_RUNTIME_CONFIG__ = {
      contactUpdate: { apiEndpoint: 'https://prod.example/intake' },
    };
    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      contactUpdate: { apiEndpoint: '/api/v1/bill-pay-requests' },
    };

    expect(getBillPayRuntimeConfig()).toEqual({ apiEndpoint: '/api/v1/bill-pay-requests' });
  });

  it('reads contactUpdate runtime config when no override is present', () => {
    const runtimeWindow = window as RuntimeWindow;
    runtimeWindow.__TOW_RUNTIME_CONFIG__ = {
      contactUpdate: { apiEndpoint: 'https://prod.example/intake' },
    };

    expect(getBillPayRuntimeConfig()).toEqual({
      apiEndpoint: 'https://prod.example/intake',
    });
  });
});
