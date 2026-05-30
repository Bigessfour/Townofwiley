import { Amplify } from 'aws-amplify';

interface AppRuntimeConfig {
  cms?: {
    appSync?: {
      apiEndpoint?: string;
      apiKey?: string;
      region?: string;
    };
  };
  auth?: {
    cognito?: {
      userPoolId?: string;
      userPoolClientId?: string;
      identityPoolId?: string;
    };
  };
  storage?: {
    s3?: {
      bucket?: string;
      region?: string;
    };
  };
}

const runtimeConfig =
  typeof window === 'undefined'
    ? undefined
    : ((window as Window & { __TOW_RUNTIME_CONFIG__?: AppRuntimeConfig }).__TOW_RUNTIME_CONFIG__ ??
      undefined);
const cmsAppSyncConfig = runtimeConfig?.cms?.appSync;
const runtimeAuth = runtimeConfig?.auth?.cognito;
const runtimeStorage = runtimeConfig?.storage?.s3;

/** Cognito identifiers for staff admin (see docs/admin-auth-runbook.md). */
export const cognitoConfig = {
  userPoolId: runtimeAuth?.userPoolId ?? 'us-east-2_DmY7BCBIp',
  userPoolClientId: runtimeAuth?.userPoolClientId ?? '2m6vp91m9938jpbg2efivr2p8k',
  identityPoolId: runtimeAuth?.identityPoolId ?? 'us-east-2:2c69cd53-7ed6-4032-9e65-b5492cd36e56',
  staffGroup: 'Staff',
} as const;

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: cognitoConfig.userPoolId,
      userPoolClientId: cognitoConfig.userPoolClientId,
      identityPoolId: cognitoConfig.identityPoolId,
      allowGuestAccess: true,
    },
  },
  API: {
    GraphQL: {
      endpoint:
        cmsAppSyncConfig?.apiEndpoint ??
        'https://327diwc6cvdqjocdudvrdv7wwu.appsync-api.us-east-2.amazonaws.com/graphql',
      defaultAuthMode: 'apiKey',
      apiKey: cmsAppSyncConfig?.apiKey ?? '',
    },
  },
  Storage: {
    S3: {
      bucket: runtimeStorage?.bucket ?? 'townofwiley-documents-storage-main',
      region: runtimeStorage?.region ?? cmsAppSyncConfig?.region ?? 'us-east-2',
    },
  },
});
