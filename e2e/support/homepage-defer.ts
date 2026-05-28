import { expect } from '@playwright/test';

import type { HomePage } from '../pages/home.page';

/** Scroll deferred homepage blocks into view so feature hub / task grid hydrate. */
export async function revealHomepageDeferredBlocks(homePage: HomePage): Promise<void> {
  const deferTimeoutMs = 35_000;

  await homePage.page.waitForFunction(
    () => {
      document
        .querySelector('.homepage-defer-placeholder--feature-hub')
        ?.scrollIntoView({ block: 'end', inline: 'nearest' });
      const hub = Boolean(document.querySelector('.feature-hub'));
      if (!hub) {
        window.scrollBy({ top: Math.max(320, innerHeight * 0.85), behavior: 'instant' });
      }
      return Boolean(document.querySelector('.feature-hub'));
    },
    undefined,
    { timeout: deferTimeoutMs, polling: 220 },
  );
  await expect(homePage.page.locator('.feature-hub')).toBeVisible({ timeout: 5000 });

  await homePage.page.waitForFunction(
    () => {
      const strip = document.querySelector('.support-strip');
      const placeholder = document.querySelector('.homepage-defer-placeholder--support');
      if (strip) {
        strip.scrollIntoView({ block: 'end', inline: 'nearest' });
      } else {
        placeholder?.scrollIntoView({ block: 'end', inline: 'nearest' });
      }
      if (!document.querySelector('.support-strip')) {
        window.scrollBy({ top: Math.max(240, innerHeight * 0.85), behavior: 'instant' });
      }
      return Boolean(document.querySelector('.support-strip'));
    },
    undefined,
    { timeout: deferTimeoutMs, polling: 220 },
  );
  await expect(homePage.page.locator('.support-strip')).toBeVisible({ timeout: 5000 });

  await homePage.page.evaluate(() => window.scrollTo(0, 0));
}
