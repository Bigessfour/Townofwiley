import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../fixtures/town.fixture';
import { publicRouteContracts } from '../../support/public-routes';

interface TouchTargetIssue {
  label: string;
  width: number;
  height: number;
}

async function getTouchTargetIssues(page: Page): Promise<TouchTargetIssue[]> {
  return page.evaluate(() => {
    const selectors = [
      'button',
      'input:not([type="hidden"])',
      'textarea',
      '[role="button"]',
      '[role="combobox"]',
      'a.main-nav-link',
      'a.task-card',
      'a.feature-card',
      'a[class*="button"]',
      'a[class*="action"]',
    ].join(',');

    return Array.from(document.body.querySelectorAll<HTMLElement>(selectors))
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom >= 0 &&
          rect.top <= window.innerHeight
        );
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const label =
          element.getAttribute('aria-label') ||
          element.textContent?.replace(/\s+/g, ' ').trim() ||
          element.getAttribute('placeholder') ||
          element.id ||
          element.tagName.toLowerCase();

        return {
          label: label.slice(0, 80),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter((target) => target.width < 44 || target.height < 44)
      .slice(0, 10);
  });
}

async function expectUsableTouchTarget(locator: Locator, label: string): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();

  const box = await locator.boundingBox();

  expect(box?.width ?? 0, `${label} width`).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0, `${label} height`).toBeGreaterThanOrEqual(44);
}

test.describe('mobile touch targets', () => {
  test.describe.configure({ mode: 'serial' });

  for (const routeContract of publicRouteContracts) {
    test(`${routeContract.label} exposes comfortably sized mobile controls`, async ({
      homePage,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== 'mobile-chromium',
        'Touch target sizing is validated in the dedicated mobile browser project.',
      );

      await homePage.page.goto(routeContract.path, { waitUntil: 'domcontentloaded' });
      await expect(
        homePage.page.getByRole('heading', { name: routeContract.heading }).first(),
      ).toBeVisible({ timeout: 20000 });

      if (routeContract.primaryAction) {
        await expectUsableTouchTarget(
          routeContract.primaryAction(homePage.page),
          `${routeContract.label} primary action`,
        );
      }

      const issues = await getTouchTargetIssues(homePage.page);

      expect(
        issues,
        `${routeContract.label} undersized visible controls:\n${issues
          .map((issue) => `${issue.label}: ${issue.width}x${issue.height}`)
          .join('\n')}`,
      ).toEqual([]);
    });
  }
});
