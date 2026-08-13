import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureAdminRuntimeConfigLoaded, readAdminRuntimeConfig } from './admin-runtime-config';

const adminWindow = window as Window & {
  __TOW_RUNTIME_CONFIG_ADMIN__?: {
    clerkSetup?: { clerkName?: string; awsRegion?: string };
    contactUpdate?: { reviewApiEndpoint?: string; reviewProxyEndpoint?: string };
  };
  __TOW_RUNTIME_CONFIG_ADMIN_OVERRIDE__?: {
    clerkSetup?: { clerkName?: string };
    contactUpdate?: { reviewApiEndpoint?: string; reviewProxyEndpoint?: string };
  };
};

beforeEach(() => {
  delete adminWindow.__TOW_RUNTIME_CONFIG_ADMIN__;
  delete adminWindow.__TOW_RUNTIME_CONFIG_ADMIN_OVERRIDE__;
});

afterEach(() => {
  document.querySelectorAll('script[data-tow-admin-runtime-config="true"]').forEach((node) => {
    node.remove();
  });
});

describe('readAdminRuntimeConfig', () => {
  it('merges base admin config with overrides', () => {
    adminWindow.__TOW_RUNTIME_CONFIG_ADMIN__ = {
      clerkSetup: { clerkName: 'Base', awsRegion: 'us-east-2' },
    };
    adminWindow.__TOW_RUNTIME_CONFIG_ADMIN_OVERRIDE__ = {
      clerkSetup: { clerkName: 'Override' },
    };

    expect(readAdminRuntimeConfig()?.clerkSetup).toEqual({
      clerkName: 'Override',
      awsRegion: 'us-east-2',
    });
  });

  it('merges staff contact-review URLs from admin override', () => {
    adminWindow.__TOW_RUNTIME_CONFIG_ADMIN__ = {
      contactUpdate: { reviewApiEndpoint: 'https://api.example/review' },
    };
    adminWindow.__TOW_RUNTIME_CONFIG_ADMIN_OVERRIDE__ = {
      contactUpdate: { reviewProxyEndpoint: '/api/contact-updates-review' },
    };

    expect(readAdminRuntimeConfig()?.contactUpdate).toEqual({
      reviewApiEndpoint: 'https://api.example/review',
      reviewProxyEndpoint: '/api/contact-updates-review',
    });
  });
});

describe('ensureAdminRuntimeConfigLoaded', () => {
  it('resolves immediately when admin config is already present', async () => {
    adminWindow.__TOW_RUNTIME_CONFIG_ADMIN__ = { clerkSetup: { clerkName: 'Ready' } };
    const appendSpy = vi.spyOn(document.head, 'appendChild');

    await ensureAdminRuntimeConfigLoaded();

    expect(appendSpy).not.toHaveBeenCalled();
    appendSpy.mockRestore();
  });
});
