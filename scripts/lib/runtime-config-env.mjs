import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDeployedFunctionUrl } from './deployed-function-urls.mjs';
import { loadProductionBindings } from './gen1-cms-ssot.mjs';
import { envFromLocalSecrets } from './runtime-secret-mappings.mjs';

const libDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(libDir, '..', '..');
export const manifestPath = join(repoRoot, 'infrastructure', 'amplify-branch-env.manifest.json');
export const localSecretsPath = join(repoRoot, 'secrets', 'local', 'user-secrets.json');
export const amplifyOutputsPath = join(repoRoot, 'amplify_outputs.json');

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
export const DEFAULT_AMPLIFY_APP_ID = 'd331voxr1fhoir';
/** Live Town Paystar hosted portal (public URL; not a secret). */
export const DEFAULT_PAYSTAR_PORTAL_URL =
  'https://secure.paystar.io/pay/town-of-wiley-utilitybill';

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

/**
 * @param {Array<{ name: string; runtimePath?: string }>} requiredList
 * @param {import('node:process').env} env
 * @param {Record<string, unknown>} [localSecrets]
 */
export function collectRequiredEnvErrors(requiredList, env, localSecrets = {}) {
  const outputsEnv = envFromAmplifyOutputs(loadAmplifyOutputsFromRepo());
  const secretsEnv = envFromLocalSecrets(
    typeof localSecrets === 'object' && localSecrets !== null ? localSecrets : {},
  );
  const effectiveEnv = { ...outputsEnv, ...secretsEnv, ...env };
  const missing = [];
  for (const entry of requiredList) {
    const value = effectiveEnv[entry.name];
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
 * Strict production generate used by `npm run build:ci`.
 * `STRICT_RUNTIME_CONFIG=0` always wins (Dependabot / secretless PR CI).
 *
 * @param {import('node:process').env} env
 */
export function shouldRunStrictProductionBuild(env) {
  const flag = env.STRICT_RUNTIME_CONFIG?.trim().toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'no') {
    return false;
  }
  return shouldUseStrictMode([], env);
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
  const gen1Bindings = allowManifestFallbacks ? loadProductionBindings() : null;
  const gen1Cognito =
    /** @type {{ userPoolId?: string; userPoolClientId?: string; identityPoolId?: string }} */ (
      gen1Bindings?.cognito ?? {}
    );
  const gen1Storage =
    /** @type {{ bucket?: string; region?: string }} */ (gen1Bindings?.storage ?? {});

  const chatUrl =
    env.EASYPEASY_CHAT_URL?.trim() || localSecrets.chatbot?.easyPeasy?.chatUrl?.trim() || '';
  const apiEndpoint =
    env.EASYPEASY_API_ENDPOINT?.trim() ||
    localSecrets.chatbot?.easyPeasy?.apiEndpoint?.trim() ||
    '';
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
  const envPaystarMode = env.PAYSTAR_MODE?.trim().toLowerCase() || '';
  const secretsPaystarMode = localSecrets.payments?.paystar?.mode?.trim()?.toLowerCase() || '';
  const configuredPaystarPortalUrl =
    env.PAYSTAR_PORTAL_URL?.trim() || localSecrets.payments?.paystar?.portalUrl?.trim() || '';
  const paystarPortalUrl =
    envPaystarMode === 'none'
      ? configuredPaystarPortalUrl
      : configuredPaystarPortalUrl || DEFAULT_PAYSTAR_PORTAL_URL;
  const paystarApiEndpoint =
    env.PAYSTAR_API_ENDPOINT?.trim() || localSecrets.payments?.paystar?.apiEndpoint?.trim() || '';
  const explicitPaystarMode = envPaystarMode || secretsPaystarMode;
  const cmsApiEndpoint =
    outputsData?.url?.trim() ||
    env.APPSYNC_CMS_ENDPOINT?.trim() ||
    localSecrets.cms?.appSync?.apiEndpoint?.trim() ||
    '';
  const cmsApiKey =
    outputsData?.api_key?.trim() ||
    env.APPSYNC_CMS_API_KEY?.trim() ||
    localSecrets.cms?.appSync?.apiKey?.trim() ||
    '';
  const cmsRegion =
    outputsData?.aws_region?.trim() ||
    outputsAuth?.aws_region?.trim() ||
    env.APPSYNC_CMS_REGION?.trim() ||
    localSecrets.cms?.appSync?.region?.trim() ||
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
  const amplifyBranch = env.AWS_BRANCH?.trim() || env.AMPLIFY_BRANCH?.trim() || 'main';
  // Compute a good studioUrl / dataManagerUrl for the clerkSetup in runtime-config.js.
  // If the (legacy) amplifyAppId is the deleted d331voxr1fhoir hosting app, point to current
  // Gen 2 AppSync console instead of the 404ing Amplify Data manager URL.
  let computedClerkSetupStudioUrl;
  if (clerkSetupAmplifyAppId === 'd331voxr1fhoir') {
    computedClerkSetupStudioUrl = clerkSetupAwsRegion
      ? `https://${clerkSetupAwsRegion}.console.aws.amazon.com/appsync/home?region=${clerkSetupAwsRegion}#/x7poehudqvamneqni5s6e2cjxy/v1/queries`
      : clerkSetupAwsConsoleUrl;
  } else if (clerkSetupAwsRegion && clerkSetupAmplifyAppId) {
    computedClerkSetupStudioUrl = `https://${clerkSetupAwsRegion}.console.aws.amazon.com/amplify/apps/${clerkSetupAmplifyAppId}/branches/${amplifyBranch}/data`;
  } else {
    computedClerkSetupStudioUrl = clerkSetupAwsConsoleUrl;
  }
  const clerkSetupStudioUrl =
    env.CLERK_SETUP_DATA_MANAGER_URL?.trim() ||
    env.CLERK_SETUP_STUDIO_URL?.trim() ||
    localSecrets.clerkSetup?.dataManagerUrl?.trim() ||
    localSecrets.clerkSetup?.studioUrl?.trim() ||
    computedClerkSetupStudioUrl;
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
    '';
  const contactUpdateReviewProxyEndpoint =
    env.CONTACT_UPDATE_REVIEW_PROXY_URL?.trim() ||
    localSecrets.contactUpdate?.reviewProxyEndpoint?.trim() ||
    '';
  const guestbookApiEndpoint =
    env.GUESTBOOK_API_ENDPOINT?.trim() || localSecrets.guestbook?.apiEndpoint?.trim() || '';
  const communityCalendarApiEndpoint =
    env.COMMUNITY_CALENDAR_ENDPOINT?.trim() ||
    localSecrets.communityCalendar?.apiEndpoint?.trim() ||
    (allowManifestFallbacks ? readDeployedFunctionUrl('TownOfWileyCommunityCalendar') : '') ||
    '';
  const cmsMediaUploadEndpoint =
    env.CMS_MEDIA_UPLOAD_API_ENDPOINT?.trim() ||
    localSecrets.cms?.mediaUpload?.apiEndpoint?.trim() ||
    (allowManifestFallbacks ? readDeployedFunctionUrl('TownOfWileyCmsMediaUpload') : '') ||
    '';
  const cmsAuditLogEndpoint =
    env.CMS_AUDIT_LOG_API_ENDPOINT?.trim() ||
    localSecrets.cms?.auditLog?.apiEndpoint?.trim() ||
    (allowManifestFallbacks ? readDeployedFunctionUrl('TownOfWileyCmsChangeNotifier') : '') ||
    '';
  const paystarMode =
    envPaystarMode === 'none'
      ? 'none'
      : explicitPaystarMode === 'api' || explicitPaystarMode === 'hosted'
        ? explicitPaystarMode
        : paystarApiEndpoint
          ? 'api'
          : paystarPortalUrl
            ? 'hosted'
            : 'none';
  const mode = apiEndpoint ? 'api' : chatUrl ? 'embed' : 'none';

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
    severeWeatherSignupEnabled,
    weatherAllowBrowserFallback,
    buttonPosition,
    logEndpoint,
    contactUpdateApiEndpoint,
    contactUpdateReviewApiEndpoint,
    contactUpdateReviewProxyEndpoint,
    guestbookApiEndpoint,
    communityCalendarApiEndpoint,
    cmsMediaUploadEndpoint,
    cmsAuditLogEndpoint,
    paystarMode,
    mode,
    cognitoUserPoolId:
      outputsAuth?.user_pool_id?.trim() ||
      env.COGNITO_USER_POOL_ID?.trim() ||
      localSecrets.auth?.cognito?.userPoolId?.trim() ||
      (allowManifestFallbacks ? gen1Cognito.userPoolId?.trim() || '' : '') ||
      '',
    cognitoUserPoolClientId:
      outputsAuth?.user_pool_client_id?.trim() ||
      env.COGNITO_USER_POOL_CLIENT_ID?.trim() ||
      localSecrets.auth?.cognito?.userPoolClientId?.trim() ||
      (allowManifestFallbacks ? gen1Cognito.userPoolClientId?.trim() || '' : '') ||
      '',
    cognitoIdentityPoolId:
      outputsAuth?.identity_pool_id?.trim() ||
      env.COGNITO_IDENTITY_POOL_ID?.trim() ||
      localSecrets.auth?.cognito?.identityPoolId?.trim() ||
      (allowManifestFallbacks ? gen1Cognito.identityPoolId?.trim() || '' : '') ||
      '',
    storageBucketName:
      outputsStorage?.bucket_name?.trim() ||
      env.STORAGE_BUCKET_NAME?.trim() ||
      localSecrets.storage?.s3?.bucket?.trim() ||
      (allowManifestFallbacks ? gen1Storage.bucket?.trim() || '' : '') ||
      '',
    storageRegion:
      outputsStorage?.aws_region?.trim() ||
      env.STORAGE_REGION?.trim() ||
      localSecrets.storage?.s3?.region?.trim() ||
      (allowManifestFallbacks ? gen1Storage.region?.trim() || '' : '') ||
      '',
  };
}

