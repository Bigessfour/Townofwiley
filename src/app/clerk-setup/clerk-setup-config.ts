interface RuntimeClerkSetupConfig {
  clerkName: string;
  awsAccountId: string;
  amplifyAppId: string;
  awsRegion: string;
  awsConsoleUrl: string;
  studioUrl: string;
  cfDistributionId: string;
  s3Bucket: string;
}

interface RuntimeConfigShape {
  clerkSetup?: Partial<RuntimeClerkSetupConfig>;
}

const DEFAULT_CLERK_NAME = 'Deb Dillon';
const DEFAULT_AWS_ACCOUNT_ID = '570912405222';
const DEFAULT_AWS_REGION = 'us-east-2';
const DEFAULT_AMPLIFY_APP_ID = 'd331voxr1fhoir';
const DEFAULT_CF_DISTRIBUTION_ID = 'E1NZ3XCY5CYR1J';
const DEFAULT_STATIC_SITE_BUCKET = 'townofwiley-static-site';
const FALLBACK_CONSOLE_URL = `https://${DEFAULT_AWS_REGION}.console.aws.amazon.com/`;

type ClerkSetupRuntimeWindow = Window & {
  __TOW_RUNTIME_CONFIG__?: RuntimeConfigShape;
  __TOW_RUNTIME_CONFIG_OVERRIDE__?: RuntimeConfigShape;
};

function trimOrEmpty(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function buildConsoleUrl(region: string): string {
  return region ? `https://${region}.console.aws.amazon.com/` : FALLBACK_CONSOLE_URL;
}

/**
 * Gen 2 Amplify Console → Data manager (primary clerk-friendly editor for the current backend).
 * The Amplify app ID d331voxr1fhoir remains the container for Gen 2 backend/pipeline deploys
 * (Hosting itself moved to S3+CloudFront). This yields the /branches/main/data Data manager.
 * For the raw AppSync Queries tab (Gen 2), call buildAppSyncQueriesConsoleUrl(region, GEN2_APPSYNC_API_ID).
 */
export function buildAmplifyConsoleDataManagerUrl(
  region: string,
  appId: string,
  branchName: string,
  fallbackUrl: string,
): string {
  if (!region || !appId) {
    return fallbackUrl;
  }

  // d331voxr1fhoir is the historical Amplify app (hosting decommissioned). Gen 2 data
  // is managed under the same app ID via Console → branch → Data (or direct AppSync queries).
  const branch = branchName.trim() || 'main';
  return `https://${region}.console.aws.amazon.com/amplify/apps/${appId}/branches/${branch}/data`;
}

/**
 * Best-effort deep link to a model in Amplify Console Data manager (Gen 2).
 * Task cards on /admin use this (or the in-app form) to jump straight to e.g. Announcement.
 * Falls back gracefully if the Console UI evolves.
 */
export function buildAmplifyConsoleDataManagerModelUrl(
  region: string,
  appId: string,
  branchName: string,
  model: string,
  fallbackUrl: string,
): string {
  const base = buildAmplifyConsoleDataManagerUrl(region, appId, branchName, fallbackUrl);
  const trimmed = model.trim();
  if (!trimmed) {
    return base;
  }
  return `${base}/models/${encodeURIComponent(trimmed)}`;
}

/**
 * @deprecated Prefer buildAmplifyConsoleDataManagerUrl (or the "Content editor URL" shown on /admin).
 * Kept for any legacy callers; now resolves to the Gen 2 Data manager path.
 */
export function buildAmplifyAdminStudioHomeUrl(
  region: string,
  appId: string,
  fallbackUrl: string,
): string {
  return buildAmplifyConsoleDataManagerUrl(region, appId, 'main', fallbackUrl);
}

export function getClerkSetupRuntimeConfig(): RuntimeClerkSetupConfig {
  const runtimeWindow =
    typeof window === 'undefined' ? undefined : (window as ClerkSetupRuntimeWindow);
  const runtimeConfig = runtimeWindow?.__TOW_RUNTIME_CONFIG__;
  const runtimeConfigOverride = runtimeWindow?.__TOW_RUNTIME_CONFIG_OVERRIDE__;
  const clerkSetupConfig = {
    ...(runtimeConfig?.clerkSetup ?? {}),
    ...(runtimeConfigOverride?.clerkSetup ?? {}),
  };

  const awsRegion = trimOrEmpty(clerkSetupConfig.awsRegion) || DEFAULT_AWS_REGION;
  const awsConsoleUrl = trimOrEmpty(clerkSetupConfig.awsConsoleUrl) || buildConsoleUrl(awsRegion);
  const amplifyAppId = trimOrEmpty(clerkSetupConfig.amplifyAppId) || DEFAULT_AMPLIFY_APP_ID;

  return {
    clerkName: trimOrEmpty(clerkSetupConfig.clerkName) || DEFAULT_CLERK_NAME,
    awsAccountId: trimOrEmpty(clerkSetupConfig.awsAccountId) || DEFAULT_AWS_ACCOUNT_ID,
    amplifyAppId,
    awsRegion,
    awsConsoleUrl,
    studioUrl:
      trimOrEmpty(clerkSetupConfig.studioUrl) ||
      buildAmplifyConsoleDataManagerUrl(awsRegion, amplifyAppId, 'main', awsConsoleUrl),
    cfDistributionId: trimOrEmpty(clerkSetupConfig.cfDistributionId) || DEFAULT_CF_DISTRIBUTION_ID,
    s3Bucket: trimOrEmpty(clerkSetupConfig.s3Bucket) || DEFAULT_STATIC_SITE_BUCKET,
  };
}
