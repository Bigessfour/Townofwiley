import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../fixtures/town.fixture';
import { publicRouteContracts, type PublicRouteContract } from '../../support/public-routes';

/**
 * Visual readiness smoke — configuration notes (keep in sync with Playwright + app shell):
 *
 * 1. playwright.config.ts runs this file under **two projects** (`desktop-chromium`, `mobile-chromium`).
 *    Default viewports come from those projects; the typography matrix tests below also call
 *    `setViewportSize` for **explicit** 1280 / 390 widths.
 * 2. Town fixture forces `en` in `localStorage` and stubs NWS + runtime config so routes render
 *    without external services.
 * 3. Lazy routes (most paths except `/`) replace `App` with a route component — many have **no**
 *    `#main-content` until `DocumentHub` / `role="main"` shells; `/` keeps the marketing hero
 *    **outside** `#main-content`, so the primary H1 must come from `[data-testid=homepage-hero]`.
 * 4. Typography assertions read `getComputedStyle` after **`load` + `document.fonts.ready`** and poll
 *    briefly so we never measure during the first unstyled frame (the previous CI failure mode).
 * 5. Before trusting font-size, we require a **non-degenerate layout box** so a wrong locator fails
 *    with a clear “layout” error instead of a confusing 1–2px font size.
 * 6. Typography matrix: **one test per (viewport × public route)** so CI reports the exact
 *    failing pair, tests can parallelize, and a single slow route does not extend one giant timeout.
 */

interface SurfaceMetrics {
  backgroundImage: string;
  color: string;
  paddingTop: number;
  paddingBottom: number;
}

interface TypographyMetrics {
  fontFamily: string;
  fontSize: number;
}

/** One place for navigation + font loading so family/size checks stay consistent. */
async function waitForTypographyReady(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  await page.evaluate(() => document.fonts.ready);
}

async function expectNoHorizontalOverflow(page: Page, label: string): Promise<void> {
  const overflowPixels = await page.evaluate(() => {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });

  expect(overflowPixels, `${label} should not create horizontal overflow`).toBeLessThanOrEqual(1);
}

/**
 * Primary heading for each public route: hero-scoped on `/`, else prefer `#main-content` or
 * `[role="main"]` when that landmark exists (document hub, payments, permits). Many lazy routes
 * omit both — fall back to page-level `getByRole('heading')` so we still target the routed page.
 */
async function resolvePrimaryPublicHeading(
  page: Page,
  contract: PublicRouteContract,
): Promise<Locator> {
  if (contract.path === '/') {
    const name = typeof contract.heading === 'string' ? contract.heading : 'Town of Wiley';
    return page.getByTestId('homepage-hero').getByRole('heading', { level: 1, name });
  }

  const landmark = page.locator('#main-content, [role="main"]');
  if ((await landmark.count()) > 0) {
    return landmark.first().getByRole('heading', { name: contract.heading }).first();
  }

  return page.getByRole('heading', { name: contract.heading }).first();
}

/** Rejects zero-sized or near-zero boxes (wrong element / not yet laid out). */
async function expectMeaningfulLayoutBox(locator: Locator, label: string): Promise<void> {
  await expect(async () => {
    const box = await locator.boundingBox();
    expect(box, `${label}: expected bounding box`).not.toBeNull();
    expect(box!.width, `${label}: width`).toBeGreaterThanOrEqual(32);
    expect(box!.height, `${label}: height`).toBeGreaterThanOrEqual(8);
  }).toPass({ timeout: 10_000 });
}

async function expectAppliedFont(locator: Locator, expectedFont: string): Promise<void> {
  await expect(locator).toBeVisible();
  await waitForTypographyReady(locator.page());
  await expectMeaningfulLayoutBox(locator, `heading for “${expectedFont}” font-family check`);

  await expect(async () => {
    const fontFamily = await locator.evaluate((element) => getComputedStyle(element).fontFamily);
    expect(fontFamily, `Font stack should include ${expectedFont}`).toContain(expectedFont);
  }).toPass({ timeout: 10_000 });
}

async function getTypographyMetrics(locator: Locator): Promise<TypographyMetrics> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      fontFamily: style.fontFamily,
      fontSize: Number.parseFloat(style.fontSize),
    };
  });
}

async function getSurfaceMetrics(locator: Locator): Promise<SurfaceMetrics> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      backgroundImage: style.backgroundImage,
      color: style.color,
      paddingTop: Number.parseFloat(style.paddingTop),
      paddingBottom: Number.parseFloat(style.paddingBottom),
    };
  });
}

async function expectReadableTypography(
  locator: Locator,
  expectedFont: string,
  minimumFontSize: number,
): Promise<void> {
  await expect(locator).toBeVisible();
  await waitForTypographyReady(locator.page());
  await expectMeaningfulLayoutBox(
    locator,
    `typography target (${expectedFont}, ≥${minimumFontSize}px)`,
  );

  await expect(async () => {
    const typography = await getTypographyMetrics(locator);

    expect(typography.fontFamily, `Font stack should include ${expectedFont}`).toContain(
      expectedFont,
    );
    expect(
      typography.fontSize,
      `Font size should be >= ${minimumFontSize}px (got ${typography.fontSize}px)`,
    ).toBeGreaterThanOrEqual(minimumFontSize);
  }).toPass({ timeout: 15_000 });
}

