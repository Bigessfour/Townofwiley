interface RuntimeClerkSetupConfig {
  clerkName: string;
  awsAccountId: string;
  amplifyAppId: string;
  awsRegion: string;
  awsConsoleUrl: string;
  studioUrl: string;
  cfDistributionId?: string;
  s3Bucket?: string;
}

interface RuntimeConfigShape {
  clerkSetup?: Partial<RuntimeClerkSetupConfig>;
}

const DEFAULT_CLERK_NAME = 'Deb Dillon';
const DEFAULT_AWS_ACCOUNT_ID = '570912405222';
const DEFAULT_AWS_REGION = 'us-east-2';
/** Legacy Amplify Hosting app ID (deleted June 2026 after S3+CloudFront migration). Retained only for reference in runtime/secrets. */
const DEFAULT_AMPLIFY_APP_ID = 'd331voxr1fhoir';
/** Current prod AppSync (Gen 2 backend, used for CMS models like Event, AlertBanner etc.). Gen 1 (j7b2...) is legacy. */
const CURRENT_APPSYNC_API_ID = 'x7poehudqvamneqni5s6e2cjxy';
const CURRENT_APPSYNC_CONSOLE_BASE = `https://${DEFAULT_AWS_REGION}.console.aws.amazon.com/appsync/home?region=${DEFAULT_AWS_REGION}#/${CURRENT_APPSYNC_API_ID}/v1`;
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
 * Legacy Amplify Data Manager link (for historical app ID).
 * For current backend (Gen 2 AppSync x7poeh...), falls back to AppSync console
 * (use Queries tab or schema to manage Event, Announcement, AlertBanner, etc. models). Gen 1 j7b2 is legacy.
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

  // Legacy/deleted hosting app: use AppSync (Gen 2) console for CMS model editing instead.
  if (appId === 'd331voxr1fhoir') {
    return `${CURRENT_APPSYNC_CONSOLE_BASE}/queries`;
  }

  const branch = branchName.trim() || 'main';
  return `https://${region}.console.aws.amazon.com/amplify/apps/${appId}/branches/${branch}/data`;
}

/**
 * Best-effort deep link to a model.
 * For legacy hosting app, points to Gen 2 AppSync queries (filter by model name or use create* mutations).
 * Gen 1 backend (j7b2...) legacy only.
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
  if (appId === 'd331voxr1fhoir') {
    // For AppSync (Gen 2), user can search schema or use queries for the model.
    return base; // points to /queries
  }
  return `${base}/models/${encodeURIComponent(trimmed)}`;
}

/** @deprecated Gen 1 Studio home; use {@link buildAmplifyConsoleDataManagerUrl}. */
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
    cfDistributionId: trimOrEmpty(clerkSetupConfig.cfDistributionId),
    s3Bucket: trimOrEmpty(clerkSetupConfig.s3Bucket),
  };
}
