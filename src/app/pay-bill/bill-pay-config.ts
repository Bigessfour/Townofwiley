interface RuntimeBillPayConfig {
  apiEndpoint: string;
}

interface RuntimeConfigShape {
  billPay?: {
    apiEndpoint?: string;
  };
}

type RuntimeWindow = Window & {
  __TOW_RUNTIME_CONFIG__?: RuntimeConfigShape;
  __TOW_RUNTIME_CONFIG_OVERRIDE__?: RuntimeConfigShape;
};

export function getBillPayRuntimeConfig(): RuntimeBillPayConfig {
  if (typeof window === 'undefined') {
    return { apiEndpoint: '' };
  }

  const runtimeWindow = window as RuntimeWindow;
  const overrideEndpoint = runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.billPay?.apiEndpoint;

  if (overrideEndpoint !== undefined) {
    return { apiEndpoint: overrideEndpoint.trim() };
  }

  return {
    apiEndpoint: runtimeWindow.__TOW_RUNTIME_CONFIG__?.billPay?.apiEndpoint?.trim() ?? '',
  };
}
