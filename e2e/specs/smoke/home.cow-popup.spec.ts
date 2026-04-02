import { expect, test } from '../../fixtures/town.fixture';

test.describe('homepage cow welcome popup', () => {
  test('shows once for embedded chat visitors and then stays dismissed', async ({ homePage }) => {
    await homePage.page.addInitScript(() => {
      window.localStorage.removeItem('towCowPopupSeen');

      const runtimeWindow = window as Window & {
        __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
          chatbot?: {
            provider?: string;
            mode?: string;
            chatUrl?: string;
            buttonPosition?: string;
            cowBubbleText?: string;
          };
        };
      };

      runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
        ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
        chatbot: {
          ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.chatbot ?? {}),
          provider: 'easyPeasy',
          mode: 'embed',
          chatUrl: 'https://example.com/townofwiley-assistant',
          buttonPosition: 'bottom-right',
          cowBubbleText: 'Need a hand? Ask Wiley.',
        },
      };
    });

    await homePage.page.route('**/runtime-config.js', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          window.__TOW_RUNTIME_CONFIG__ = {
            chatbot: {
              provider: 'easyPeasy',
              mode: 'none',
              chatUrl: '',
              buttonPosition: 'bottom-left',
              cowBubbleText: 'This base config should be overridden.'
            }
          };
        `,
      });
    });

    await homePage.page.route('https://bots.easy-peasy.ai/chat.min.js', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          window.setTimeout(function () {
            if (document.getElementById('dialoq-btn')) {
              return;
            }

            var button = document.createElement('button');
            button.id = 'dialoq-btn';
            button.type = 'button';
            document.body.appendChild(button);
          }, 0);
        `,
      });
    });

    await homePage.goto();

    const popup = homePage.page.locator('#tow-cow-video-popup');
    const bubble = homePage.page.locator('.tow-cow-video-popup__bubble');
    const widgetScript = homePage.page.locator('script[data-tow-chatbot="easy-peasy"]');
    const cowScript = homePage.page.locator('script[data-tow-chatbot="cow-popup"]');
    const widgetButton = homePage.page.locator('#dialoq-btn');

    await expect(widgetScript).toHaveCount(1);
    await expect(cowScript).toHaveCount(1);
    await expect(popup).toBeVisible({ timeout: 10000 });
    await expect(popup).toHaveAttribute('data-position', 'bottom-right');
    await expect(bubble).toHaveText('Need a hand? Ask Wiley.');
    await expect(widgetButton).toHaveAttribute('aria-label', 'Open Town of Wiley assistant chat');

    await expect
      .poll(async () => {
        return homePage.page.evaluate(() => window.localStorage.getItem('towCowPopupSeen'));
      })
      .toBe('true');

    await expect(popup).toBeHidden({ timeout: 10000 });

    await homePage.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(homePage.page.locator('#tow-cow-video-popup')).toHaveCount(0);
  });
});
