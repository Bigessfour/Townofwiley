export type ChatbotMode = 'none' | 'embed' | 'api';

export interface RuntimeChatbotConfig {
  provider: 'easyPeasy';
  mode: ChatbotMode;
  chatUrl: string;
  apiEndpoint: string;
}

interface RuntimeConfigShape {
  chatbot?: Partial<RuntimeChatbotConfig>;
}

declare global {
  interface Window {
    __TOW_RUNTIME_CONFIG__?: RuntimeConfigShape;
    __TOW_RUNTIME_CONFIG_OVERRIDE__?: RuntimeConfigShape;
  }
}

const defaultChatbotConfig: RuntimeChatbotConfig = {
  provider: 'easyPeasy',
  mode: 'none',
  chatUrl: '',
  apiEndpoint: '',
};

export function getChatbotRuntimeConfig(): RuntimeChatbotConfig {
  const runtimeConfig = typeof window === 'undefined' ? undefined : window.__TOW_RUNTIME_CONFIG__;
  const runtimeConfigOverride =
    typeof window === 'undefined' ? undefined : window.__TOW_RUNTIME_CONFIG_OVERRIDE__;
  const chatbotConfig = {
    ...(runtimeConfig?.chatbot ?? {}),
    ...(runtimeConfigOverride?.chatbot ?? {}),
  };
  const mode = chatbotConfig.mode;

  return {
    provider: 'easyPeasy',
    mode: mode === 'api' || mode === 'embed' ? mode : 'none',
    chatUrl: typeof chatbotConfig.chatUrl === 'string' ? chatbotConfig.chatUrl : '',
    apiEndpoint: typeof chatbotConfig.apiEndpoint === 'string' ? chatbotConfig.apiEndpoint : '',
  };
}
