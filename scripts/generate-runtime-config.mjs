import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    buildRuntimeConfigObject,
    buildRuntimeConfigValues,
    collectRequiredEnvErrors,
    formatStrictEnvErrors,
    loadAmplifyBranchEnvManifest,
    readLocalSecrets,
    repoRoot,
    shouldUseStrictMode,
} from './lib/runtime-config-env.mjs';

const runtimeConfigPath = join(repoRoot, 'public', 'runtime-config.js');
const argv = process.argv.slice(2);
const strict = shouldUseStrictMode(argv, process.env);

if (strict) {
  const manifest = loadAmplifyBranchEnvManifest();
  const missing = collectRequiredEnvErrors(manifest.requiredForProduction, process.env);
  if (missing.length > 0) {
    console.error(formatStrictEnvErrors(missing));
    process.exit(1);
  }
}

const localSecrets = readLocalSecrets();
const values = buildRuntimeConfigValues(localSecrets, process.env, { allowManifestFallbacks: !strict });

const buildTimestamp = new Date().toISOString();
let gitSha = 'unknown';
try {
  gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd: repoRoot }).trim();
} catch {
  console.warn('Could not determine git SHA (not a git repo or git unavailable)');
}

const runtimeConfig = buildRuntimeConfigObject(values, {
  timestamp: buildTimestamp,
  gitSha,
});

writeFileSync(
  runtimeConfigPath,
  `window.__TOW_RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig, null, 2)};\n`,
);

console.log(
  `Runtime config written to ${runtimeConfigPath}${strict ? ' (strict validation passed)' : ''}`,
);
