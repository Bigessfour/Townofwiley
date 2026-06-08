#!/usr/bin/env node
/**
 * Verify public/runtime-config.js matches Gen 1 production CMS bindings (SSOT).
 * Optionally probes AppSync with the configured API key when secrets are available.
 *
 * Usage:
 *   npm run verify:runtime-config-cms
 *   npm run verify:runtime-config-cms -- --skip-probe
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildAppSyncQueriesConsoleUrl,
  loadProductionBindingsFromRepo,
  readLocalSecrets,
  repoRoot,
} from './lib/runtime-config-env.mjs';

const args = new Set(process.argv.slice(2));
const skipProbe = args.has('--skip-probe');

const bindingsPath = join(repoRoot, 'infrastructure', 'gen1-production-bindings.json');
const runtimeConfigPath = join(repoRoot, 'public', 'runtime-config.js');

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function loadRuntimeConfigObject() {
  if (!existsSync(runtimeConfigPath)) {
    fail(`missing ${runtimeConfigPath} — run npm run generate:runtime-config:strict`);
  }
  const source = readFileSync(runtimeConfigPath, 'utf8');
  const marker = 'window.__TOW_RUNTIME_CONFIG__ = ';
  const start = source.indexOf(marker);
  if (start === -1) {
    fail('runtime-config.js: missing window.__TOW_RUNTIME_CONFIG__ assignment');
  }
  const jsonStart = start + marker.length;
  const jsonEnd = source.lastIndexOf(';');
  if (jsonEnd <= jsonStart) {
    fail('runtime-config.js: could not parse JSON payload');
  }
  return JSON.parse(source.slice(jsonStart, jsonEnd));
}

function expectEqual(label, actual, expected) {
  const a = String(actual ?? '').trim();
  const e = String(expected ?? '').trim();
  if (a !== e) {
    fail(`${label}: expected "${e}", got "${a}"`);
  }
  console.log(`OK: ${label}`);
}

const bindings = loadProductionBindingsFromRepo();
if (!bindings?.appSync?.graphqlEndpoint) {
  fail(`missing appSync.graphqlEndpoint in ${bindingsPath}`);
}

const config = loadRuntimeConfigObject();
const cms = config.cms?.appSync ?? {};
const auth = config.auth?.cognito ?? {};
const clerk = config.clerkSetup ?? {};

expectEqual('cms.appSync.apiEndpoint', cms.apiEndpoint, bindings.appSync.graphqlEndpoint);
expectEqual('cms.appSync.region', cms.region, bindings.storage?.region ?? 'us-east-2');
expectEqual('auth.cognito.userPoolId', auth.userPoolId, bindings.cognito.userPoolId);
expectEqual('auth.cognito.userPoolClientId', auth.userPoolClientId, bindings.cognito.userPoolClientId);
expectEqual('auth.cognito.identityPoolId', auth.identityPoolId, bindings.cognito.identityPoolId);
expectEqual('auth.cognito.hostedUiDomain', auth.hostedUiDomain, bindings.cognito.hostedUiDomain);
expectEqual('storage.s3.bucket', config.storage?.s3?.bucket, bindings.storage.bucket);

const apiId = bindings.appSync.apiId;
const expectedConsoleUrl = buildAppSyncQueriesConsoleUrl(bindings.storage?.region ?? 'us-east-2', apiId);
for (const label of ['clerkSetup.studioUrl', 'clerkSetup.dataManagerUrl']) {
  expectEqual(label, clerk[label === 'clerkSetup.studioUrl' ? 'studioUrl' : 'dataManagerUrl'], expectedConsoleUrl);
}

if (config.chatbot?.mode !== 'none' && config.chatbot?.provider !== 'none') {
  fail(`chatbot should be disabled (mode/provider none), got mode=${config.chatbot?.mode}`);
}
console.log('OK: chatbot disabled');

if (!skipProbe && cms.apiEndpoint && cms.apiKey) {
  const response = await fetch(cms.apiEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': cms.apiKey,
    },
    body: JSON.stringify({
      query: 'query { listSiteSettings(limit: 1) { items { id townName } } }',
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    fail(`AppSync probe failed: HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (payload.errors?.length) {
    fail(`AppSync probe GraphQL errors: ${payload.errors.map((e) => e.message).join('; ')}`);
  }
  if (!payload.data?.listSiteSettings?.items?.length) {
    fail('AppSync probe returned no SiteSettings rows');
  }
  console.log('OK: AppSync listSiteSettings probe');
} else if (!skipProbe) {
  const secrets = readLocalSecrets();
  const key = secrets.cms?.appSync?.apiKey?.trim();
  if (!key) {
    console.warn('skip: AppSync probe (no API key in runtime-config or local secrets)');
  }
}

console.log('OK: runtime-config CMS matches Gen 1 production bindings');