/**
 * Staff-only runtime settings (loaded on /admin, not on the public homepage).
 * @param {ReturnType<typeof buildRuntimeConfigValues>} values
 */
export function buildAdminRuntimeConfigObject(values) {
  const cms = {
    ...(values.cmsMediaUploadEndpoint
      ? {
          mediaUpload: {
            apiEndpoint: values.cmsMediaUploadEndpoint,
          },
        }
      : {}),
    ...(values.cmsAuditLogEndpoint
      ? {
          auditLog: {
            apiEndpoint: values.cmsAuditLogEndpoint,
          },
        }
      : {}),
  };
  return {
    clerkSetup: {
      clerkName: values.clerkSetupClerkName,
      awsAccountId: values.clerkSetupAwsAccountId,
      amplifyAppId: values.clerkSetupAmplifyAppId,
      awsRegion: values.clerkSetupAwsRegion,
      awsConsoleUrl: values.clerkSetupAwsConsoleUrl,
      studioUrl: values.clerkSetupStudioUrl,
      dataManagerUrl: values.clerkSetupStudioUrl,
    },
    contactUpdate: {
      reviewApiEndpoint: values.contactUpdateReviewApiEndpoint.replace(/\/$/, ''),
      reviewProxyEndpoint: values.contactUpdateReviewProxyEndpoint,
    },
    ...(Object.keys(cms).length > 0 ? { cms } : {}),
  };
}

