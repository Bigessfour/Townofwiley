/**
 * Gen 1 CMS single source of truth and deprecated Gen 2 identifier blocklist.
 * SSOT file: infrastructure/gen1-production-bindings.json
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const PRODUCTION_BINDINGS_PATH = join(
  repoRoot,
  'infrastructure',
  'gen1-production-bindings.json',
);

/** Retired Amplify Gen 2 / ampx identifiers — must never appear in runtime-config or secrets. */
export const DEPRECATED_GEN2_MARKERS = [
  'x7poehudqvamneqni5s6e2cjxy',
  'fpm2ifkbfnb7hphqsck6dj66wq',
  'iydm63w5bbf73aun6p5bc7psoy',
  'us-east-2_pkewJMUJF',
  '2av73ehrkera414otok5i67dk3',
  'us-east-2:f97d3d15-c898-4993-b547-4a8babf1b047',
  'gen2-main',
  'amplify_outputs.json',
  'ampx pipeline-deploy',
];

export function loadProductionBindings() {
  if (!existsSync(PRODUCTION_BINDINGS_PATH)) {
    return null;
  }
  return JSON.parse(readFileSync(PRODUCTION_BINDINGS_PATH, 'utf8'));
}

export function readProductionCmsGraphqlEndpoint() {
  return loadProductionBindings()?.appSync?.graphqlEndpoint?.trim() ?? '';
}

export function readProductionAppSyncApiId() {
  return loadProductionBindings()?.appSync?.apiId?.trim() ?? 'j7b2x3sh7rcezekekkxxiak7hi';
}

export function readProductionCmsRegion() {
  return loadProductionBindings()?.storage?.region?.trim() ?? 'us-east-2';
}

export function readProductionCognitoBindings() {
  return loadProductionBindings()?.cognito ?? {};
}

export function readProductionStorageBindings() {
  return loadProductionBindings()?.storage ?? {};
}

/** @returns {string | null} first deprecated marker found in value, or null */
export function findDeprecatedGen2Marker(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const haystack = value.trim().toLowerCase();
  for (const marker of DEPRECATED_GEN2_MARKERS) {
    if (haystack.includes(marker.toLowerCase())) {
      return marker;
    }
  }
  return null;
}

/**
 * Fail if endpoint/apiId looks like retired Gen 2 CMS or does not match Gen 1 SSOT when expected is set.
 * @param {{ endpoint?: string; apiId?: string; label?: string; expectedEndpoint?: string }} input
 */
export function assertProductionCmsEndpoint(input) {
  const { endpoint = '', apiId = '', label = 'cms.appSync.apiEndpoint', expectedEndpoint = '' } =
    input;
  const trimmedEndpoint = endpoint.trim();
  const deprecated = findDeprecatedGen2Marker(trimmedEndpoint) ?? findDeprecatedGen2Marker(apiId);
  if (deprecated) {
    throw new Error(
      `${label} references deprecated Gen 2 identifier "${deprecated}". ` +
        'Use Gen 1 only — see infrastructure/gen1-production-bindings.json and docs/gen2-decommissioned.md',
    );
  }
  const expected = (expectedEndpoint || readProductionCmsGraphqlEndpoint()).trim();
  if (expected && trimmedEndpoint && trimmedEndpoint !== expected) {
    throw new Error(`${label}: expected Gen 1 endpoint "${expected}", got "${trimmedEndpoint}"`);
  }
}
