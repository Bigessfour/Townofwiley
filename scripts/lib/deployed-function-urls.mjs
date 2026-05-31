import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifestPath = join(repoRoot, 'infrastructure', 'aws-infrastructure.manifest.json');

/** @type {Map<string, string> | null} */
let cachedByFunctionName = null;

function loadManifestUrlMap() {
  if (cachedByFunctionName) {
    return cachedByFunctionName;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  /** @type {Map<string, string>} */
  const map = new Map();

  for (const entry of manifest.lambdaFunctions ?? []) {
    const url = entry.functionUrlEndpoint?.trim();
    if (entry.functionName && url) {
      map.set(entry.functionName, url);
    }
  }

  cachedByFunctionName = map;
  return map;
}

/**
 * Deployed Lambda Function URL from infrastructure SSOT (non-secret).
 * Used for local `generate:runtime-config` when env vars and user secrets are empty.
 *
 * @param {string} functionName
 * @returns {string}
 */
export function readDeployedFunctionUrl(functionName) {
  return loadManifestUrlMap().get(functionName) ?? '';
}
