import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDeployedFunctionUrl } from './deployed-function-urls.mjs';
import { envFromLocalSecrets } from './runtime-secret-mappings.mjs';

const libDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(libDir, '..', '..');
export const manifestPath = join(repoRoot, 'infrastructure', 'amplify-branch-env.manifest.json');
export const localSecretsPath = join(repoRoot, 'secrets', 'local', 'user-secrets.json');
export const amplifyOutputsPath = join(repoRoot, 'amplify_outputs.json');
export const productionBindingsPath = join(
  repoRoot,
  'infrastructure',
  'gen1-production-bindings.json',
);

/** @returns {Record<string, unknown> | null} */
export function loadProductionBindingsFromRepo() {
  if (!existsSync(productionBindingsPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(productionBindingsPath, 'utf8'));
  } catch (error) {
    console.warn(`Unable to parse ${productionBindingsPath}: ${error.message}`);
    return null;
  }
}

/** Live CMS GraphQL endpoint from infrastructure SSOT (Gen 1 production). */
export function readProductionCmsGraphqlEndpoint() {
  const bindings = loadProductionBindingsFromRepo();
  return bindings?.appSync?.graphqlEndpoint?.trim() || '';
}

/** Live AppSync API id (Gen 1 production CMS API). */
export function readProductionAppSyncApiId() {
  const bindings = loadProductionBindingsFromRepo();
  return bindings?.appSync?.apiId?.trim() || 'j7b2x3sh7rcezekekkxxiak7hi';
}

export function buildAppSyncQueriesConsoleUrl(region, apiId = readProductionAppSyncApiId()) {
  const trimmedRegion = region?.trim() || DEFAULT_AWS_REGION;
  const trimmedApiId = apiId?.trim() || readProductionAppSyncApiId();
  return `https://${trimmedRegion}.console.aws.amazon.com/appsync/home?region=${trimmedRegion}#/${trimmedApiId}/v1/queries`;
}

/**
 * @returns {Record<string, unknown> | null}
 */
export function loadAmplifyOutputsFromRepo() {
  if (!existsSync(amplifyOutputsPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(amplifyOutputsPath, 'utf8'));
  } catch (error) {
    console.warn(`Unable to parse ${amplifyOutputsPath}: ${error.message}`);
    return null;
  }
}

export const DEFAULT_CLERK_NAME = 'Deb Dillon';
export const DEFAULT_AWS_ACCOUNT_ID = '570912405222';
export const DEFAULT_AWS_REGION = 'us-east-2';
export const DEFAULT_AMPLIFY_APP_ID = '';
export const DEFAULT_CF_DISTRIBUTION_ID = 'E1NZ3XCY5CYR1J';
export const DEFAULT_STATIC_SITE_BUCKET = 'townofwiley-static-site';
export const DEFAULT_PAYSTAR_PORTAL_URL = 'https://secure.paystar.io/pay/town-of-wiley-utilitybill';

export function readLocalSecrets(secretsPath = localSecretsPath) {
  if (!existsSync(secretsPath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(secretsPath, 'utf8'));
  } catch (error) {
    console.warn(`Unable to parse local secrets from ${secretsPath}: ${error.message}`);
    return {};
  }
}

export function loadAmplifyBranchEnvManifest(path = manifestPath) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * @param {import('node:process').env} env
 * @param {Array<{ name: string; runtimePath?: string }>} requiredList
 * @returns {Array<{ name: string; runtimePath: string }>}
 */
/**
 * Env vars satisfied by amplify_outputs.json (Gen 2 Hosting backend phase).
 * @param {Record<string, unknown> | null} outputs
 */
export function envFromAmplifyOutputs(outputs) {
  if (!outputs || typeof outputs !== 'object') {
    return {};
  }
  const data =
    'data' in outputs && outputs.data && typeof outputs.data === 'object'
      ? /** @type {{ url?: string; api_key?: string; aws_region?: string }} */ (outputs.data)
      : null;
  const out = {};
  if (data?.url?.trim()) {
    out.APPSYNC_CMS_ENDPOINT = data.url.trim();
  }
  if (data?.api_key?.trim()) {
    out.APPSYNC_CMS_API_KEY = data.api_key.trim();
  }
  if (data?.aws_region?.trim()) {
    out.APPSYNC_CMS_REGION = data.aws_region.trim();
  }
  return out;
}

