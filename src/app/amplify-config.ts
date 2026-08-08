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

/** Gen 2 production Cognito (fallback when runtime-config.js is absent — e.g. local ng serve).
 *  Client updated 2026-06-06 after backend redeploy (new "townofwiley-staff-web" client with
 *  correct OAuth callbacks for the S3+CloudFront custom domain + /admin/login).
 *  Hosted UI domain prefix: townofwiley-staff (https://townofwiley-staff.auth.us-east-2.amazoncognito.com)
 */
const GEN2_COGNITO_FALLBACK = {
  userPoolId: 'us-east-2_pkewJMUJF',
  userPoolClientId: '2av73ehrkera414otok5i67dk3',
  identityPoolId: 'us-east-2:2c69cd53-7ed6-4032-9e65-b5492cd36e56', // recent testAuth/main from discovery; verify against current amplify outputs or stack
} as const;

/** Cognito identifiers for staff admin (see docs/admin-auth-runbook.md). */
export const cognitoConfig = {
  userPoolId: runtimeAuth?.userPoolId ?? GEN2_COGNITO_FALLBACK.userPoolId,
  userPoolClientId: runtimeAuth?.userPoolClientId ?? GEN2_COGNITO_FALLBACK.userPoolClientId,
  identityPoolId: runtimeAuth?.identityPoolId ?? GEN2_COGNITO_FALLBACK.identityPoolId,
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
      // Client (2av73e...) has matching CallbackURLs for /admin/login and the
      // Cognito domain prefix "townofwiley-staff".
      // Both direct signIn (current custom form) and signInWithRedirect are supported.
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
        'https://fpm2ifkbfnb7hphqsck6dj66wq.appsync-api.us-east-2.amazonaws.com/graphql',
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
