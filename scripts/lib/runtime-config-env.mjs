import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const libDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(libDir, '..', '..');
export const manifestPath = join(repoRoot, 'infrastructure', 'amplify-branch-env.manifest.json');
export const localSecretsPath = join(repoRoot, 'secrets', 'local', 'user-secrets.json');

export const DEFAULT_CLERK_NAME = 'Deb Dillon';
export const DEFAULT_AWS_ACCOUNT_ID = '570912405222';
export const DEFAULT_AWS_REGION = 'us-east-2';
export const DEFAULT_AMPLIFY_APP_ID = 'd331voxr1fhoir';

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
export function collectRequiredEnvErrors(requiredList, env) {
  const missing = [];
  for (const entry of requiredList) {
    const value = env[entry.name];
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
 * Resolve runtime config field values from process.env with optional local secrets fallback.
 * When strict production build runs, callers validate env before using local fallbacks for required keys.
 *
 * @param {Record<string, unknown>} localSecrets
 * @param {import('node:process').env} env
 */
export function buildRuntimeConfigValues(localSecrets, env) {
  const chatUrl =
    env.EASYPEASY_CHAT_URL?.trim() || localSecrets.chatbot?.easyPeasy?.chatUrl?.trim() || '';
  const apiEndpoint =
    env.EASYPEASY_API_ENDPOINT?.trim() ||
    localSecrets.chatbot?.easyPeasy?.apiEndpoint?.trim() ||
    '';
  const weatherApiEndpoint =
    env.NWS_PROXY_ENDPOINT?.trim() || localSecrets.weather?.nws?.apiEndpoint?.trim() || '';
  const severeWeatherSignupApiEndpoint =
    env.SEVERE_WEATHER_SIGNUP_API_ENDPOINT?.trim() ||
    localSecrets.weather?.alertSignup?.apiEndpoint?.trim() ||
    '';
  const paystarPortalUrl =
    env.PAYSTAR_PORTAL_URL?.trim() || localSecrets.payments?.paystar?.portalUrl?.trim() || '';
  const paystarApiEndpoint =
    env.PAYSTAR_API_ENDPOINT?.trim() || localSecrets.payments?.paystar?.apiEndpoint?.trim() || '';
  const explicitPaystarMode =
    env.PAYSTAR_MODE?.trim().toLowerCase() ||
    localSecrets.payments?.paystar?.mode?.trim()?.toLowerCase() ||
    '';
  const cmsApiEndpoint =
    env.APPSYNC_CMS_ENDPOINT?.trim() || localSecrets.cms?.appSync?.apiEndpoint?.trim() || '';
  const cmsApiKey =
    env.APPSYNC_CMS_API_KEY?.trim() || localSecrets.cms?.appSync?.apiKey?.trim() || '';
  const cmsRegion =
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
  const clerkSetupStudioUrl =
    env.CLERK_SETUP_STUDIO_URL?.trim() ||
    localSecrets.clerkSetup?.studioUrl?.trim() ||
    (clerkSetupAwsRegion && clerkSetupAmplifyAppId
      ? `https://${clerkSetupAwsRegion}.admin.amplifyapp.com/admin/${clerkSetupAmplifyAppId}/main/home`
      : clerkSetupAwsConsoleUrl);
  const severeWeatherSignupEnabled =
    env.SEVERE_WEATHER_SIGNUP_ENABLED?.trim().toLowerCase() === 'false'
      ? false
      : env.SEVERE_WEATHER_SIGNUP_ENABLED?.trim().toLowerCase() === 'true'
        ? true
        : localSecrets.weather?.alertSignup?.enabled === false
          ? false
          : Boolean(severeWeatherSignupApiEndpoint || localSecrets.weather?.alertSignup?.enabled);
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
  const paystarMode =
    explicitPaystarMode === 'api' || explicitPaystarMode === 'hosted'
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
    paystarMode,
    mode,
  };
}

/**
 * @param {ReturnType<typeof buildRuntimeConfigValues>} values
 * @param {{ timestamp: string; gitSha: string }} buildMeta
 */
export function buildRuntimeConfigObject(values, buildMeta) {
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
    clerkSetup: {
      clerkName: values.clerkSetupClerkName,
      awsAccountId: values.clerkSetupAwsAccountId,
      amplifyAppId: values.clerkSetupAmplifyAppId,
      awsRegion: values.clerkSetupAwsRegion,
      awsConsoleUrl: values.clerkSetupAwsConsoleUrl,
      studioUrl: values.clerkSetupStudioUrl,
    },
    logging: {
      endpoint: values.logEndpoint || undefined,
    },
    contactUpdate: {
      apiEndpoint: values.contactUpdateApiEndpoint,
      reviewApiEndpoint: values.contactUpdateReviewApiEndpoint.replace(/\/$/, ''),
      reviewProxyEndpoint: values.contactUpdateReviewProxyEndpoint,
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
