interface RuntimeGuestbookConfig {
  apiEndpoint?: string;
}

interface RuntimeConfigShape {
  guestbook?: RuntimeGuestbookConfig;
}

export function getGuestbookRuntimeConfig(): { apiEndpoint: string } {
  const runtimeWindow =
    typeof window === 'undefined'
      ? undefined
      : (window as Window & {
          __TOW_RUNTIME_CONFIG__?: RuntimeConfigShape;
          __TOW_RUNTIME_CONFIG_OVERRIDE__?: RuntimeConfigShape;
        });
  const endpoint =
    runtimeWindow?.__TOW_RUNTIME_CONFIG_OVERRIDE__?.guestbook?.apiEndpoint?.trim() ||
    runtimeWindow?.__TOW_RUNTIME_CONFIG__?.guestbook?.apiEndpoint?.trim() ||
    '';

  return { apiEndpoint: endpoint.replace(/\/$/, '') };
}
