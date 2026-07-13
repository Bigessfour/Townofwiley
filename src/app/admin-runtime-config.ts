/**
 * Staff-only runtime settings from `/runtime-config-admin.js`.
 * Not loaded on public routes — see `ensureAdminRuntimeConfigLoaded()`.
 */

export interface AdminRuntimeClerkSetup {
  clerkName?: string;
  awsAccountId?: string;
  amplifyAppId?: string;
  awsRegion?: string;
  awsConsoleUrl?: string;
  studioUrl?: string;
  dataManagerUrl?: string;
  cfDistributionId?: string;
  s3Bucket?: string;
}

export interface AdminRuntimeConfigShape {
  clerkSetup?: Partial<AdminRuntimeClerkSetup>;
  cms?: {
    mediaUpload?: { apiEndpoint?: string };
    auditLog?: { apiEndpoint?: string };
  };
}

type AdminRuntimeWindow = Window & {
  __TOW_RUNTIME_CONFIG_ADMIN__?: AdminRuntimeConfigShape;
  __TOW_RUNTIME_CONFIG_ADMIN_OVERRIDE__?: AdminRuntimeConfigShape;
};

const ADMIN_SCRIPT_PATH = '/runtime-config-admin.js?ngsw-bypass';

let adminConfigLoadPromise: Promise<void> | null = null;

function adminRuntimeWindow(): AdminRuntimeWindow | undefined {
  return typeof window === 'undefined' ? undefined : (window as AdminRuntimeWindow);
}

/** Merged admin runtime config (script payload + test overrides). */
export function readAdminRuntimeConfig(): AdminRuntimeConfigShape | undefined {
  const runtimeWindow = adminRuntimeWindow();
  if (!runtimeWindow) {
    return undefined;
  }
  const base = runtimeWindow.__TOW_RUNTIME_CONFIG_ADMIN__;
  const override = runtimeWindow.__TOW_RUNTIME_CONFIG_ADMIN_OVERRIDE__;
  if (!base && !override) {
    return undefined;
  }
  return {
    clerkSetup: { ...(base?.clerkSetup ?? {}), ...(override?.clerkSetup ?? {}) },
    cms: {
      ...(base?.cms ?? {}),
      ...(override?.cms ?? {}),
      mediaUpload: {
        ...(base?.cms?.mediaUpload ?? {}),
        ...(override?.cms?.mediaUpload ?? {}),
      },
      auditLog: {
        ...(base?.cms?.auditLog ?? {}),
        ...(override?.cms?.auditLog ?? {}),
      },
    },
  };
}

function injectAdminRuntimeScript(): Promise<void> {
  const runtimeWindow = adminRuntimeWindow();
  if (!runtimeWindow || runtimeWindow.__TOW_RUNTIME_CONFIG_ADMIN__) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-tow-admin-runtime-config="true"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Admin runtime config failed to load.')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = ADMIN_SCRIPT_PATH;
    script.async = true;
    script.dataset['towAdminRuntimeConfig'] = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Admin runtime config failed to load.'));
    document.head.appendChild(script);
  });
}

/** Loads `/runtime-config-admin.js` once before staff admin routes use clerk setup or upload APIs. */
export function ensureAdminRuntimeConfigLoaded(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }
  if (readAdminRuntimeConfig()) {
    return Promise.resolve();
  }
  adminConfigLoadPromise ??= injectAdminRuntimeScript().finally(() => {
    adminConfigLoadPromise = null;
  });
  return adminConfigLoadPromise;
}