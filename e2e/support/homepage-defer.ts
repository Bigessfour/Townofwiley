import { expect } from '@playwright/test';

import type { HomePage } from '../pages/home.page';

/** Scroll deferred homepage weather into view so the compact forecast hydrates. */
export async function revealHomepageDeferredBlocks(homePage: HomePage): Promise<void> {
  const deferTimeoutMs = 35_000;

  await homePage.page.waitForFunction(
    () => {
      document
        .querySelector('.homepage-defer-placeholder--weather')
        ?.scrollIntoView({ block: 'end', inline: 'nearest' });
      const weather = Boolean(document.querySelector('#homepage-weather'));
      if (!weather) {
        window.scrollBy({ top: Math.max(320, innerHeight * 0.85), behavior: 'instant' });
      }
      return Boolean(document.querySelector('#homepage-weather'));
    },
    undefined,
    { timeout: deferTimeoutMs, polling: 220 },
  );
  await expect(homePage.page.locator('#homepage-weather')).toBeVisible({ timeout: 5000 });

  await homePage.page.evaluate(() => window.scrollTo(0, 0));
}
