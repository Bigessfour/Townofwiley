import type { Page } from '@playwright/test';

/** Disable the Playwright staff bypass so /admin/login renders the sign-in form. */
export async function disableE2eStaffAuth(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const runtimeWindow = window as Window & {
      __TOW_RUNTIME_CONFIG_OVERRIDE__?: { e2e?: { staffAuth?: boolean } };
    };
    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
      e2e: {
        ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.e2e ?? {}),
        staffAuth: false,
      },
    };
  });
}

/** Playwright-only staff session for /admin routes (never set in production runtime-config). */
export async function enableE2eStaffAuth(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const runtimeWindow = window as Window & {
      __TOW_RUNTIME_CONFIG_OVERRIDE__?: { e2e?: { staffAuth?: boolean } };
    };
    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
      e2e: {
        ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.e2e ?? {}),
        staffAuth: true,
      },
    };
  });
}