async function expectIntentionalSurface(locator: Locator): Promise<void> {
  const surface = await getSurfaceMetrics(locator);

  expect(surface.paddingTop).toBeGreaterThanOrEqual(20);
  expect(surface.paddingBottom).toBeGreaterThanOrEqual(20);
}

test.describe('visual readiness smoke', () => {
  test('renders the homepage hero media and typography intentionally', async ({ homePage }) => {
    await homePage.goto();
    await waitForTypographyReady(homePage.page);

    const hero = homePage.page.getByTestId('homepage-hero');
    const heroImage = hero.locator('img');
    const heroHeading = hero.getByRole('heading', { level: 1, name: 'Town of Wiley' });

    await expect(hero).toBeVisible();
    await expect(heroImage).toBeVisible();
    await expect(heroHeading).toBeVisible();
    await expectAppliedFont(heroHeading, 'Fraunces');

    const heroLayout = await hero.evaluate((element) => {
      const heroRect = element.getBoundingClientRect();
      const copyRect = element.querySelector('.hero-landing-copy')?.getBoundingClientRect();
      const image = element.querySelector('img');
      const heroCopy = element.querySelector('.hero-landing-copy');
      const heroCopyStyle = heroCopy ? getComputedStyle(heroCopy) : null;

      return {
        height: heroRect.height,
        imageLoaded: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
        copyInsideHero:
          !!copyRect &&
          copyRect.left >= heroRect.left &&
          copyRect.right <= heroRect.right &&
          copyRect.top >= heroRect.top &&
          copyRect.bottom <= heroRect.bottom,
        copyFontFamily: heroCopyStyle?.fontFamily ?? '',
        copyFontSize: heroCopyStyle ? Number.parseFloat(heroCopyStyle.fontSize) : 0,
      };
    });

    expect(heroLayout.height).toBeGreaterThanOrEqual(360);
    expect(heroLayout.imageLoaded).toBe(true);
    expect(heroLayout.copyInsideHero).toBe(true);
    expect(heroLayout.copyFontFamily).toContain('Source Sans 3');
    expect(heroLayout.copyFontSize).toBeGreaterThanOrEqual(16);
    await expectNoHorizontalOverflow(homePage.page, 'homepage hero');
  });

  test('keeps the homepage search panel aligned with the civic light theme', async ({
    homePage,
  }) => {
    await homePage.goto();
    await waitForTypographyReady(homePage.page);

    const searchPanel = homePage.page.locator('.search-panel');

    await expect(searchPanel).toBeVisible();

    const surface = await getSurfaceMetrics(searchPanel);

    expect(surface.backgroundImage).toContain('rgba(255, 255, 255, 0.94)');
    expect(surface.backgroundImage).toContain('rgba(250, 246, 238, 0.92)');
    expect(surface.color).not.toContain('255, 255, 255');
    await expectIntentionalSurface(searchPanel);
    await expectNoHorizontalOverflow(homePage.page, 'homepage search panel');
  });

  for (const routeContract of publicRouteContracts) {
    test(`${routeContract.label} keeps desktop layout fundamentals intact`, async ({
      homePage,
    }) => {
      await homePage.page.goto(routeContract.path, { waitUntil: 'load' });

      const heading = await resolvePrimaryPublicHeading(homePage.page, routeContract);
      const body = homePage.page.locator('body');

      await expectAppliedFont(heading, 'Fraunces');
      await expectReadableTypography(body, 'Source Sans 3', 16);
      await expectNoHorizontalOverflow(homePage.page, routeContract.label);

      if (routeContract.primaryAction) {
        const primaryAction = routeContract.primaryAction(homePage.page);
        await expect(primaryAction).toBeVisible();

        const actionBox = await primaryAction.boundingBox();

        expect(
          actionBox?.width ?? 0,
          `${routeContract.label} primary action width`,
        ).toBeGreaterThan(32);
        expect(
          actionBox?.height ?? 0,
          `${routeContract.label} primary action height`,
        ).toBeGreaterThan(20);
      }
    });
  }

  const typographyViewports: {
    label: string;
    size: { width: number; height: number };
    minHeadingSize: number;
  }[] = [
    // Design uses clamp() on several page shells; minimum computed sizes can sit below “hero” scale.
    { label: 'desktop', size: { width: 1280, height: 900 }, minHeadingSize: 22 },
    { label: 'mobile', size: { width: 390, height: 844 }, minHeadingSize: 18 },
  ];

  for (const viewport of typographyViewports) {
    for (const routeContract of publicRouteContracts) {
      test(`typography readable — ${viewport.label} — ${routeContract.label}`, async ({
        homePage,
      }) => {
        await homePage.page.setViewportSize(viewport.size);
        await homePage.page.goto(routeContract.path, { waitUntil: 'load' });

        const heading = await resolvePrimaryPublicHeading(homePage.page, routeContract);
        const body = homePage.page.locator('body');

        await expectReadableTypography(heading, 'Fraunces', viewport.minHeadingSize);
        await expectReadableTypography(body, 'Source Sans 3', 16);
        await expectNoHorizontalOverflow(
          homePage.page,
          `${routeContract.label} ${viewport.label}`,
        );
      });
    }
  }
});
