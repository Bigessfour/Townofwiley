import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localSecretsPath = join(repoRoot, 'secrets', 'local', 'user-secrets.json');
const runtimeConfigPath = join(repoRoot, 'public', 'runtime-config.js');
const DEFAULT_CLERK_NAME = 'Deb Dillon';
const DEFAULT_AWS_ACCOUNT_ID = '570912405222';
const DEFAULT_AWS_REGION = 'us-east-2';
const DEFAULT_AMPLIFY_APP_ID = 'd331voxr1fhoir';

function readLocalSecrets() {
  if (!existsSync(localSecretsPath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(localSecretsPath, 'utf8'));
  } catch (error) {
    console.warn(`Unable to parse local secrets from ${localSecretsPath}: ${error.message}`);
    return {};
  }
}

const localSecrets = readLocalSecrets();
const chatUrl =
  process.env.EASYPEASY_CHAT_URL?.trim() || localSecrets.chatbot?.easyPeasy?.chatUrl?.trim() || '';
const apiEndpoint =
  process.env.EASYPEASY_API_ENDPOINT?.trim() ||
  localSecrets.chatbot?.easyPeasy?.apiEndpoint?.trim() ||
  '';
const weatherApiEndpoint =
  process.env.NWS_PROXY_ENDPOINT?.trim() || localSecrets.weather?.nws?.apiEndpoint?.trim() || '';
const severeWeatherSignupApiEndpoint =
  process.env.SEVERE_WEATHER_SIGNUP_API_ENDPOINT?.trim() ||
  localSecrets.weather?.alertSignup?.apiEndpoint?.trim() ||
  '';
const paystarPortalUrl =
  process.env.PAYSTAR_PORTAL_URL?.trim() || localSecrets.payments?.paystar?.portalUrl?.trim() || '';
const paystarApiEndpoint =
  process.env.PAYSTAR_API_ENDPOINT?.trim() ||
  localSecrets.payments?.paystar?.apiEndpoint?.trim() ||
  '';
const explicitPaystarMode =
  process.env.PAYSTAR_MODE?.trim().toLowerCase() ||
  localSecrets.payments?.paystar?.mode?.trim()?.toLowerCase() ||
  '';
const cmsApiEndpoint =
  process.env.APPSYNC_CMS_ENDPOINT?.trim() || localSecrets.cms?.appSync?.apiEndpoint?.trim() || '';
const cmsApiKey =
  process.env.APPSYNC_CMS_API_KEY?.trim() || localSecrets.cms?.appSync?.apiKey?.trim() || '';
const cmsRegion =
  process.env.APPSYNC_CMS_REGION?.trim() ||
  localSecrets.cms?.appSync?.region?.trim() ||
  localSecrets.aws?.region?.trim() ||
  DEFAULT_AWS_REGION;
const clerkSetupAwsAccountId =
  process.env.CLERK_SETUP_AWS_ACCOUNT_ID?.trim() ||
  localSecrets.clerkSetup?.awsAccountId?.trim() ||
  localSecrets.aws?.accountId?.trim() ||
  DEFAULT_AWS_ACCOUNT_ID;
const clerkSetupClerkName =
  process.env.CLERK_SETUP_CLERK_NAME?.trim() ||
  localSecrets.clerkSetup?.clerkName?.trim() ||
  DEFAULT_CLERK_NAME;
const clerkSetupAmplifyAppId =
  process.env.CLERK_SETUP_AMPLIFY_APP_ID?.trim() ||
  localSecrets.clerkSetup?.amplifyAppId?.trim() ||
  localSecrets.aws?.amplifyAppId?.trim() ||
  DEFAULT_AMPLIFY_APP_ID;
const clerkSetupAwsRegion =
  process.env.CLERK_SETUP_AWS_REGION?.trim() ||
  localSecrets.clerkSetup?.awsRegion?.trim() ||
  cmsRegion ||
  localSecrets.aws?.region?.trim() ||
  DEFAULT_AWS_REGION;
