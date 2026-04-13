interface RuntimeClerkSetupConfig {
  clerkName: string;
  awsAccountId: string;
  amplifyAppId: string;
  awsRegion: string;
  awsConsoleUrl: string;
  studioUrl: string;
}

interface RuntimeConfigShape {
  clerkSetup?: Partial<RuntimeClerkSetupConfig>;
}

const FALLBACK_CONSOLE_URL = 'https://console.aws.amazon.com/';

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

function buildStudioUrl(region: string, appId: string, consoleUrl: string): string {
  if (!region || !appId) {
    return consoleUrl;
  }

  return `https://${region}.console.aws.amazon.com/amplify/home?region=${region}#/${appId}/main/studio/home`;
}

export function getClerkSetupRuntimeConfig(): RuntimeClerkSetupConfig {
  const runtimeWindow = typeof window === 'undefined' ? undefined : (window as ClerkSetupRuntimeWindow);
  const runtimeConfig = runtimeWindow?.__TOW_RUNTIME_CONFIG__;
  const runtimeConfigOverride =
    runtimeWindow?.__TOW_RUNTIME_CONFIG_OVERRIDE__;
  const clerkSetupConfig = {
    ...(runtimeConfig?.clerkSetup ?? {}),
    ...(runtimeConfigOverride?.clerkSetup ?? {}),
  };

  const awsRegion = trimOrEmpty(clerkSetupConfig.awsRegion);
  const awsConsoleUrl = trimOrEmpty(clerkSetupConfig.awsConsoleUrl) || buildConsoleUrl(awsRegion);
  const amplifyAppId = trimOrEmpty(clerkSetupConfig.amplifyAppId);

  return {
    clerkName: trimOrEmpty(clerkSetupConfig.clerkName) || 'Deb Dillon',
    awsAccountId: trimOrEmpty(clerkSetupConfig.awsAccountId),
    amplifyAppId,
    awsRegion,
    awsConsoleUrl,
    studioUrl:
      trimOrEmpty(clerkSetupConfig.studioUrl) || buildStudioUrl(awsRegion, amplifyAppId, awsConsoleUrl),
  };
}