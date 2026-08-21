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
      /** Hosted UI hostname, e.g. tow-gov-staff.auth.us-east-2.amazoncognito.com */
      oauthDomain?: string;
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

/**
 * Town-account Cognito fallback when runtime-config.js omits auth (e.g. local ng serve).
 * SSOT: infrastructure/gen1-production-bindings.json (updated for tow CMS cutover).
 * Hosted UI: https://tow-gov-staff.auth.us-east-2.amazoncognito.com
 */
const TOW_COGNITO_FALLBACK = {
  userPoolId: 'us-east-2_bHk9UcenK',
  userPoolClientId: '258binbcvsms0rfqj5g20qakki',
  identityPoolId: 'us-east-2:86cc6af6-6075-4dd4-a689-1f8b6e760156',
  oauthDomain: 'tow-gov-staff.auth.us-east-2.amazoncognito.com',
} as const;

/** Cognito identifiers for staff admin (see docs/admin-auth-runbook.md). */
export const cognitoConfig = {
  userPoolId: runtimeAuth?.userPoolId ?? TOW_COGNITO_FALLBACK.userPoolId,
  userPoolClientId: runtimeAuth?.userPoolClientId ?? TOW_COGNITO_FALLBACK.userPoolClientId,
  identityPoolId: runtimeAuth?.identityPoolId ?? TOW_COGNITO_FALLBACK.identityPoolId,
  oauthDomain: runtimeAuth?.oauthDomain ?? TOW_COGNITO_FALLBACK.oauthDomain,
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
      // Both direct signIn (custom form) and signInWithRedirect are supported.
      loginWith: {
        oauth: {
          domain: cognitoConfig.oauthDomain,
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
        'https://g6p4g3eyqjhmpctbbvtduj3h7m.appsync-api.us-east-2.amazonaws.com/graphql',
      defaultAuthMode: 'apiKey',
      apiKey: cmsAppSyncConfig?.apiKey ?? '',
    },
  },
  Storage: {
    S3: {
      bucket: runtimeStorage?.bucket ?? 'townofwiley-documents-storage-818904800844',
      region: runtimeStorage?.region ?? cmsAppSyncConfig?.region ?? 'us-east-2',
    },
  },
});
