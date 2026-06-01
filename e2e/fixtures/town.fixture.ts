import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { resolveE2eEnv } from '../support/resolve-e2e-env';
import { mockDirectNwsRoutes } from '../support/weather-mocks';

interface TownFixtures {
  homePage: HomePage;
}

const { baseURL: configuredBaseUrl } = resolveE2eEnv();

export const test = base.extend<TownFixtures>({
  homePage: async ({ page, baseURL }, use) => {
    await page.addInitScript(() => {
      if (!window.localStorage.getItem('tow-site-language')) {
        window.localStorage.setItem('tow-site-language', 'en');
      }
      window.localStorage.removeItem('towCowPopupSeen');
      // Stale snapshots can omit PublicDocument rows and break document-hub smoke tests.
      window.localStorage.removeItem('tow-cms-snapshot-v1');
    });

    await page.addInitScript(() => {
      const runtimeWindow = window as Window & {
        __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
          cms?: {
            appSync?: {
              region?: string;
              apiEndpoint?: string;
              apiKey?: string;
            };
          };
        };
      };

      runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
        ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
        e2e: {
          ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.e2e ?? {}),
          staffAuth: true,
        },
        chatbot: {
          provider: 'easyPeasy',
          mode: 'none',
          chatUrl: '',
          buttonPosition: 'bottom-right',
          apiEndpoint: '',
        },
        cms: {
          ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.cms ?? {}),
          appSync: {
            region: '',
            apiEndpoint: '',
            apiKey: '',
          },
        },
        payments: {
          provider: 'paystar',
          paystar: {
            mode: 'none',
            portalUrl: '',
            apiEndpoint: '',
          },
        },
        billPay: {
          apiEndpoint: '',
        },
      };
    });

    await page.route('**/cms-snapshot.json', async (route) => {
      const response = await route.fetch();
      const snapshot = (await response.json()) as Record<string, unknown>;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...snapshot,
          eventRecords: [],
          businessRecords: [],
        }),
      });
    });

    await mockDirectNwsRoutes(page);
    await use(new HomePage(page, baseURL ?? configuredBaseUrl));
  },
});

export { expect };