/** Env vars that may be satisfied from infrastructure/gen1-production-bindings.json in strict builds. */
const BINDINGS_ENV_FALLBACKS = {
  CONTACT_UPDATE_REVIEW_API_URL: () =>
    loadProductionBindingsFromRepo()?.contactReview?.reviewApiEndpoint?.trim() ?? '',
};

export function collectRequiredEnvErrors(requiredList, env, localSecrets = {}) {
  const outputsEnv = envFromAmplifyOutputs(loadAmplifyOutputsFromRepo());
  const secretsEnv = envFromLocalSecrets(
    typeof localSecrets === 'object' && localSecrets !== null ? localSecrets : {},
  );
  const effectiveEnv = { ...outputsEnv, ...secretsEnv, ...env };
  const missing = [];
  for (const entry of requiredList) {
    let value = effectiveEnv[entry.name];
    if ((typeof value !== 'string' || value.trim() === '') && BINDINGS_ENV_FALLBACKS[entry.name]) {
      value = BINDINGS_ENV_FALLBACKS[entry.name]();
    }
    if (typeof value !== 'string' || value.trim() === '') {
      missing.push({
        name: entry.name,
        runtimePath: entry.runtimePath ?? '(unknown)',
      });
    }
  }
  return missing;
}

/**
 * @param {string[]} argv process.argv slice after node/script
 * @param {import('node:process').env} env
 */
export function shouldUseStrictMode(argv, env) {
  if (argv.includes('--strict')) {
    return true;
  }
  const flag = env.STRICT_RUNTIME_CONFIG?.trim().toLowerCase();
  if (flag === '1' || flag === 'true' || flag === 'yes') {
    return true;
  }
  return Boolean(env.AWS_APP_ID?.trim());
}

/**
 * Whether generate-runtime-config may read deployed Lambda URLs from infrastructure SSOT.
 * Off for strict Amplify builds and when E2E_RUNTIME_MANIFEST_FALLBACKS=0 (CI E2E).
 *
 * @param {import('node:process').env} env
 * @param {{ strict?: boolean }} [options]
 */
export function shouldAllowManifestFallbacks(env, { strict = false } = {}) {
  if (strict) {
    return false;
  }
  const flag = env.E2E_RUNTIME_MANIFEST_FALLBACKS?.trim().toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'no') {
    return false;
  }
  return true;
}

/**
 * Resolve runtime config field values from process.env with optional local secrets fallback.
 * When strict production build runs, callers validate env before using local fallbacks for required keys.
 *
 * @param {Record<string, unknown>} localSecrets
 * @param {import('node:process').env} env
 * @param {{ allowManifestFallbacks?: boolean }} [options]
 */
