/**
 * Desktop mega menu chrome (start/end slots), root behavior, icons, and optional overlay UX.
 * Internal panel destinations are covered in `megamenu-internal-links.spec.ts`.
 * Mobile drawer sanity is a separate describe (simplified nav vs desktop model).
 */
import { expect, test } from '../../fixtures/town.fixture';
import type { Page } from '@playwright/test';
import { siteContent } from '../../support/site-content';

const roots = siteContent.megaMenuRootLabelsEn;
const L = siteContent.megaMenuPanelLinksEn;
const chrome = siteContent.megaMenuChromeEn;

async function openMegaMenuPanel(page: Page, rootLabel: string) {
  const nav = page.getByTestId('homepage-section-nav');
  await nav.getByRole('menuitem', { name: rootLabel }).click();
  const panel = nav.locator('li.p-megamenu-item-active').locator('.p-megamenu-overlay').first();
  await expect(panel).toBeVisible({ timeout: 10_000 });
  return panel;
}

test.describe('mega menu chrome and roots (desktop)', () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== 'desktop-chromium',
      'Mega menu bar layout is desktop-only.',
    );
  });

  test('exposes menubar container with six root menu controls', async ({ homePage }) => {
    await homePage.goto();
    const nav = homePage.page.getByTestId('homepage-section-nav');
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('menubar')).toBeVisible();
    await expect(homePage.sectionNavLinks).toHaveCount(roots.length);
    await expect(homePage.sectionNavLinks).toHaveText(roots);
  });

  test('town logo returns to homepage', async ({ homePage }) => {
    await homePage.page.goto('/weather');
    const nav = homePage.page.getByTestId('homepage-section-nav');
    await nav.getByRole('link', { name: /Return to homepage/i }).click();
    await expect(homePage.page).toHaveURL(/\/$/);
    await expect(homePage.heroHeading).toBeVisible();
  });

  test('dropdown roots show chevron affordance; flat roots do not', async ({ homePage }) => {
    await homePage.goto();
    const nav = homePage.page.getByTestId('homepage-section-nav');
    const chevrons = nav.locator('.mega-menu-root-link .pi-angle-down');
    await expect(chevrons).toHaveCount(4);
    const businesses = nav.getByRole('link', { name: roots[4], exact: true });
    const contactRoot = nav.getByRole('link', { name: roots[5], exact: true });
    await expect(businesses.locator('.pi-angle-down')).toHaveCount(0);
    await expect(contactRoot.locator('.pi-angle-down')).toHaveCount(0);
  });

  test('Businesses and Contact roots navigate by href', async ({ homePage }) => {
    await homePage.goto();
    const nav = homePage.page.getByTestId('homepage-section-nav');
    await expect(nav.getByRole('link', { name: roots[4], exact: true })).toHaveAttribute(
      'href',
      /\/businesses$/,
    );
    await expect(nav.getByRole('link', { name: roots[5], exact: true })).toHaveAttribute(
      'href',
      /\/contact$/,
    );

    await nav.getByRole('link', { name: roots[4], exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/businesses$/);
    await homePage.goto();
    await nav.getByRole('link', { name: roots[5], exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/contact$/);
  });

  test('panel for I Want To… includes Online Payments', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[0]);
    await expect(panel.getByRole('link', { name: L.onlinePayments, exact: true })).toBeVisible();
  });

  test('panel for Government & Meetings includes Meetings and calendar', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[1]);
    await expect(
      panel.getByRole('link', { name: L.meetingsAndCalendarTitle, exact: true }),
    ).toBeVisible();
  });

  test('panel for Services & Permits includes Online Payments', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[2]);
    await expect(panel.getByRole('link', { name: L.onlinePayments, exact: true })).toBeVisible();
  });

  test('panel for News, Notices & Alerts includes Town notices', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[3]);
    await expect(panel.getByRole('link', { name: L.townNotices, exact: true })).toBeVisible();
  });

  test('end slot: header search form and navigate on submit', async ({ homePage }) => {
    await homePage.goto();
    const nav = homePage.page.getByTestId('homepage-section-nav');
    const form = nav.locator('form.header-search-form[role="search"]');
    await expect(form).toBeVisible();
    const input = form.locator('#mega-site-search');
    await expect(input).toBeVisible();
    await expect(nav.getByLabel(chrome.searchInputAccessibleName)).toBeVisible();

    await input.fill('pay water bill');
    await input.press('Enter');
    await expect(homePage.page).toHaveURL(/\/pay-bill$/);
    await expect(
      homePage.page.getByRole('heading', { level: 1, name: 'Pay Your Utility Bill Online' }),
    ).toBeVisible();
  });

  test('end slot: language toggles update aria-pressed and document lang', async ({ homePage }) => {
    await homePage.goto();
    const nav = homePage.page.getByTestId('homepage-section-nav');
    const en = nav.locator('#site-language-en');
    const es = nav.locator('#site-language-es');
    await expect(en).toHaveAttribute('aria-pressed', 'true');
    await expect(es).toHaveAttribute('aria-pressed', 'false');

    await es.click();
    await expect(en).toHaveAttribute('aria-pressed', 'false');
    await expect(es).toHaveAttribute('aria-pressed', 'true');
    await expect(homePage.page.locator('html')).toHaveAttribute('lang', /es/i);

    await en.click();
    await expect(en).toHaveAttribute('aria-pressed', 'true');
    await expect(es).toHaveAttribute('aria-pressed', 'false');
    await expect(homePage.page.locator('html')).toHaveAttribute('lang', /en/i);
  });

  test('Contact & Town Hall mega menu root navigates to contact', async ({ homePage }) => {
    await homePage.goto();
    const nav = homePage.page.getByTestId('homepage-section-nav');
    const contactRoot = nav.getByRole('link', { name: roots[5], exact: true });
    await expect(contactRoot).toHaveAttribute('href', /\/contact$/);
    await contactRoot.click();
    await expect(homePage.page).toHaveURL(/\/contact$/);
  });

  test('feature page hides header search but keeps language and mega roots', async ({
    homePage,
  }) => {
    await homePage.page.goto('/weather');
    const nav = homePage.page.getByTestId('homepage-section-nav');
    await expect(nav.locator('#mega-site-search')).toHaveCount(0);
    await expect(nav.locator('form.header-search-form')).toHaveCount(0);
    await expect(nav.locator('#site-language-en')).toBeVisible();
    await expect(homePage.sectionNavLinks.filter({ hasText: roots[4] })).toBeVisible();
    const panel = await openMegaMenuPanel(homePage.page, roots[0]);
    await expect(panel.getByRole('link', { name: L.localWeather, exact: true })).toBeVisible();
  });

  test('Escape closes the visible mega menu overlay', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[0]);
    await expect(panel).toBeVisible();
    await homePage.page.keyboard.press('Escape');
    await expect(panel).toBeHidden({ timeout: 5_000 });
  });
});

