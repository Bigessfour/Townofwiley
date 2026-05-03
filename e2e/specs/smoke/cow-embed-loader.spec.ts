import { expect, test } from '@playwright/test';
import { mockDirectNwsRoutes } from '../../support/weather-mocks';

/**
 * Off by default: avoids external chat URLs in CI smoke.
 * Run: `TOW_E2E_CHATBOT_EMBED=1 npm run test:e2e -- e2e/specs/smoke/cow-embed-loader.spec.ts`
 */
test.describe('cow embed loader (TOW_E2E_CHATBOT_EMBED=1)', () => {
  test.skip(
    () => process.env.TOW_E2E_CHATBOT_EMBED !== '1',
    'Set TOW_E2E_CHATBOT_EMBED=1 to run cow embed loader checks',
  );

  test.beforeEach(async ({ page }) => {
    await page.route('https://bots.easy-peasy.ai/chat.min.js', async (route) => {
      await route.fulfill({
        status: 200,
        body: '// e2e stub easy-peasy widget',
        headers: { 'content-type': 'application/javascript; charset=utf-8' },
      });
    });

    await page.addInitScript(() => {
      if (!window.localStorage.getItem('tow-site-language')) {
        window.localStorage.setItem('tow-site-language', 'en');
      }
      window.localStorage.removeItem('towCowPopupSeen');
      const runtimeWindow = window as Window & {
        __TOW_RUNTIME_CONFIG_OVERRIDE__?: Record<string, unknown>;
      };
      runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
        ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
        chatbot: {
          provider: 'easyPeasy',
          mode: 'embed',
          chatUrl: 'https://example.invalid/tow-e2e-stub-chat-url',
          buttonPosition: 'bottom-right',
          apiEndpoint: '',
        },
      };
    });

    await mockDirectNwsRoutes(page);
  });

  test('requests /cow-video-popup.js and injects cow-popup script when embed mode is configured', async ({
    page,
  }) => {
    const cowResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/cow-video-popup.js') &&
        response.request().resourceType() === 'script',
      { timeout: 25_000 },
    );

    await page.goto('/', { waitUntil: 'load' });

    const cowResponse = await cowResponsePromise;
    expect(cowResponse.status()).toBe(200);

    await expect(page.locator('script[data-tow-chatbot="cow-popup"]')).toHaveCount(1);
  });
});
