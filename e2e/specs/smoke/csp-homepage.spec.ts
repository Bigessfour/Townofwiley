import { expect, test } from '../../fixtures/town.fixture';

type CspViolationRecord = {
  directive?: string;
  blockedURI?: string;
  source: 'securitypolicyviolation' | 'console';
  detail: string;
};

test.describe('homepage CSP', () => {
  test('homepage weather and chat load without Content-Security-Policy violations', async ({
    homePage,
  }) => {
    await homePage.page.addInitScript(() => {
      const runtimeWindow = window as Window & {
        __TOW_E2E_CSP_VIOLATIONS__?: CspViolationRecord[];
      };
      runtimeWindow.__TOW_E2E_CSP_VIOLATIONS__ = [];

      const pushViolation = (record: CspViolationRecord) => {
        runtimeWindow.__TOW_E2E_CSP_VIOLATIONS__?.push(record);
      };

      document.addEventListener('securitypolicyviolation', (event) => {
        pushViolation({
          source: 'securitypolicyviolation',
          directive: event.violatedDirective || event.effectiveDirective,
          blockedURI: event.blockedURI,
          detail: `${event.violatedDirective || event.effectiveDirective}: ${event.blockedURI}`,
        });
      });

      const originalError = console.error.bind(console);
      console.error = (...args: unknown[]) => {
        const text = args.map((arg) => String(arg)).join(' ');
        if (
          /Content Security Policy|Refused to (apply inline style|execute inline script|load)/i.test(
            text,
          )
        ) {
          pushViolation({
            source: 'console',
            detail: text,
          });
        }
        originalError(...args);
      };
    });

    await homePage.enableWeatherProxy('/mock-weather');
    await homePage.enableProgrammaticChat('/mock-chatbot');
    await homePage.page.route('**/mock-chatbot', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 200,
          body: JSON.stringify({ response: 'CSP smoke reply.' }),
        }),
      });
    });
    await homePage.goto();

    await homePage.page.waitForFunction(
      () => {
        document
          .querySelector('.homepage-defer-placeholder--feature-hub')
          ?.scrollIntoView({ block: 'end', inline: 'nearest' });
        if (!document.querySelector('.feature-hub')) {
          window.scrollBy({ top: Math.max(320, innerHeight * 0.85), behavior: 'instant' });
        }
        return Boolean(document.querySelector('.feature-hub'));
      },
      undefined,
      { timeout: 35_000, polling: 220 },
    );

    await homePage.page.locator('.feature-grid .feature-card[href="/weather"]').click();
    await expect(homePage.page).toHaveURL(/\/weather$/);
    await expect(homePage.weatherPanel).toBeVisible({ timeout: 20_000 });
    await expect(homePage.weatherHeading).toBeVisible();

    await homePage.page.goto('/');
    await expect(homePage.heroHeading).toBeVisible();

    await homePage.openAssistantDialog();
    await expect(homePage.assistantShell).toBeVisible();
    await homePage.sendAssistantQuestion('CSP smoke test');
    await expect(homePage.assistantMessages.filter({ hasText: 'CSP smoke reply.' })).toHaveCount(
      1,
      {
        timeout: 15000,
      },
    );

    const violations = await homePage.page.evaluate(() => {
      const runtimeWindow = window as Window & {
        __TOW_E2E_CSP_VIOLATIONS__?: CspViolationRecord[];
      };
      return runtimeWindow.__TOW_E2E_CSP_VIOLATIONS__ ?? [];
    });

    expect(
      violations,
      violations.map((entry) => `${entry.source}: ${entry.detail}`).join('\n') || 'no detail',
    ).toEqual([]);
  });
});