const clerkSetupAwsConsoleUrl =
  process.env.CLERK_SETUP_AWS_CONSOLE_URL?.trim() ||
  localSecrets.clerkSetup?.awsConsoleUrl?.trim() ||
  (clerkSetupAwsRegion
    ? `https://${clerkSetupAwsRegion}.console.aws.amazon.com/`
    : 'https://console.aws.amazon.com/');
const clerkSetupStudioUrl =
  process.env.CLERK_SETUP_STUDIO_URL?.trim() ||
  localSecrets.clerkSetup?.studioUrl?.trim() ||
  (clerkSetupAwsRegion && clerkSetupAmplifyAppId
    ? `https://${clerkSetupAwsRegion}.console.aws.amazon.com/amplify/home?region=${clerkSetupAwsRegion}#/${clerkSetupAmplifyAppId}/main/studio/home`
    : clerkSetupAwsConsoleUrl);
const severeWeatherSignupEnabled =
  process.env.SEVERE_WEATHER_SIGNUP_ENABLED?.trim().toLowerCase() === 'false'
    ? false
    : process.env.SEVERE_WEATHER_SIGNUP_ENABLED?.trim().toLowerCase() === 'true'
      ? true
      : localSecrets.weather?.alertSignup?.enabled === false
        ? false
        : Boolean(severeWeatherSignupApiEndpoint || localSecrets.weather?.alertSignup?.enabled);
const weatherAllowBrowserFallback =
  process.env.NWS_ALLOW_BROWSER_FALLBACK?.trim().toLowerCase() === 'false'
    ? false
    : localSecrets.weather?.nws?.allowBrowserFallback === false
      ? false
      : true;
const buttonPosition =
  process.env.EASYPEASY_BUTTON_POSITION?.trim() ||
  localSecrets.chatbot?.easyPeasy?.buttonPosition?.trim() ||
  'bottom-right';
const logEndpoint =
  process.env.LOG_ENDPOINT?.trim() || localSecrets.logging?.endpoint?.trim() || '';
const contactUpdateApiEndpoint =
  process.env.CONTACT_UPDATE_API_ENDPOINT?.trim() ||
  localSecrets.contactUpdate?.apiEndpoint?.trim() ||
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

const buildTimestamp = new Date().toISOString();
let gitSha = 'unknown';
try {
  gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('Could not determine git SHA (not a git repo or git unavailable)');
}

const runtimeConfig = {
  chatbot: {
    provider: 'easyPeasy',
    mode,
    chatUrl,
    buttonPosition,
    apiEndpoint,
  },
  build: {
    timestamp: buildTimestamp,
    gitSha,
  },
  weather: {
    provider: 'nws',
    apiEndpoint: weatherApiEndpoint,
    allowBrowserFallback: weatherAllowBrowserFallback,
    alertSignup: {
      enabled: severeWeatherSignupEnabled,
      apiEndpoint: severeWeatherSignupApiEndpoint,
    },
  },
  payments: {
    provider: 'paystar',
    paystar: {
      mode: paystarMode,
      portalUrl: paystarPortalUrl,
      apiEndpoint: paystarApiEndpoint,
    },
  },
  cms: {
    provider: 'appsync',
    appSync: {
      region: cmsRegion,
      apiEndpoint: cmsApiEndpoint,
      apiKey: cmsApiKey,
    },
  },
  clerkSetup: {
    clerkName: clerkSetupClerkName,
    awsAccountId: clerkSetupAwsAccountId,
    amplifyAppId: clerkSetupAmplifyAppId,
    awsRegion: clerkSetupAwsRegion,
    awsConsoleUrl: clerkSetupAwsConsoleUrl,
    studioUrl: clerkSetupStudioUrl,
  },
  logging: {
    endpoint: logEndpoint || undefined,
  },
  contactUpdate: {
    apiEndpoint: contactUpdateApiEndpoint,
  },
};

writeFileSync(
  runtimeConfigPath,
  `window.__TOW_RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig, null, 2)};\n`,
);

console.log(`Runtime config written to ${runtimeConfigPath}`);
