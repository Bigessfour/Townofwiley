#!/usr/bin/env node
/**
 * Sync required production runtime secrets from live site + AWS SSOT into:
 *   - secrets/local/user-secrets.json (when unlocked)
 *   - GitHub repository secrets (optional --github)
 *   - stdout as shell exports (optional --print-env)
 *
 * Usage:
 *   npm run secrets:sync-runtime
 *   npm run secrets:sync-runtime -- --github
 *   npm run secrets:sync-runtime -- --print-env
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDeployedFunctionUrl } from './lib/deployed-function-urls.mjs';
import {
  loadAmplifyBranchEnvManifest,
  loadProductionBindingsFromRepo,
  repoRoot,
} from './lib/runtime-config-env.mjs';
import {
    applyEnvVarsToLocalSecrets
} from './lib/runtime-secret-mappings.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const localSecretsPath = join(repoRoot, 'secrets', 'local', 'user-secrets.json');
const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const productionUrl = (
  args.find((arg) => arg.startsWith('--production-url='))?.split('=')[1] ??
  'https://townofwiley.gov'
).replace(/\/$/, '');

function awsJson(commandArgs, region = 'us-east-2') {
  const output = execFileSync(
    'aws',
    [...commandArgs, '--region', region, '--output', 'json'],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        AWS_DEFAULT_REGION: region,
        AWS_REGION: region,
      },
    },
  );
  return JSON.parse(output);
}

function awsText(commandArgs, region = 'us-east-2') {
  return execFileSync('aws', [...commandArgs, '--region', region, '--output', 'text'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      AWS_DEFAULT_REGION: region,
      AWS_REGION: region,
    },
  }).trim();
}

function lambdaFunctionUrl(functionName, region = 'us-east-2') {
  try {
    return awsText([
      'lambda',
      'get-function-url-config',
      '--function-name',
      functionName,
      '--query',
      'FunctionUrl',
    ]).replace(/\/$/, '');
  } catch {
    return '';
  }
}

async function fetchProductionRuntimeConfig() {
  const response = await fetch(`${productionUrl}/runtime-config.js`, {
    headers: { accept: 'text/javascript,*/*' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${productionUrl}/runtime-config.js (${response.status})`);
  }

  const text = await response.text();
  const match = text.match(/window\.__TOW_RUNTIME_CONFIG__\s*=\s*(\{[\s\S]*\});/);
  if (!match) {
    throw new Error('Could not parse production runtime-config.js payload');
  }

  return JSON.parse(match[1]);
}

function runtimeConfigToEnv(cfg) {
  /** @type {Record<string, string>} */
  const env = {};

  const cmsEndpoint = cfg.cms?.appSync?.apiEndpoint?.trim?.() ?? '';
  const cmsKey = cfg.cms?.appSync?.apiKey?.trim?.() ?? '';
  const cmsRegion = cfg.cms?.appSync?.region?.trim?.() ?? 'us-east-2';

  if (cmsEndpoint) {
    env.APPSYNC_CMS_ENDPOINT = cmsEndpoint;
  }
  if (cmsKey) {
    env.APPSYNC_CMS_API_KEY = cmsKey;
  }
  if (cmsRegion) {
    env.APPSYNC_CMS_REGION = cmsRegion;
  }

  const weatherEndpoint = cfg.weather?.apiEndpoint?.trim?.() ?? '';
  if (weatherEndpoint) {
    env.NWS_PROXY_ENDPOINT = weatherEndpoint.replace(/\/$/, '') + '/';
  }

  const alertEndpoint = cfg.weather?.alertSignup?.apiEndpoint?.trim?.() ?? '';
  if (alertEndpoint) {
    env.SEVERE_WEATHER_SIGNUP_API_ENDPOINT = alertEndpoint.replace(/\/$/, '');
  }
  env.SEVERE_WEATHER_SIGNUP_ENABLED =
    cfg.weather?.alertSignup?.enabled === false ? 'false' : 'true';

  const chatApi = cfg.chatbot?.apiEndpoint?.trim?.() ?? '';
  const chatUrl = cfg.chatbot?.chatUrl?.trim?.() ?? '';
  if (chatApi) {
    env.EASYPEASY_API_ENDPOINT = chatApi.replace(/\/$/, '');
  }
  if (chatUrl) {
    env.EASYPEASY_CHAT_URL = chatUrl;
  }


  const guestbook = cfg.guestbook?.apiEndpoint?.trim?.() ?? '';
  if (guestbook) {
    env.GUESTBOOK_API_ENDPOINT = guestbook.replace(/\/$/, '');
  }

  return env;
}

function isLikelyHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function applyAwsSupplements(env) {
  env.NWS_PROXY_ENDPOINT ??=
    readDeployedFunctionUrl('TownOfWileyNWSWeatherProxy') ||
    lambdaFunctionUrl('TownOfWileyNWSWeatherProxy');
  env.SEVERE_WEATHER_SIGNUP_API_ENDPOINT ??=
    readDeployedFunctionUrl('TownOfWileySevereWeatherBackend')?.replace(/\/$/, '') ||
    lambdaFunctionUrl('TownOfWileySevereWeatherBackend');
  env.SEVERE_WEATHER_SIGNUP_ENABLED ??= 'true';

  if (!isLikelyHttpUrl(env.EASYPEASY_API_ENDPOINT)) {
    env.EASYPEASY_API_ENDPOINT = lambdaFunctionUrl('townofwiley-easy-peasy-chat-proxy').replace(
      /\/$/,
      '',
    );
  }
  if (!isLikelyHttpUrl(env.EASYPEASY_CHAT_URL)) {
    env.EASYPEASY_CHAT_URL = 'https://bots.easy-peasy.ai/';
  }
  if (!isLikelyHttpUrl(env.GUESTBOOK_API_ENDPOINT)) {
    env.GUESTBOOK_API_ENDPOINT =
      lambdaFunctionUrl('TownOfWileyGuestbook').replace(/\/$/, '') ||
      readDeployedFunctionUrl('TownOfWileyGuestbook')?.replace(/\/$/, '');
  }

  if (!env.APPSYNC_CMS_ENDPOINT || !env.APPSYNC_CMS_API_KEY) {
    const apis = awsJson(['appsync', 'list-graphql-apis']).graphqlApis ?? [];
    const preferred =
      apis.find((api) => api.name === 'townofwiley-main') ??
      apis.find((api) => api.apiId === 'j7b2x3sh7rcezekekkxxiak7hi') ??
      apis[0];
    if (preferred) {
      const graphqlUri =
        typeof preferred.uris === 'string'
          ? preferred.uris
          : preferred.uris?.GRAPHQL ?? preferred.uris?.graphql ?? '';
      env.APPSYNC_CMS_ENDPOINT ??= graphqlUri;
      env.APPSYNC_CMS_REGION ??= 'us-east-2';
    }
  }

  env.APPSYNC_CMS_REGION ??= 'us-east-2';
  const bindingsReviewApi =
    loadProductionBindingsFromRepo()?.contactReview?.reviewApiEndpoint?.trim() ?? '';
  if (bindingsReviewApi) {
    env.CONTACT_UPDATE_REVIEW_API_URL ??= bindingsReviewApi.replace(/\/$/, '');
  }

  return env;
}

function validateRequired(env) {
  const manifest = loadAmplifyBranchEnvManifest();
  const missing = [];

  for (const entry of manifest.requiredForProduction) {
    const value = env[entry.name];
    if (typeof value !== 'string' || !value.trim()) {
      missing.push(entry.name);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Resolved env is still missing required keys: ${missing.join(', ')}`);
  }
}

function quoteShell(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

function writeLocalSecrets(env) {
  if (!existsSync(localSecretsPath)) {
    throw new Error(
      'Local secrets file missing. Run: npm run secrets:unlock (or npm run secrets:init)',
    );
  }

  const secrets = JSON.parse(readFileSync(localSecretsPath, 'utf8'));
  const updated = applyEnvVarsToLocalSecrets(env, secrets);
  writeFileSync(localSecretsPath, `${JSON.stringify(secrets, null, 2)}\n`);
  return updated;
}

function pushGitHubSecrets(env) {
  const manifest = loadAmplifyBranchEnvManifest();
  const pushed = [];

  for (const entry of manifest.requiredForProduction) {
    const value = env[entry.name];
    if (typeof value !== 'string' || !value.trim()) {
      continue;
    }

    execFileSync('gh', ['secret', 'set', entry.name, '--body', value.trim()], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    pushed.push(entry.name);
  }

  return pushed;
}

async function main() {
  const productionCfg = await fetchProductionRuntimeConfig();
  /** @type {Record<string, string>} */
  let resolved = runtimeConfigToEnv(productionCfg);
  resolved = applyAwsSupplements(resolved);
  validateRequired(resolved);

  const summary = loadAmplifyBranchEnvManifest().requiredForProduction.map((entry) => ({
    name: entry.name,
    source: process.env[entry.name]?.trim()
      ? 'process.env'
      : runtimeConfigToEnv(productionCfg)[entry.name]
        ? 'production'
        : 'aws-ssot',
    length: resolved[entry.name]?.length ?? 0,
  }));

  if (flags.has('--print-env')) {
    for (const entry of loadAmplifyBranchEnvManifest().requiredForProduction) {
      console.log(`export ${entry.name}=${quoteShell(resolved[entry.name])}`);
    }
    return;
  }

  if (!flags.has('--dry-run')) {
    const updated = writeLocalSecrets(resolved);
    console.log(`Updated local user-secrets (${updated.length} slot(s)).`);
  } else {
    console.log('Dry run: local user-secrets not written.');
  }

  if (flags.has('--github') && !flags.has('--dry-run')) {
    const pushed = pushGitHubSecrets(resolved);
    console.log(`Updated GitHub repository secrets (${pushed.length}).`);
  }

  console.log(
    JSON.stringify(
      {
        productionUrl,
        required: summary,
        next: [
          'npm run generate:runtime-config:strict',
          'npm run test:runtime-config-strict',
          flags.has('--github') ? null : 'npm run secrets:sync-runtime -- --github (optional CI sync)',
        ].filter(Boolean),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
