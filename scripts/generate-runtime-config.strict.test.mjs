import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    buildRuntimeConfigValues,
    collectRequiredEnvErrors,
    formatStrictEnvErrors,
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

describe('buildRuntimeConfigValues manifest fallbacks', () => {
  it('wires severe weather signup to deployed Lambda URL for local dev', () => {
    const values = buildRuntimeConfigValues(
      { weather: { alertSignup: { enabled: false, apiEndpoint: '' } } },
      {},
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