export function buildRuntimeConfigValues(localSecrets, env, options = {}) {
  const { allowManifestFallbacks = true } = options;
  const amplifyOutputs = loadAmplifyOutputsFromRepo();
  const outputsData =
    amplifyOutputs && typeof amplifyOutputs === 'object' && 'data' in amplifyOutputs
      ? /** @type {{ url?: string; aws_region?: string; api_key?: string }} */ (amplifyOutputs.data)
      : null;
  const outputsAuth =
    amplifyOutputs && typeof amplifyOutputs === 'object' && 'auth' in amplifyOutputs
      ? /** @type {{ user_pool_id?: string; user_pool_client_id?: string; identity_pool_id?: string; aws_region?: string }} */ (
          amplifyOutputs.auth
        )
      : null;
  const outputsStorage =
    amplifyOutputs && typeof amplifyOutputs === 'object' && 'storage' in amplifyOutputs
      ? /** @type {{ bucket_name?: string; aws_region?: string }} */ (amplifyOutputs.storage)
      : null;

  // Chatbot (Easy-Peasy) decommissioned June 2026 — keep runtime shape for compatibility.
  const chatUrl = '';
  const apiEndpoint = '';
  const weatherApiEndpoint =
    env.NWS_PROXY_ENDPOINT?.trim() ||
    localSecrets.weather?.nws?.apiEndpoint?.trim() ||
    (allowManifestFallbacks ? readDeployedFunctionUrl('TownOfWileyNWSWeatherProxy') : '') ||
    '';
  const severeWeatherSignupApiEndpoint =
    env.SEVERE_WEATHER_SIGNUP_API_ENDPOINT?.trim() ||
    localSecrets.weather?.alertSignup?.apiEndpoint?.trim() ||
    (allowManifestFallbacks ? readDeployedFunctionUrl('TownOfWileySevereWeatherBackend') : '') ||
    '';
  const paystarPortalUrl =
    env.PAYSTAR_PORTAL_URL?.trim() ||
    localSecrets.payments?.paystar?.portalUrl?.trim() ||
    DEFAULT_PAYSTAR_PORTAL_URL;
  const paystarApiEndpoint =
    env.PAYSTAR_API_ENDPOINT?.trim() || localSecrets.payments?.paystar?.apiEndpoint?.trim() || '';
  const explicitPaystarMode =
    env.PAYSTAR_MODE?.trim().toLowerCase() ||
    localSecrets.payments?.paystar?.mode?.trim()?.toLowerCase() ||
    '';
  const cmsApiEndpoint =
    env.APPSYNC_CMS_ENDPOINT?.trim() ||
    localSecrets.cms?.appSync?.apiEndpoint?.trim() ||
    outputsData?.url?.trim() ||
    (allowManifestFallbacks ? readProductionCmsGraphqlEndpoint() : '') ||
    '';
  const cmsApiKey =
    env.APPSYNC_CMS_API_KEY?.trim() ||
    localSecrets.cms?.appSync?.apiKey?.trim() ||
    outputsData?.api_key?.trim() ||
    '';
  const cmsRegion =
    env.APPSYNC_CMS_REGION?.trim() ||
    localSecrets.cms?.appSync?.region?.trim() ||
    outputsData?.aws_region?.trim() ||
    outputsAuth?.aws_region?.trim() ||
    localSecrets.aws?.region?.trim() ||
    DEFAULT_AWS_REGION;
  const clerkSetupAwsAccountId =
    env.CLERK_SETUP_AWS_ACCOUNT_ID?.trim() ||
    localSecrets.clerkSetup?.awsAccountId?.trim() ||
    localSecrets.aws?.accountId?.trim() ||
    DEFAULT_AWS_ACCOUNT_ID;
  const clerkSetupClerkName =
    env.CLERK_SETUP_CLERK_NAME?.trim() ||
    localSecrets.clerkSetup?.clerkName?.trim() ||
    DEFAULT_CLERK_NAME;
  const clerkSetupAmplifyAppId =
    env.CLERK_SETUP_AMPLIFY_APP_ID?.trim() ||
    localSecrets.clerkSetup?.amplifyAppId?.trim() ||
    localSecrets.aws?.amplifyAppId?.trim() ||
    DEFAULT_AMPLIFY_APP_ID;
  const clerkSetupAwsRegion =
    env.CLERK_SETUP_AWS_REGION?.trim() ||
    localSecrets.clerkSetup?.awsRegion?.trim() ||
    cmsRegion ||
    localSecrets.aws?.region?.trim() ||
    DEFAULT_AWS_REGION;
  const clerkSetupAwsConsoleUrl =
    env.CLERK_SETUP_AWS_CONSOLE_URL?.trim() ||
    localSecrets.clerkSetup?.awsConsoleUrl?.trim() ||
    (clerkSetupAwsRegion
      ? `https://${clerkSetupAwsRegion}.console.aws.amazon.com/`
      : 'https://console.aws.amazon.com/');
  // CMS editing: in-app /admin forms (primary) or AppSync Queries console (IT).
  const computedStudioUrl = clerkSetupAwsRegion
    ? buildAppSyncQueriesConsoleUrl(clerkSetupAwsRegion)
    : clerkSetupAwsConsoleUrl;

  const clerkSetupStudioUrl =
    env.CLERK_SETUP_DATA_MANAGER_URL?.trim() ||
    env.CLERK_SETUP_STUDIO_URL?.trim() ||
    localSecrets.clerkSetup?.dataManagerUrl?.trim() ||
    localSecrets.clerkSetup?.studioUrl?.trim() ||
    computedStudioUrl;
  const clerkSetupCfDistributionId =
    env.CLERK_SETUP_CF_DISTRIBUTION_ID?.trim() ||
    localSecrets.clerkSetup?.cfDistributionId?.trim() ||
    DEFAULT_CF_DISTRIBUTION_ID;
  const clerkSetupS3Bucket =
    env.CLERK_SETUP_S3_BUCKET?.trim() ||
    localSecrets.clerkSetup?.s3Bucket?.trim() ||
    DEFAULT_STATIC_SITE_BUCKET;
  const severeWeatherSignupEnabled = (() => {
    const envFlag = env.SEVERE_WEATHER_SIGNUP_ENABLED?.trim().toLowerCase();
    if (envFlag === 'false') {
      return false;
    }
    if (envFlag === 'true') {
      return true;
    }
    if (severeWeatherSignupApiEndpoint) {
      return true;
    }
    return localSecrets.weather?.alertSignup?.enabled === true;
  })();
  const weatherAllowBrowserFallback =
    env.NWS_ALLOW_BROWSER_FALLBACK?.trim().toLowerCase() === 'false'
      ? false
      : localSecrets.weather?.nws?.allowBrowserFallback === false
        ? false
        : true;
  const buttonPosition =
    env.EASYPEASY_BUTTON_POSITION?.trim() ||
    localSecrets.chatbot?.easyPeasy?.buttonPosition?.trim() ||
    'bottom-right';
  const logEndpoint = env.LOG_ENDPOINT?.trim() || localSecrets.logging?.endpoint?.trim() || '';
  const contactUpdateApiEndpoint =
    env.CONTACT_UPDATE_API_ENDPOINT?.trim() ||
    localSecrets.contactUpdate?.apiEndpoint?.trim() ||
    '';
  const contactUpdateReviewApiEndpoint =
    env.CONTACT_UPDATE_REVIEW_API_URL?.trim() ||
    localSecrets.contactUpdate?.reviewApiEndpoint?.trim() ||
    loadProductionBindingsFromRepo()?.contactReview?.reviewApiEndpoint?.trim() ||
    '';
  const contactUpdateReviewProxyEndpoint =
    env.CONTACT_UPDATE_REVIEW_PROXY_URL?.trim() ||
    localSecrets.contactUpdate?.reviewProxyEndpoint?.trim() ||
    '';
  const guestbookApiEndpoint = '';
  const paystarMode =
    explicitPaystarMode === 'api' || explicitPaystarMode === 'hosted'
      ? explicitPaystarMode
      : paystarApiEndpoint
        ? 'api'
        : paystarPortalUrl
          ? 'hosted'
          : 'none';
  const mode = 'none';

  return {
    chatUrl,
    apiEndpoint,
    weatherApiEndpoint,
    severeWeatherSignupApiEndpoint,
    paystarPortalUrl,
    paystarApiEndpoint,
    cmsApiEndpoint,
    cmsApiKey,
    cmsRegion,
    clerkSetupAwsAccountId,
    clerkSetupClerkName,
    clerkSetupAmplifyAppId,
    clerkSetupAwsRegion,
    clerkSetupAwsConsoleUrl,
    clerkSetupStudioUrl,
    clerkSetupCfDistributionId,
    clerkSetupS3Bucket,
    severeWeatherSignupEnabled,
    weatherAllowBrowserFallback,
    buttonPosition,
    logEndpoint,
    contactUpdateApiEndpoint,
    contactUpdateReviewApiEndpoint,
    contactUpdateReviewProxyEndpoint,
    guestbookApiEndpoint,
    paystarMode,
    mode,
    cognitoUserPoolId:
      env.COGNITO_USER_POOL_ID?.trim() ||
      localSecrets.auth?.cognito?.userPoolId?.trim() ||
      loadProductionBindingsFromRepo()?.cognito?.userPoolId?.trim() ||
      outputsAuth?.user_pool_id?.trim() ||
      '',
    cognitoUserPoolClientId:
      env.COGNITO_USER_POOL_CLIENT_ID?.trim() ||
      localSecrets.auth?.cognito?.userPoolClientId?.trim() ||
      loadProductionBindingsFromRepo()?.cognito?.userPoolClientId?.trim() ||
      outputsAuth?.user_pool_client_id?.trim() ||
      '',
    cognitoIdentityPoolId:
      env.COGNITO_IDENTITY_POOL_ID?.trim() ||
      localSecrets.auth?.cognito?.identityPoolId?.trim() ||
      loadProductionBindingsFromRepo()?.cognito?.identityPoolId?.trim() ||
      outputsAuth?.identity_pool_id?.trim() ||
      '',
    cognitoHostedUiDomain:
      env.COGNITO_HOSTED_UI_DOMAIN?.trim() ||
      localSecrets.auth?.cognito?.hostedUiDomain?.trim() ||
      loadProductionBindingsFromRepo()?.cognito?.hostedUiDomain?.trim() ||
      '',
    storageBucketName:
      env.STORAGE_S3_BUCKET?.trim() ||
      localSecrets.storage?.s3?.bucket?.trim() ||
      loadProductionBindingsFromRepo()?.storage?.bucket?.trim() ||
      outputsStorage?.bucket_name?.trim() ||
      '',
    storageRegion:
      env.STORAGE_S3_REGION?.trim() ||
      localSecrets.storage?.s3?.region?.trim() ||
      loadProductionBindingsFromRepo()?.storage?.region?.trim() ||
      outputsStorage?.aws_region?.trim() ||
      '',
  };
}

