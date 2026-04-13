import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getChatbotRuntimeConfig } from './chatbot-config';
import { getPaystarRuntimeConfig } from './payments/paystar-config';

const configureMock = vi.hoisted(() => vi.fn());

vi.mock('aws-amplify', () => ({
  Amplify: {
    configure: configureMock,
  },
}));

interface RuntimeConfigShape {
  cms?: {
    appSync?: {
      apiEndpoint?: string;
      apiKey?: string;
    };
  };
  chatbot?: {
    mode?: 'none' | 'embed' | 'api';
    chatUrl?: string;
    apiEndpoint?: string;
  };
  payments?: {
    paystar?: {
      mode?: 'none' | 'hosted' | 'api';
      portalUrl?: string;
      apiEndpoint?: string;
    };
  };
}

const runtimeWindow = window as Window & {
  __TOW_RUNTIME_CONFIG__?: RuntimeConfigShape;
  __TOW_RUNTIME_CONFIG_OVERRIDE__?: RuntimeConfigShape;
};

beforeEach(() => {
  vi.resetModules();
  configureMock.mockClear();
  delete runtimeWindow.__TOW_RUNTIME_CONFIG__;
  delete runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__;
});

describe('runtime config helpers', () => {
  it('configures Amplify with the default CMS endpoint when no runtime config is present', async () => {
    await import('./amplify-config');

    expect(configureMock).toHaveBeenCalledTimes(1);

    const configureArg = configureMock.mock.calls[0][0] as {
      Auth: { Cognito: { allowGuestAccess: boolean; identityPoolId: string } };
      API: { GraphQL: { endpoint: string; apiKey: string } };
      Storage: { S3: { bucket: string; region: string } };
    };

    expect(configureArg.Auth.Cognito.allowGuestAccess).toBe(true);
    expect(configureArg.Auth.Cognito.identityPoolId).toBe('us-east-2:2c69cd53-7ed6-4032-9e65-b5492cd36e56');
    expect(configureArg.API.GraphQL.endpoint).toBe(
      'https://327diwc6cvdqjocdudvrdv7wwu.appsync-api.us-east-2.amazonaws.com/graphql',
    );
    expect(configureArg.API.GraphQL.apiKey).toBe('');
    expect(configureArg.Storage.S3.bucket).toBe('townofwiley-documents-storage');
    expect(configureArg.Storage.S3.region).toBe('us-east-2');
  });

  it('uses the configured Amplify CMS settings when they are present', async () => {
    runtimeWindow.__TOW_RUNTIME_CONFIG__ = {
      cms: {
        appSync: {
          apiEndpoint: 'https://cms.example.com/graphql',
          apiKey: 'base-key',
        },
      },
    };
    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      cms: {
        appSync: {
          apiEndpoint: 'https://cms-override.example.com/graphql',
          apiKey: 'override-key',
        },
      },
    };

    await import('./amplify-config');

    const configureArg = configureMock.mock.calls[0][0] as {
      API: { GraphQL: { endpoint: string; apiKey: string } };
    };

    expect(configureArg.API.GraphQL.endpoint).toBe('https://cms.example.com/graphql');
    expect(configureArg.API.GraphQL.apiKey).toBe('base-key');
  });

  it('normalizes chatbot runtime config and prefers overrides', () => {
    runtimeWindow.__TOW_RUNTIME_CONFIG__ = {
      chatbot: {
        mode: 'embed',
        chatUrl: 'https://chat.example.com/embed',
        apiEndpoint: 'https://chat.example.com/api',
      },
    };
    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      chatbot: {
        mode: 'api',
        chatUrl: 'https://chat.example.com/override',
        apiEndpoint: 'https://chat.example.com/override-api',
      },
    };

    expect(getChatbotRuntimeConfig()).toEqual({
      provider: 'easyPeasy',
      mode: 'api',
      chatUrl: 'https://chat.example.com/override',
      apiEndpoint: 'https://chat.example.com/override-api',
    });
  });

  it('normalizes Paystar runtime config and prefers overrides', () => {
    runtimeWindow.__TOW_RUNTIME_CONFIG__ = {
      payments: {
        paystar: {
          mode: 'hosted',
          portalUrl: 'https://paystar.example.com/portal',
          apiEndpoint: 'https://paystar.example.com/api',
        },
      },
    };
    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      payments: {
        paystar: {
          mode: 'api',
          portalUrl: 'https://paystar.example.com/override',
          apiEndpoint: 'https://paystar.example.com/override-api',
        },
      },
    };

    expect(getPaystarRuntimeConfig()).toEqual({
      provider: 'paystar',
      mode: 'api',
      portalUrl: 'https://paystar.example.com/override',
      apiEndpoint: 'https://paystar.example.com/override-api',
    });
  });
});