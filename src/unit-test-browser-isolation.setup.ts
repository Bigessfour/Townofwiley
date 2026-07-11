/**
 * Runs for `ng test` / `@angular/build:unit-test` (all *.spec.ts) before each test file.
 * Mirrors the browser-state cleanup in `vitest.setup.ts` used by `npm run test:vitest`.
 *
 * Why: CI uses `npm run test:unit:browser` (Chromium). Real browser `localStorage`
 * persists across specs, so a test that sets `tow-site-language` to `es` can break
 * the next English-only spec. Local `ng test` without `--browsers` uses jsdom/Node,
 * which often looks “always green” because storage is not shared the same way.
 */
import { afterEach, beforeEach, vi } from 'vitest';

declare global {
  // eslint-disable-next-line no-var
  var __amplifyGraphqlMock: ReturnType<typeof vi.fn> | undefined;
}

const { amplifyGraphqlMock } = vi.hoisted(() => ({
  amplifyGraphqlMock: vi.fn(),
}));

vi.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: amplifyGraphqlMock,
  }),
}));

globalThis.__amplifyGraphqlMock = amplifyGraphqlMock;

const defaultAdminRuntimeConfig = {
  clerkSetup: {
    clerkName: 'Deb Dillon',
    awsAccountId: '570912405222',
    amplifyAppId: 'd331voxr1fhoir',
    awsRegion: 'us-east-2',
    awsConsoleUrl: 'https://us-east-2.console.aws.amazon.com/',
    studioUrl:
      'https://us-east-2.console.aws.amazon.com/appsync/home?region=us-east-2#/j7b2x3sh7rcezekekkxxiak7hi/v1/queries',
    cfDistributionId: 'E1NZ3XCY5CYR1J',
    s3Bucket: 'townofwiley-static-site',
  },
  cms: {
    mediaUpload: { apiEndpoint: 'https://example.lambda-url.us-east-2.on.aws/' },
    auditLog: { apiEndpoint: 'https://example.lambda-url.us-east-2.on.aws/' },
  },
} as const;

beforeEach(() => {
  (
    window as Window & {
      __TOW_RUNTIME_CONFIG_ADMIN__?: typeof defaultAdminRuntimeConfig;
    }
  ).__TOW_RUNTIME_CONFIG_ADMIN__ = structuredClone(defaultAdminRuntimeConfig);
  document
    .querySelectorAll('script[data-tow-admin-runtime-config="true"]')
    .forEach((node) => node.remove());
});

afterEach(() => {
  delete (
    window as Window & {
      __TOW_RUNTIME_CONFIG__?: unknown;
      __TOW_RUNTIME_CONFIG_OVERRIDE__?: unknown;
      __TOW_RUNTIME_CONFIG_ADMIN__?: unknown;
    }
  ).__TOW_RUNTIME_CONFIG__;

  delete (
    window as Window & {
      __TOW_RUNTIME_CONFIG__?: unknown;
      __TOW_RUNTIME_CONFIG_OVERRIDE__?: unknown;
      __TOW_RUNTIME_CONFIG_ADMIN__?: unknown;
    }
  ).__TOW_RUNTIME_CONFIG_OVERRIDE__;

  delete (
    window as Window & {
      __TOW_RUNTIME_CONFIG_ADMIN__?: unknown;
    }
  ).__TOW_RUNTIME_CONFIG_ADMIN__;

  try {
    window.localStorage?.clear();
  } catch {
    /* non-DOM runners */
  }

  try {
    document.documentElement.removeAttribute('lang');
  } catch {
    /* non-DOM runners */
  }

  vi.clearAllMocks();
});
