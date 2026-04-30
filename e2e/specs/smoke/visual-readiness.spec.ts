import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../fixtures/town.fixture';
import { publicRouteContracts } from '../../support/public-routes';

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

async function expectNoHorizontalOverflow(page: Page, label: string): Promise<void> {
  const overflowPixels = await page.evaluate(() => {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });

  expect(overflowPixels, `${label} should not create horizontal overflow`).toBeLessThanOrEqual(1);
}

async function expectAppliedFont(locator: Locator, expectedFont: string): Promise<void> {
  await expect(locator).toBeVisible();

  const fontFamily = await locator.evaluate((element) => getComputedStyle(element).fontFamily);

  expect(fontFamily).toContain(expectedFont);
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

  const typography = await getTypographyMetrics(locator);

  expect(typography.fontFamily).toContain(expectedFont);
  expect(typography.fontSize).toBeGreaterThanOrEqual(minimumFontSize);
}

async function expectIntentionalSurface(locator: Locator): Promise<void> {
  const surface = await getSurfaceMetrics(locator);

  expect(surface.paddingTop).toBeGreaterThanOrEqual(20);
  expect(surface.paddingBottom).toBeGreaterThanOrEqual(20);
}

test.describe('visual readiness smoke', () => {
  test('renders the homepage hero media and typography intentionally', async ({ homePage }) => {
    await homePage.goto();

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
      await homePage.page.goto(routeContract.path, { waitUntil: 'domcontentloaded' });

      const heading = homePage.page.getByRole('heading', { name: routeContract.heading }).first();
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

  for (const viewport of [
    { label: 'desktop', size: { width: 1280, height: 900 }, minHeadingSize: 28 },
    { label: 'mobile', size: { width: 390, height: 844 }, minHeadingSize: 24 },
  ]) {
    test(`keeps public page typography readable on ${viewport.label}`, async ({ homePage }) => {
      await homePage.page.setViewportSize(viewport.size);

      for (const routeContract of publicRouteContracts.filter((route) =>
        ['/', '/weather', '/services', '/meetings', '/documents'].includes(route.path),
      )) {
        await homePage.page.goto(routeContract.path, { waitUntil: 'domcontentloaded' });

        const heading = homePage.page.getByRole('heading', { name: routeContract.heading }).first();
        const body = homePage.page.locator('body');

        await expectReadableTypography(heading, 'Fraunces', viewport.minHeadingSize);
        await expectReadableTypography(body, 'Source Sans 3', 16);
        await expectNoHorizontalOverflow(homePage.page, `${routeContract.label} ${viewport.label}`);
      }
    });
  }
});
