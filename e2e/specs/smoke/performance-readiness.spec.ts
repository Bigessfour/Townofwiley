import { expect, test } from '@playwright/test';

test.describe('performance readiness', () => {
  test('serves runtime config and optimized hero media on the homepage', async ({
    page,
    request,
  }) => {
    const runtimeConfig = await request.get('/runtime-config.js');

    expect(runtimeConfig.ok(), 'runtime-config.js should be hosted').toBe(true);
    await expect(runtimeConfig).toBeOK();

    const runtimeConfigText = await runtimeConfig.text();
    expect(runtimeConfigText).toContain('window.__TOW_RUNTIME_CONFIG__ =');
    expect(runtimeConfigText).toContain('weather');
    expect(runtimeConfigText).toContain('payments');
    expect(runtimeConfigText).toContain('cms');
    expect(runtimeConfigText).toContain('chatbot');

    await page.addInitScript(() => {
      window.__towLayoutShift = 0;

      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };

          if (!shift.hadRecentInput) {
            window.__towLayoutShift = (window.__towLayoutShift ?? 0) + (shift.value ?? 0);
          }
        }
      });

      layoutShiftObserver.observe({ type: 'layout-shift', buffered: true });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const heroImage = page.locator('[data-testid="homepage-hero"] img');

    await expect(heroImage).toHaveAttribute('loading', 'eager');
    await expect(heroImage).toHaveAttribute('fetchpriority', 'high');
    await expect(heroImage).toHaveAttribute('decoding', 'sync');
    await expect(heroImage).toHaveAttribute('src', /hero-wiley\.(webp|jpg)$/);
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('#search-panel')).toBeVisible();

    await page.evaluate(() => {
      window.__towLayoutShift = 0;
    });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );

    const layoutShift = await page.evaluate(() => window.__towLayoutShift ?? 0);
    expect(layoutShift).toBeLessThan(0.05);
  });
});

declare global {
  interface Window {
    __towLayoutShift?: number;
  }
}
