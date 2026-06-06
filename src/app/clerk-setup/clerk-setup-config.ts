import { buildAppSyncQueriesConsoleUrl } from './appsync-console-url';

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

/** Gen 2 Amplify Console → Data manager (replaces Gen 1 hosted Studio). */
export function buildAmplifyConsoleDataManagerUrl(
  region: string,
  appId: string,
  branchName: string,
  fallbackUrl: string,
): string {
  if (!region || !appId) {
    return fallbackUrl;
  }

  // The old Amplify Hosting app d331voxr1fhoir was deleted June 2026.
  // IT Advanced links use the live Gen 1 AppSync Queries console (only deployed CMS API).
  if (appId === 'd331voxr1fhoir') {
    return buildAppSyncQueriesConsoleUrl(region);
  }

  const branch = branchName.trim() || 'main';
  return `https://${region}.console.aws.amazon.com/amplify/apps/${appId}/branches/${branch}/data`;
}

/**
 * Best-effort deep link to a model in Amplify Console Data manager.
 * If the console UI changes, callers should fall back to the branch data root.
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
    // For the legacy app we already returned the AppSync queries page; there is
    // no equivalent /models/ deep link in the same console UI.
    return base;
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
    cfDistributionId: trimOrEmpty(clerkSetupConfig.cfDistributionId) || DEFAULT_CF_DISTRIBUTION_ID,
    s3Bucket: trimOrEmpty(clerkSetupConfig.s3Bucket) || DEFAULT_STATIC_SITE_BUCKET,
  };
}
