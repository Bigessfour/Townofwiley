import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    buildAdminRuntimeConfigObject,
    buildPublicRuntimeConfigObject,
    buildRuntimeConfigValues,
    collectRequiredEnvErrors,
    DEFAULT_PAYSTAR_PORTAL_URL,
    formatStrictEnvErrors,
    shouldAllowManifestFallbacks,
    shouldRunStrictProductionBuild,
    shouldUseStrictMode,
} from './lib/runtime-config-env.mjs';

const REQUIRED = [
  { name: 'APPSYNC_CMS_ENDPOINT', runtimePath: 'cms.appSync.apiEndpoint' },
  { name: 'APPSYNC_CMS_API_KEY', runtimePath: 'cms.appSync.apiKey' },
  { name: 'NWS_PROXY_ENDPOINT', runtimePath: 'weather.apiEndpoint' },
];

describe('collectRequiredEnvErrors', () => {
  it('returns empty when all required env vars are set', () => {
    const missing = collectRequiredEnvErrors(REQUIRED, {
      APPSYNC_CMS_ENDPOINT: 'https://example.appsync-api.us-east-2.amazonaws.com/graphql',
      APPSYNC_CMS_API_KEY: 'da2-key',
      NWS_PROXY_ENDPOINT: 'https://example.lambda-url.us-east-2.on.aws/',
    });
    assert.equal(missing.length, 0);
  });

  it('accepts required values from local user-secrets when env is empty', () => {
    const missing = collectRequiredEnvErrors(REQUIRED, {}, {
      cms: { appSync: { apiEndpoint: 'https://example.appsync-api.us-east-2.amazonaws.com/graphql', apiKey: 'da2-key' } },
      weather: { nws: { apiEndpoint: 'https://example.lambda-url.us-east-2.on.aws/' } },
    });
    assert.equal(missing.length, 0);
  });

  it('flags missing and whitespace-only values', () => {
    const missing = collectRequiredEnvErrors(REQUIRED, {
      APPSYNC_CMS_ENDPOINT: '   ',
      APPSYNC_CMS_API_KEY: '',
    });
    assert.equal(missing.length, 3);
    assert.ok(missing.some((entry) => entry.name === 'APPSYNC_CMS_ENDPOINT'));
    assert.ok(missing.some((entry) => entry.name === 'APPSYNC_CMS_API_KEY'));
    assert.ok(missing.some((entry) => entry.name === 'NWS_PROXY_ENDPOINT'));
  });
});

describe('shouldUseStrictMode', () => {
  it('enables with --strict flag', () => {
    assert.equal(shouldUseStrictMode(['--strict'], {}), true);
  });

  it('enables with STRICT_RUNTIME_CONFIG=1', () => {
    assert.equal(shouldUseStrictMode([], { STRICT_RUNTIME_CONFIG: '1' }), true);
  });

  it('enables when AWS_APP_ID is set (Amplify Hosting)', () => {
    assert.equal(shouldUseStrictMode([], { AWS_APP_ID: 'd331voxr1fhoir' }), true);
  });

  it('is off for local dev without flags', () => {
    assert.equal(shouldUseStrictMode([], {}), false);
  });
});

describe('shouldRunStrictProductionBuild (build:ci)', () => {
  it('is strict when STRICT_RUNTIME_CONFIG=1', () => {
    assert.equal(shouldRunStrictProductionBuild({ STRICT_RUNTIME_CONFIG: '1' }), true);
  });

  it('is non-strict when STRICT_RUNTIME_CONFIG=0 (Dependabot / secretless CI)', () => {
    assert.equal(shouldRunStrictProductionBuild({ STRICT_RUNTIME_CONFIG: '0' }), false);
  });

  it('ignores --strict argv (only env governs build:ci)', () => {
    assert.equal(shouldRunStrictProductionBuild({ STRICT_RUNTIME_CONFIG: '0' }), false);
    assert.equal(shouldRunStrictProductionBuild({ STRICT_RUNTIME_CONFIG: '1' }), true);
  });
});

describe('shouldAllowManifestFallbacks', () => {
  it('is off when strict', () => {
    assert.equal(shouldAllowManifestFallbacks({}, { strict: true }), false);
  });

  it('is off when E2E_RUNTIME_MANIFEST_FALLBACKS=0', () => {
    assert.equal(
      shouldAllowManifestFallbacks({ E2E_RUNTIME_MANIFEST_FALLBACKS: '0' }, { strict: false }),
      false,
    );
  });

  it('is on for local dev by default', () => {
    assert.equal(shouldAllowManifestFallbacks({}, { strict: false }), true);
  });
});

