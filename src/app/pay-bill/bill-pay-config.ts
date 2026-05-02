interface RuntimeBillPayConfig {
  apiEndpoint: string;
}

interface RuntimeConfigShape {
  billPay?: {
    apiEndpoint?: string;
  };
}

export function getBillPayRuntimeConfig(): RuntimeBillPayConfig {
  const runtimeWindow =
    typeof window === 'undefined'
      ? undefined
      : (window as Window & {
          __TOW_RUNTIME_CONFIG__?: RuntimeConfigShape;
          __TOW_RUNTIME_CONFIG_OVERRIDE__?: RuntimeConfigShape;
        });
  const runtimeConfig = runtimeWindow?.__TOW_RUNTIME_CONFIG__;
  const runtimeConfigOverride = runtimeWindow?.__TOW_RUNTIME_CONFIG_OVERRIDE__;

  return {
    apiEndpoint:
      runtimeConfigOverride?.billPay?.apiEndpoint?.trim() ||
      runtimeConfig?.billPay?.apiEndpoint?.trim() ||
      '',
  };
}
