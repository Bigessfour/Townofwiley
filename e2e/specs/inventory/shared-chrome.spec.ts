import { expect } from '@playwright/test';

import { test } from '../../fixtures/town-pages.fixture';
import { inventoryStep } from '../../support/inventory-step';
import {
  inventoryRoutesWithSiteChrome,
  routeHasHeaderSearch,
} from '../../support/inventory-routes';
import {
  expectAccessibilityBarrierReport,
  expectBusinessesPage,
  expectContactPage,
} from '../../support/route-assertions';

test.describe.configure({ mode: 'parallel', timeout: 120_000 });

for (const route of inventoryRoutesWithSiteChrome) {
  const routeLabel = route.path === '/' ? 'homepage' : route.path.replace(/^\//, '');

  test.describe(`shared chrome on ${routeLabel}`, () => {
    test('[shared.skip-to-content] skip link focuses main content', async ({
      siteChrome,
      homePage,
    }) => {
      if (route.path === '/') {
        await homePage.goto();
      } else {
        await siteChrome.page.goto(route.path, { waitUntil: 'commit', timeout: 30_000 });
      }

      await inventoryStep('Activate skip to main content', async () => {
        await siteChrome.activateSkipToMain();
      });
    });

    test('[shared.language-switcher] toggles site language to Spanish', async ({
      siteChrome,
      homePage,
    }) => {
      if (route.path === '/') {
        await homePage.goto();
      } else {
        await siteChrome.page.goto(route.path, {
          waitUntil: 'commit',
          timeout: 30_000,
        });
      }

      await inventoryStep('Switch language to Spanish', async () => {
        await siteChrome.switchLanguage('es');
      });
    });

    test('[shared.site-search] submits Wiley search from header', async ({
      siteChrome,
      homePage,
    }) => {
      test.skip(
        !routeHasHeaderSearch(route.path),
        'Header Wiley search is homepage-only (`!isFeaturePageMode()` in app template).',
      );

      await homePage.goto();

      await inventoryStep('Submit site search', async () => {
        await siteChrome.submitSiteSearch('utility bill');
      });

      await expect(siteChrome.searchResults.or(siteChrome.emptySearchState).first()).toBeVisible();
    });

    test('[shared.chatbot-toggle] opens Ask Wiley assistant dialog', async ({
      siteChrome,
      homePage,
    }) => {
      await homePage.enableProgrammaticChat();
      if (route.path === '/') {
        await homePage.goto();
      } else {
        await siteChrome.page.goto(route.path, { waitUntil: 'commit', timeout: 30_000 });
      }

      await inventoryStep('Open chatbot', async () => {
        await siteChrome.openChatbot();
      });
    });

    test('[shared.logo-navigate-home] town logo returns to homepage', async ({
      siteChrome,
      homePage,
    }) => {
      test.skip(route.path === '/', 'Logo home navigation is validated from inner pages only.');

      await homePage.enableProgrammaticChat();
      await siteChrome.page.goto(route.path, { waitUntil: 'commit', timeout: 30_000 });

      await inventoryStep('Click town logo', async () => {
        await siteChrome.clickLogoExpectHome();
      });
    });

    test('[shared.megamenu-root-navigate-businesses] mega menu Businesses root navigates', async ({
      siteChrome,
      homePage,
    }, testInfo) => {
      test.skip(
        testInfo.project.name === 'mobile-chromium',
        'Mega menu roots require desktop header chrome.',
      );

      if (route.path === '/') {
        await homePage.goto();
      } else {
        await siteChrome.page.goto(route.path, { waitUntil: 'commit', timeout: 30_000 });
      }

      await inventoryStep('Click Businesses & Community mega menu root', async () => {
        await siteChrome.clickMegaMenuRoot('Businesses & Community');
      });

      await expect(siteChrome.page).toHaveURL(/\/businesses/);
      await expectBusinessesPage(siteChrome.page);
    });

    test('[shared.megamenu-root-navigate-contact] mega menu Contact root navigates', async ({
      siteChrome,
      homePage,
    }, testInfo) => {
      test.skip(
        testInfo.project.name === 'mobile-chromium',
        'Mega menu roots require desktop header chrome.',
      );

      if (route.path === '/') {
        await homePage.goto();
      } else {
        await siteChrome.page.goto(route.path, { waitUntil: 'commit', timeout: 30_000 });
      }

      await inventoryStep('Click Contact & Town Hall mega menu root', async () => {
        await siteChrome.clickMegaMenuRoot('Contact & Town Hall');
      });

      await expect(siteChrome.page).toHaveURL(/\/contact/);
      await expectContactPage(siteChrome.page);
    });

    test('[shared.mobile-menu-toggle] opens mobile navigation drawer', async ({
      siteChrome,
      homePage,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile menu is mobile-only.');

      if (route.path === '/') {
        await homePage.goto();
      } else {
        await siteChrome.page.goto(route.path, { waitUntil: 'commit', timeout: 30_000 });
      }

      await inventoryStep('Open mobile menu drawer', async () => {
        await siteChrome.openMobileMenu();
      });
    });

    test('[shared.footer-accessibility-link] footer accessibility link navigates', async ({
      siteChrome,
      homePage,
    }) => {
      if (route.path === '/') {
        await homePage.goto();
      } else {
        await siteChrome.page.goto(route.path, { waitUntil: 'commit', timeout: 30_000 });
      }

      await siteChrome.page.locator('.site-footer').scrollIntoViewIfNeeded();

      await inventoryStep('Click footer accessibility link', async () => {
        await siteChrome.clickFooterLink('/accessibility');
      });

      await expect(siteChrome.page).toHaveURL(/\/accessibility/);
      await expectAccessibilityBarrierReport(siteChrome.page);
    });
  });
}
