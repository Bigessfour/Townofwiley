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

/** Gen 1 production Cognito (fallback when runtime-config.js omits auth — e.g. local ng serve).
 *  SSOT: infrastructure/gen1-production-bindings.json
 *  Hosted UI: https://townofwiley-staff.auth.us-east-2.amazoncognito.com
 */
const GEN1_COGNITO_FALLBACK = {
  userPoolId: 'us-east-2_DmY7BCBIp',
  userPoolClientId: '2m6vp91m9938jpbg2efivr2p8k',
  identityPoolId: 'us-east-2:2c69cd53-7ed6-4032-9e65-b5492cd36e56',
} as const;

/** Cognito identifiers for staff admin (see docs/admin-auth-runbook.md). */
export const cognitoConfig = {
  userPoolId: runtimeAuth?.userPoolId ?? GEN1_COGNITO_FALLBACK.userPoolId,
  userPoolClientId: runtimeAuth?.userPoolClientId ?? GEN1_COGNITO_FALLBACK.userPoolClientId,
  identityPoolId: runtimeAuth?.identityPoolId ?? GEN1_COGNITO_FALLBACK.identityPoolId,
  staffGroup: 'Staff',
} as const;

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: cognitoConfig.userPoolId,
      userPoolClientId: cognitoConfig.userPoolClientId,
      identityPoolId: cognitoConfig.identityPoolId,
      allowGuestAccess: true,
      // Hosted UI / OAuth support for "redirect to Cognito sign in".
      // Client has CallbackURLs for /admin/login; domain prefix townofwiley-staff.
      // Both direct signIn (custom form) and signInWithRedirect are supported.
      loginWith: {
        oauth: {
          domain: 'townofwiley-staff.auth.us-east-2.amazoncognito.com',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [
            'https://townofwiley.gov/admin/login',
            'https://www.townofwiley.gov/admin/login',
            'http://localhost:4200/admin/login',
          ],
          redirectSignOut: [
            'https://townofwiley.gov/admin',
            'https://www.townofwiley.gov/admin',
            'http://localhost:4200/admin',
          ],
          responseType: 'code',
        },
      },
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