test.describe('mega menu sub-link icons (desktop)', () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== 'desktop-chromium',
      'Mega menu dropdown panels are not shown on mobile layout.',
    );
  });

  test('Local weather row shows cloud icon', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[0]);
    const row = panel.getByRole('link', { name: L.localWeather, exact: true });
    await expect(row.locator('i.pi-cloud')).toBeVisible();
  });

  test('Meetings and calendar row shows calendar icon', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[1]);
    const row = panel.getByRole('link', { name: L.meetingsAndCalendarTitle, exact: true });
    await expect(row.locator('i.pi-calendar')).toBeVisible();
  });

  test('Records and documents row shows folder icon', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[1]);
    const row = panel.getByRole('link', { name: L.recordsAndDocuments, exact: true });
    await expect(row.locator('i.pi-folder')).toBeVisible();
  });

  test('Town notices row shows bell icon', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[3]);
    const row = panel.getByRole('link', { name: L.townNotices, exact: true });
    await expect(row.locator('i.pi-bell')).toBeVisible();
  });

  test('Town news row shows newspaper icon', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[3]);
    const row = panel.getByRole('link', { name: L.townNews, exact: true });
    await row.scrollIntoViewIfNeeded();
    const icon = row.locator('i.pi-newspaper');
    await expect(icon).toHaveCount(1);
    await expect(icon).toBeAttached();
  });
});

test.describe('mobile menu drawer anchors', () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== 'mobile-chromium',
      'Drawer replaces the desktop mega menu on mobile.',
    );
  });

  test('each drawer link navigates to its hub route', async ({ homePage }) => {
    const page = homePage.page;

    for (const { label, urlRegex } of siteContent.mobileDrawerLinksEn) {
      await homePage.goto();
      await page.getByRole('button', { name: 'Homepage sections' }).click();
      const drawer = page.locator('#mobile-menu-drawer');
      await expect(drawer.locator('.mobile-menu-nav')).toBeVisible();
      await drawer
        .locator('.mobile-menu-nav')
        .getByRole('link', { name: label, exact: true })
        .click();
      if (label === 'Home') {
        expect(new URL(page.url()).pathname).toBe('/');
        continue;
      }
      await expect(page).toHaveURL(urlRegex);
    }
  });
});
