import { afterEach, describe, expect, it } from 'vitest';
import { getBillPayRuntimeConfig } from './bill-pay-config';

type RuntimeWindow = Window & {
  __TOW_RUNTIME_CONFIG__?: { billPay?: { apiEndpoint?: string } };
  __TOW_RUNTIME_CONFIG_OVERRIDE__?: { billPay?: { apiEndpoint?: string } };
};

describe('getBillPayRuntimeConfig', () => {
  afterEach(() => {
    const runtimeWindow = window as RuntimeWindow;
    delete runtimeWindow.__TOW_RUNTIME_CONFIG__;
    delete runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__;
  });

  it('uses an explicit empty override instead of falling through to runtime config', () => {
    const runtimeWindow = window as RuntimeWindow;
    runtimeWindow.__TOW_RUNTIME_CONFIG__ = {
      billPay: { apiEndpoint: 'https://api.wiley.gov/api/v1/bill-pay-requests' },
    };
    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      billPay: { apiEndpoint: '' },
    };

    expect(getBillPayRuntimeConfig()).toEqual({ apiEndpoint: '' });
  });

  it('prefers a non-empty override over runtime config', () => {
    const runtimeWindow = window as RuntimeWindow;
    runtimeWindow.__TOW_RUNTIME_CONFIG__ = {
      billPay: { apiEndpoint: 'https://prod.example/api/v1/bill-pay-requests' },
    };
    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      billPay: { apiEndpoint: '/api/v1/bill-pay-requests' },
    };

    expect(getBillPayRuntimeConfig()).toEqual({ apiEndpoint: '/api/v1/bill-pay-requests' });
  });

  it('reads runtime config when no override is present', () => {
    const runtimeWindow = window as RuntimeWindow;
    runtimeWindow.__TOW_RUNTIME_CONFIG__ = {
      billPay: { apiEndpoint: 'https://prod.example/api/v1/bill-pay-requests' },
    };

    expect(getBillPayRuntimeConfig()).toEqual({
      apiEndpoint: 'https://prod.example/api/v1/bill-pay-requests',
    });
  });
});
