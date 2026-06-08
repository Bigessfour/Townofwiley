import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    buildRuntimeConfigValues,
    collectRequiredEnvErrors,
    formatStrictEnvErrors,
    shouldAllowManifestFallbacks,
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
