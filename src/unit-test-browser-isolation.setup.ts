/**
 * Runs for `ng test` / `@angular/build:unit-test` (all *.spec.ts) before each test file.
 * Mirrors the browser-state cleanup in `vitest.setup.ts` used by `npm run test:vitest`.
 *
 * Why: CI uses `npm run test:unit:browser` (Chromium). Real browser `localStorage`
 * persists across specs, so a test that sets `tow-site-language` to `es` can break
 * the next English-only spec. Local `ng test` without `--browsers` uses jsdom/Node,
 * which often looks “always green” because storage is not shared the same way.
 */
import { afterEach } from 'vitest';
import { vi } from 'vitest';

afterEach(() => {
  delete (window as Window & {
    __TOW_RUNTIME_CONFIG__?: unknown;
    __TOW_RUNTIME_CONFIG_OVERRIDE__?: unknown;
  }).__TOW_RUNTIME_CONFIG__;

  delete (window as Window & {
    __TOW_RUNTIME_CONFIG__?: unknown;
    __TOW_RUNTIME_CONFIG_OVERRIDE__?: unknown;
  }).__TOW_RUNTIME_CONFIG_OVERRIDE__;

  try {
    window.localStorage?.clear();
  } catch {
    /* non-DOM runners */
  }

  try {
    document.documentElement.removeAttribute('lang');
  } catch {
    /* non-DOM runners */
  }

  vi.restoreAllMocks();
});
