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
      hostedUiDomain?: string;
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
 * Gen 2 production CMS AppSync GraphQL endpoint (preferred fallback when runtime-config.js is absent,
 * e.g. local `ng serve`). Runtime-injected value (from APPSYNC_CMS_ENDPOINT) always wins in prod deploys.
 * Cross-ref: infrastructure/gen2-production-bindings.json (apiId x7poehudqvamneqni5s6e2cjxy).
 */
const GEN2_CMS_GRAPHQL_FALLBACK =
  'https://fpm2ifkbfnb7hphqsck6dj66wq.appsync-api.us-east-2.amazonaws.com/graphql';

/** Gen 2 production Cognito (fallback when runtime-config.js is absent — e.g. local ng serve). */
const GEN2_COGNITO_FALLBACK = {
  userPoolId: 'us-east-2_pkewJMUJF',
  userPoolClientId: '2av73ehrkera414otok5i67dk3',
  identityPoolId: 'us-east-2:f97d3d15-c898-4993-b547-4a8babf1b047',
  hostedUiDomain: 'townofwiley-staff.auth.us-east-2.amazoncognito.com',
} as const;

const PRODUCTION_ORIGINS = [
  'https://townofwiley.gov',
  'https://www.townofwiley.gov',
  'http://localhost:4200',
] as const;

function oauthUrlsForPath(path: string): string[] {
  const origins = new Set<string>(PRODUCTION_ORIGINS);
  if (typeof window !== 'undefined' && window.location.origin) {
    origins.add(window.location.origin);
  }
  return [...origins].map((origin) => `${origin}${path}`);
}

/** Cognito identifiers for staff admin (see docs/admin-auth-runbook.md). */
export const cognitoConfig = {
  userPoolId: runtimeAuth?.userPoolId ?? GEN2_COGNITO_FALLBACK.userPoolId,
  userPoolClientId: runtimeAuth?.userPoolClientId ?? GEN2_COGNITO_FALLBACK.userPoolClientId,
  identityPoolId: runtimeAuth?.identityPoolId ?? GEN2_COGNITO_FALLBACK.identityPoolId,
  hostedUiDomain: runtimeAuth?.hostedUiDomain ?? GEN2_COGNITO_FALLBACK.hostedUiDomain,
  staffGroup: 'Staff',
} as const;

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: cognitoConfig.userPoolId,
      userPoolClientId: cognitoConfig.userPoolClientId,
      identityPoolId: cognitoConfig.identityPoolId,
      allowGuestAccess: true,
      loginWith: {
        oauth: {
          domain: cognitoConfig.hostedUiDomain,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: oauthUrlsForPath('/admin/login'),
          redirectSignOut: oauthUrlsForPath('/admin'),
          responseType: 'code',
        },
      },
    },
  },
  API: {
    GraphQL: {
      // Prefer runtime (injected at deploy from current Gen 2 secrets). Fall back to Gen 2 endpoint
      // so that local staff flows and in-app CMS forms target the live backend by default.
      endpoint: cmsAppSyncConfig?.apiEndpoint ?? GEN2_CMS_GRAPHQL_FALLBACK,
      defaultAuthMode: 'apiKey',
      apiKey: cmsAppSyncConfig?.apiKey ?? '',
    },
  },
  Storage: {
    S3: {
      bucket:
        runtimeStorage?.bucket ?? 'amplify-d331voxr1fhoir-mai-documentsbucket3df3f730-tp554yhsasnp',
      region: runtimeStorage?.region ?? cmsAppSyncConfig?.region ?? 'us-east-2',
    },
  },
});
