import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/town.fixture';

/** Parsed computed typography for hero and section headings (fluid type + hierarchy checks). */
async function readTypographySummary(page: Page): Promise<{
  hero: { fontSizePx: number; lineHeightRatio: number; fontFamily: string };
  topTasksH2: { fontSizePx: number; fontFamily: string };
  bodyFontFamily: string;
}> {
  return page.evaluate(() => {
    const hero = document.querySelector('#site-hero-title');
    const topTasks = document.querySelector('#top-tasks-heading');
    const heroStyle = hero ? getComputedStyle(hero) : null;
    const h2Style = topTasks ? getComputedStyle(topTasks) : null;
    const bodyStyle = getComputedStyle(document.body);

    const parsePx = (raw: string): number => Number.parseFloat(raw) || 0;
    const heroSizePx = heroStyle ? parsePx(heroStyle.fontSize) : 0;
    const heroLhPx = heroStyle ? parsePx(heroStyle.lineHeight) : 0;
    const lineHeightRatio = heroSizePx > 0 && heroLhPx > 0 ? heroLhPx / heroSizePx : 0;

    return {
      hero: {
        fontSizePx: heroSizePx,
        lineHeightRatio,
        fontFamily: heroStyle?.fontFamily ?? '',
      },
      topTasksH2: {
        fontSizePx: h2Style ? parsePx(h2Style.fontSize) : 0,
        fontFamily: h2Style?.fontFamily ?? '',
      },
      bodyFontFamily: bodyStyle.fontFamily,
    };
  });
}

test.describe('homepage typography and heading hierarchy', () => {
  test('uses display font on the hero title and body font on copy', async ({ homePage }) => {
    await homePage.goto();

    const typo = await readTypographySummary(homePage.page);

    expect(typo.hero.fontFamily, 'hero should use the Fraunces display stack').toMatch(/fraunces/i);
    expect(typo.bodyFontFamily, 'body copy should use the Source Sans stack').toMatch(
      /source sans/i,
    );
    expect(
      typo.topTasksH2.fontFamily,
      'section headings use the same display stack as global h1–h6',
    ).toMatch(/fraunces/i);
  });

  test('keeps the hero title visibly larger than nearby section headings on desktop', async ({
    homePage,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-chromium',
      'Hierarchy assertion targets the wide layout where both headings are visible.',
    );

    await homePage.goto();

    const typo = await readTypographySummary(homePage.page);

    expect(typo.hero.fontSizePx).toBeGreaterThan(0);
    expect(typo.topTasksH2.fontSizePx).toBeGreaterThan(0);
    expect(typo.hero.fontSizePx).toBeGreaterThan(typo.topTasksH2.fontSizePx + 8);
    expect(typo.hero.lineHeightRatio).toBeGreaterThanOrEqual(1);
    expect(typo.hero.lineHeightRatio).toBeLessThanOrEqual(1.25);
  });

  test('keeps the hero title readable after fluid scaling on mobile', async ({
    homePage,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-chromium',
      'Uses the mobile project viewport for clamp/media-query behavior.',
    );

    await homePage.goto();

    const typo = await readTypographySummary(homePage.page);

    expect(typo.hero.fontSizePx).toBeGreaterThanOrEqual(44);
    expect(typo.hero.fontSizePx).toBeLessThanOrEqual(140);
    expect(typo.hero.lineHeightRatio).toBeGreaterThanOrEqual(1);
    expect(typo.hero.lineHeightRatio).toBeLessThanOrEqual(1.35);
  });
});