/**
 * Public visitor payload written to `runtime-config.js`.
 * @param {ReturnType<typeof buildRuntimeConfigValues>} values
 * @param {{ timestamp: string; gitSha: string }} buildMeta
 */
export function buildPublicRuntimeConfigObject(values, buildMeta) {
  return {
    chatbot: {
      provider: 'easyPeasy',
      mode: values.mode,
      chatUrl: values.chatUrl,
      buttonPosition: values.buttonPosition,
      apiEndpoint: values.apiEndpoint,
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
    logging: {
      endpoint: values.logEndpoint || undefined,
    },
    contactUpdate: {
      apiEndpoint: values.contactUpdateApiEndpoint,
    },
    guestbook: {
      apiEndpoint: values.guestbookApiEndpoint.replace(/\/$/, ''),
    },
    communityCalendar: {
      apiEndpoint: values.communityCalendarApiEndpoint.replace(/\/$/, ''),
    },
  };
}

/**
 * Full merged config (tests and local overrides only).
 * @param {ReturnType<typeof buildRuntimeConfigValues>} values
 * @param {{ timestamp: string; gitSha: string }} buildMeta
 */
export function buildRuntimeConfigObject(values, buildMeta) {
  const admin = buildAdminRuntimeConfigObject(values);
  const publicConfig = buildPublicRuntimeConfigObject(values, buildMeta);
  return {
    ...publicConfig,
    clerkSetup: admin.clerkSetup,
    cms: {
      ...publicConfig.cms,
      ...admin.cms,
    },
    contactUpdate: {
      ...publicConfig.contactUpdate,
      ...admin.contactUpdate,
    },
  };
}

export function formatStrictEnvErrors(missing) {
  const lines = missing.map((entry) => `  - ${entry.name} (runtime: ${entry.runtimePath})`);
  return [
    'Strict runtime config: missing required production environment variables:',
    ...lines,
    '',
    'Set them in Amplify Console (branch main) and GitHub Actions repository secrets.',
    'See infrastructure/amplify-branch-env.manifest.json and docs/amplify-deployment-runbook.md',
  ].join('\n');
}
