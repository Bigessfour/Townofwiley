/**
 * Regression: MegaMenu custom `item` template must not bind `[attr.href]` on the same `<a>` as
 * `routerLink` when `url` is unset — that overrides RouterLink's computed `href` and yields no-op
 * navigation (especially under the "I Want To…" root).
 *
 * Covers every desktop dropdown root that exposes `a.mega-menu-sub-link` panel links.
 *
 * @see https://www.primeng.org/megamenu#router
 */
import { expect, test } from '../../fixtures/town.fixture';
import type { Page } from '@playwright/test';
import { siteContent } from '../../support/site-content';

const roots = siteContent.megaMenuRootLabelsEn;

async function openMegaMenuPanel(page: Page, rootLabel: string) {
  const nav = page.getByTestId('homepage-section-nav');
  await nav.getByRole('menuitem', { name: rootLabel }).click();
  const panel = nav.locator('li.p-megamenu-item-active').locator('.p-megamenu-overlay').first();
  await expect(panel).toBeVisible({ timeout: 10_000 });
  return panel;
}

test.describe('mega menu panel sub-link href integrity', () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== 'desktop-chromium',
      'Mega menu dropdown panels are not shown on mobile layout.',
    );
  });

  test('each dropdown root exposes panel anchors with usable href attributes', async ({
    homePage,
  }) => {
    for (const rootLabel of roots.slice(0, 4)) {
      await homePage.goto();
      const panel = await openMegaMenuPanel(homePage.page, rootLabel);
      const anchors = panel.locator('a.mega-menu-sub-link');
      const count = await anchors.count();
      expect(count, `${rootLabel}: expected at least one sub-link`).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const link = anchors.nth(i);
        const href = await link.getAttribute('href');
        expect(href, `${rootLabel} sub-link ${i} should have href`).toBeTruthy();
        expect(href, `${rootLabel} sub-link ${i} must not be a lone hash`).not.toBe('#');
        expect(
          href!.length,
          `${rootLabel} sub-link ${i} href should be a real router URL`,
        ).toBeGreaterThan(2);
      }
    }
  });
});
