import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/town.fixture';
import { publicRouteContracts } from '../../support/public-routes';

async function getHorizontalOverflowReport(page: Page): Promise<{
  overflowPixels: number;
  offenders: string[];
}> {
  return page.evaluate(() => {
    const overflowPixels =
      document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = Array.from(document.body.querySelectorAll<HTMLElement>('*'))
      .map((element) => {
        const rect = element.getBoundingClientRect();

        return {
          element,
          leftOverflow: Math.max(0, -rect.left),
          rightOverflow: Math.max(0, rect.right - viewportWidth),
        };
      })
      .filter((entry) => entry.leftOverflow > 1 || entry.rightOverflow > 1)
      .slice(0, 5)
      .map((entry) => {
        const element = entry.element;
        const selector = [
          element.tagName.toLowerCase(),
          element.id ? `#${element.id}` : '',
          Array.from(element.classList)
            .slice(0, 3)
            .map((className) => `.${className}`)
            .join(''),
        ].join('');

        return `${selector} left:${entry.leftOverflow.toFixed(1)} right:${entry.rightOverflow.toFixed(
          1,
        )}`;
      });

    return { overflowPixels, offenders };
  });
}

test.describe('public pages responsive baseline', () => {
  test.describe.configure({ mode: 'serial' });

  for (const routeContract of publicRouteContracts) {
    test(`${routeContract.label} stays usable on mobile`, async ({ homePage }, testInfo) => {
      test.skip(
        testInfo.project.name !== 'mobile-chromium',
        'This baseline validates the dedicated mobile browser project.',
      );

      await homePage.page.goto(routeContract.path, { waitUntil: 'domcontentloaded' });

      await expect(
        homePage.page.getByRole('heading', { name: routeContract.heading }).first(),
      ).toBeVisible({ timeout: 20000 });
      await expect(homePage.page.locator('#main-content')).toBeVisible();

      const overflowReport = await getHorizontalOverflowReport(homePage.page);
      expect(
        overflowReport.overflowPixels,
        `${routeContract.label} horizontal overflow: ${overflowReport.offenders.join('\n')}`,
      ).toBeLessThanOrEqual(1);

      if (routeContract.primaryAction) {
        const primaryAction = routeContract.primaryAction(homePage.page);
        await primaryAction.scrollIntoViewIfNeeded();
        await expect(primaryAction).toBeVisible();
      }

      if (routeContract.standardShell !== false) {
        await homePage.page.locator('.site-footer').scrollIntoViewIfNeeded();
        await expect(
          homePage.page.getByRole('link', { name: /Accessibility statement/i }),
        ).toBeVisible();
      }
    });
  }

  test('keeps the footer legal links reachable on mobile', async ({ homePage }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-chromium',
      'This baseline validates the dedicated mobile browser project.',
    );

    const footerLinks = [
      {
        label: 'Accessibility statement',
        heading: /Every resident should be able to use this website/i,
        url: /\/accessibility$/,
      },
      {
        label: 'Weather alert privacy',
        heading: 'Weather alert privacy notice',
        url: /\/privacy$/,
      },
      {
        label: 'Weather alert SMS terms',
        heading: 'Weather alert SMS terms',
        url: /\/terms$/,
      },
    ] as const;

    await homePage.goto();
    await homePage.page.locator('.site-footer').scrollIntoViewIfNeeded();

    for (const footerLink of footerLinks) {
      const link = homePage.page.getByRole('link', { name: footerLink.label });

      await expect(link).toBeVisible();
      await expect(link).toBeEnabled();
      await link.click();
      await expect(homePage.page).toHaveURL(footerLink.url);
      await expect(
        homePage.page.getByRole('heading', { name: footerLink.heading }).first(),
      ).toBeVisible();

      await homePage.goto();
      await homePage.page.locator('.site-footer').scrollIntoViewIfNeeded();
    }
  });
});