describe('buildRuntimeConfigValues manifest fallbacks', () => {
  it('enables severe weather signup when env provides the Function URL', () => {
    const values = buildRuntimeConfigValues(
      {},
      {
        SEVERE_WEATHER_SIGNUP_API_ENDPOINT: 'https://example.lambda-url.us-east-2.on.aws/',
        SEVERE_WEATHER_SIGNUP_ENABLED: 'true',
      },
      { allowManifestFallbacks: true },
    );
    assert.match(values.severeWeatherSignupApiEndpoint, /lambda-url\.us-east-2\.on\.aws/);
    assert.equal(values.severeWeatherSignupEnabled, true);
  });

  it('skips manifest fallbacks when strict (Amplify build)', () => {
    const values = buildRuntimeConfigValues({}, {}, { allowManifestFallbacks: false });
    assert.equal(values.severeWeatherSignupApiEndpoint, '');
    assert.equal(values.severeWeatherSignupEnabled, false);
  });

  it('does not invent a CMS endpoint without env, secrets, or amplify_outputs', () => {
    const values = buildRuntimeConfigValues({}, {}, { allowManifestFallbacks: true });
    assert.equal(values.cmsApiEndpoint, '');
    assert.match(values.communityCalendarApiEndpoint, /lambda-url\.us-east-2\.on\.aws/);
  });
});

describe('Paystar hosted portal defaults', () => {
  it('uses the live Town Paystar URL when env and secrets omit it', () => {
    const values = buildRuntimeConfigValues({}, {}, { allowManifestFallbacks: false });
    assert.equal(values.paystarPortalUrl, DEFAULT_PAYSTAR_PORTAL_URL);
    assert.equal(values.paystarMode, 'hosted');
  });

  it('keeps an explicit PAYSTAR_PORTAL_URL override', () => {
    const values = buildRuntimeConfigValues(
      {},
      { PAYSTAR_PORTAL_URL: 'https://secure.paystar.io/pay/custom-tenant' },
      { allowManifestFallbacks: false },
    );
    assert.equal(values.paystarPortalUrl, 'https://secure.paystar.io/pay/custom-tenant');
    assert.equal(values.paystarMode, 'hosted');
  });

  it('treats PAYSTAR_MODE=none as a kill switch even with the default URL available', () => {
    const values = buildRuntimeConfigValues(
      {},
      { PAYSTAR_MODE: 'none' },
      { allowManifestFallbacks: false },
    );
    assert.equal(values.paystarMode, 'none');
    assert.equal(values.paystarPortalUrl, '');
  });

  it('does not treat unconfigured local secrets mode none as a kill switch', () => {
    const values = buildRuntimeConfigValues(
      { payments: { paystar: { mode: 'none', portalUrl: '' } } },
      {},
      { allowManifestFallbacks: false },
    );
    assert.equal(values.paystarPortalUrl, DEFAULT_PAYSTAR_PORTAL_URL);
    assert.equal(values.paystarMode, 'hosted');
  });
});

describe('public vs admin runtime config split', () => {
  it('keeps clerk setup, staff CMS, and contact-review URLs off the public payload', () => {
    const values = buildRuntimeConfigValues(
      {},
      {
        CMS_MEDIA_UPLOAD_API_ENDPOINT: 'https://upload.example/',
        CMS_AUDIT_LOG_API_ENDPOINT: 'https://audit.example/',
        CONTACT_UPDATE_REVIEW_API_URL: 'https://review.example/contact-updates/',
        CONTACT_UPDATE_REVIEW_PROXY_URL: 'https://proxy.example/review',
      },
      { allowManifestFallbacks: true },
    );
    const publicConfig = buildPublicRuntimeConfigObject(values, {
      timestamp: '2026-01-01T00:00:00.000Z',
      gitSha: 'abc1234',
    });
    const adminConfig = buildAdminRuntimeConfigObject(values);

    assert.equal(publicConfig.clerkSetup, undefined);
    assert.equal(publicConfig.cms?.mediaUpload, undefined);
    assert.equal(publicConfig.cms?.auditLog, undefined);
    assert.equal(publicConfig.contactUpdate?.reviewApiEndpoint, undefined);
    assert.equal(publicConfig.contactUpdate?.reviewProxyEndpoint, undefined);
    assert.ok(adminConfig.clerkSetup?.awsAccountId);
    assert.equal(adminConfig.cms?.mediaUpload?.apiEndpoint, 'https://upload.example/');
    assert.equal(adminConfig.cms?.auditLog?.apiEndpoint, 'https://audit.example/');
    assert.equal(adminConfig.contactUpdate?.reviewApiEndpoint, 'https://review.example/contact-updates');
    assert.equal(adminConfig.contactUpdate?.reviewProxyEndpoint, 'https://proxy.example/review');
    assert.ok(typeof publicConfig.communityCalendar?.apiEndpoint === 'string');
  });
});

describe('runtime-config CLI surface', () => {
  it('exports the builders generate-runtime-config.mjs imports', async () => {
    const env = await import('./lib/runtime-config-env.mjs');
    assert.equal(typeof env.buildPublicRuntimeConfigObject, 'function');
    assert.equal(typeof env.buildAdminRuntimeConfigObject, 'function');
    assert.equal(typeof env.shouldRunStrictProductionBuild, 'function');
  });
});

describe('formatStrictEnvErrors', () => {
  it('lists variable names and runtime paths', () => {
    const message = formatStrictEnvErrors([
      { name: 'APPSYNC_CMS_API_KEY', runtimePath: 'cms.appSync.apiKey' },
    ]);
    assert.match(message, /APPSYNC_CMS_API_KEY/);
    assert.match(message, /cms\.appSync\.apiKey/);
  });
});