/**
 * @param {ReturnType<typeof buildRuntimeConfigValues>} values
 * @param {{ timestamp: string; gitSha: string }} buildMeta
 */
export function buildRuntimeConfigObject(values, buildMeta) {
  return {
    chatbot: {
      provider: 'none',
      mode: 'none',
      chatUrl: '',
      buttonPosition: values.buttonPosition,
      apiEndpoint: '',
    },
    build: {
      timestamp: buildMeta.timestamp,
      gitSha: buildMeta.gitSha,
    },
    weather: {
      provider: 'nws',
      apiEndpoint: values.weatherApiEndpoint,
      allowBrowserFallback: values.weatherAllowBrowserFallback,
      alertSignup: {
        enabled: values.severeWeatherSignupEnabled,
        apiEndpoint: values.severeWeatherSignupApiEndpoint,
      },
    },
    payments: {
      provider: 'paystar',
      paystar: {
        mode: values.paystarMode,
        portalUrl: values.paystarPortalUrl,
        apiEndpoint: values.paystarApiEndpoint,
      },
    },
    cms: {
      provider: 'appsync',
      appSync: {
        region: values.cmsRegion,
        apiEndpoint: values.cmsApiEndpoint,
        apiKey: values.cmsApiKey,
      },
    },
    auth: values.cognitoUserPoolId
      ? {
          cognito: {
            userPoolId: values.cognitoUserPoolId,
            userPoolClientId: values.cognitoUserPoolClientId,
            identityPoolId: values.cognitoIdentityPoolId,
            hostedUiDomain: values.cognitoHostedUiDomain || undefined,
          },
        }
      : undefined,
    storage: values.storageBucketName
      ? {
          s3: {
            bucket: values.storageBucketName,
            region: values.storageRegion || values.cmsRegion,
          },
        }
      : undefined,
    clerkSetup: {
      clerkName: values.clerkSetupClerkName,
      awsAccountId: values.clerkSetupAwsAccountId,
      amplifyAppId: values.clerkSetupAmplifyAppId,
      awsRegion: values.clerkSetupAwsRegion,
      awsConsoleUrl: values.clerkSetupAwsConsoleUrl,
      studioUrl: values.clerkSetupStudioUrl,
      dataManagerUrl: values.clerkSetupStudioUrl,
      cfDistributionId: values.clerkSetupCfDistributionId,
      s3Bucket: values.clerkSetupS3Bucket,
    },
    logging: {
      endpoint: values.logEndpoint || undefined,
    },
    contactUpdate: {
      apiEndpoint: values.contactUpdateApiEndpoint,
      reviewApiEndpoint: values.contactUpdateReviewApiEndpoint.replace(/\/$/, ''),
      reviewProxyEndpoint: values.contactUpdateReviewProxyEndpoint,
    },
    guestbook: {
      apiEndpoint: values.guestbookApiEndpoint.replace(/\/$/, ''),
    },
  };
}

export function formatStrictEnvErrors(missing) {
  const lines = missing.map((entry) => `  - ${entry.name} (runtime: ${entry.runtimePath})`);
  return [
    'Strict runtime config: missing required production environment variables:',
    ...lines,
    '',
    'Set them in GitHub Actions repository secrets, local user-secrets (npm run secrets:sync-runtime), or process.env.',
    'See infrastructure/amplify-branch-env.manifest.json and docs/amplify-deployment-runbook.md',
  ].join('\n');
}
