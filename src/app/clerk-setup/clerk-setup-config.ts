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
 * AppSync Queries console URL for IT troubleshooting (staff CMS editing is on /admin).
 */
export function buildCmsEditorConsoleUrl(region: string, fallbackUrl: string): string {
  if (!region) {
    return fallbackUrl;
  }
  return buildAppSyncQueriesConsoleUrl(region);
}

/** @deprecated Use buildCmsEditorConsoleUrl — Amplify Hosting/Data manager removed June 2026. */
export function buildAmplifyConsoleDataManagerUrl(
  region: string,
  _appId: string,
  _branchName: string,
  fallbackUrl: string,
): string {
  return buildCmsEditorConsoleUrl(region, fallbackUrl);
}

/** @deprecated Prefer in-app /admin forms; deep links to Amplify Data manager are no longer used. */
export function buildAmplifyConsoleDataManagerModelUrl(
  region: string,
  appId: string,
  branchName: string,
  _model: string,
  fallbackUrl: string,
): string {
  return buildAmplifyConsoleDataManagerUrl(region, appId, branchName, fallbackUrl);
}

/** @deprecated Use buildCmsEditorConsoleUrl. */
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

  return {
    clerkName: trimOrEmpty(clerkSetupConfig.clerkName) || DEFAULT_CLERK_NAME,
    awsAccountId: trimOrEmpty(clerkSetupConfig.awsAccountId) || DEFAULT_AWS_ACCOUNT_ID,
    amplifyAppId: trimOrEmpty(clerkSetupConfig.amplifyAppId) || '',
    awsRegion,
    awsConsoleUrl,
    studioUrl:
      trimOrEmpty(clerkSetupConfig.studioUrl) || buildCmsEditorConsoleUrl(awsRegion, awsConsoleUrl),
    cfDistributionId: trimOrEmpty(clerkSetupConfig.cfDistributionId) || DEFAULT_CF_DISTRIBUTION_ID,
    s3Bucket: trimOrEmpty(clerkSetupConfig.s3Bucket) || DEFAULT_STATIC_SITE_BUCKET,
  };
}
