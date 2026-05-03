/**
 * Mega menu internal link coverage (PrimeNG grid panels, desktop only).
 *
 * Planning / determinism:
 * - Each test opens exactly one root `menuitem`, then clicks one `.p-megamenu-panel` sub-link by
 *   accessible name (and href when labels repeat).
 * - Asserts URL (path + optional hash) and a destination-specific element — not only "click succeeded".
 * - Locale locked to EN via `town.fixture` init + default `locale: en-US` in Playwright config.
 * - NWS is mocked via fixture; weather tests assert the weather shell, not live APIs.
 *
 * Run one test in isolation (no workers, single grep), e.g.:
 *   npx playwright test e2e/specs/smoke/megamenu-internal-links.spec.ts \
 *     --project=desktop-chromium --workers=1 -g "I Want To: Online Payments"
 *
 * @see https://primeng.org/megamenu#router
 */
import { expect, test } from '../../fixtures/town.fixture';
import type { Page } from '@playwright/test';
import { siteContent } from '../../support/site-content';

const roots = siteContent.megaMenuRootLabelsEn;
const L = siteContent.megaMenuPanelLinksEn;

async function openMegaMenuPanel(page: Page, rootLabel: string) {
  const nav = page.getByTestId('homepage-section-nav');
  await nav.getByRole('menuitem', { name: rootLabel }).click();
  // Scope to the active root item: several overlays can exist in the DOM; `visible: true` alone is not unique.
  const panel = nav.locator('li.p-megamenu-item-active').locator('.p-megamenu-overlay').first();
  await expect(panel).toBeVisible({ timeout: 10_000 });
  return panel;
}

test.describe('mega menu internal panel links', () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== 'desktop-chromium',
      'Mega menu dropdown panels are not shown on mobile layout.',
    );
  });

  test('I Want To: Online Payments → services#payment-help', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[0]);
    await panel.getByRole('link', { name: L.onlinePayments, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/services#payment-help$/);
    await expect(homePage.page.locator('#payment-help')).toBeVisible();
  });

  test('I Want To: Report Street/Utility Issue → services#issue-report', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[0]);
    await panel.getByRole('link', { name: L.reportIssue, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/services#issue-report$/);
    await expect(homePage.page.locator('#issue-report')).toBeVisible();
  });

  test('I Want To: Meetings and Calendar → meetings#calendar', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[0]);
    await panel.getByRole('link', { name: L.meetingsAndCalendar, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/meetings#calendar$/);
    await expect(homePage.page.locator('#calendar')).toBeVisible({ timeout: 20_000 });
  });

  test('I Want To: Permits & Licenses (records form) → services#records-request', async ({
    homePage,
  }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[0]);
    await panel.locator('a.mega-menu-sub-link[href*="records-request"]').click();
    await expect(homePage.page).toHaveURL(/\/services#records-request$/);
    await expect(homePage.page.locator('#records-request')).toBeVisible();
  });

  test('I Want To: Search All Services → home#search-panel', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[0]);
    await panel.getByRole('link', { name: L.searchAllServices, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/#search-panel$/);
    await expect(homePage.page.locator('#search-panel')).toBeVisible();
  });

  test('I Want To: Local weather → /weather', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[0]);
    await panel.getByRole('link', { name: L.localWeather, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/weather$/);
    await expect(homePage.page.locator('#weather-heading')).toBeVisible();
  });

  test('I Want To: National Weather Service Alert → /weather', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[0]);
    await panel.getByRole('link', { name: L.nwsAlert, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/weather$/);
    await expect(homePage.page.locator('#weather-heading')).toBeVisible();
  });

  test('I Want To: Weather & Emergency Alerts → /weather', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[0]);
    await panel.getByRole('link', { name: L.weatherEmergencyAlerts, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/weather$/);
    await expect(homePage.page.locator('#weather-heading')).toBeVisible();
  });

  test('I Want To: Open the full town calendar → meetings#calendar', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[0]);
    await panel.getByRole('link', { name: L.openFullCalendar, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/meetings#calendar$/);
    await expect(homePage.page.locator('#calendar')).toBeVisible({ timeout: 20_000 });
  });

  test('Government: Meetings and calendar → /meetings', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[1]);
    await panel.getByRole('link', { name: L.meetingsAndCalendarTitle, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/meetings$/);
    await expect(homePage.page).not.toHaveURL(/#/);
    await expect(homePage.page.locator('#calendar')).toBeVisible({ timeout: 20_000 });
  });

  test('Government: Calendar → meetings#calendar', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[1]);
    await panel.getByRole('link', { name: L.calendar, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/meetings#calendar$/);
    await expect(homePage.page.locator('#calendar')).toBeVisible({ timeout: 20_000 });
  });

  test('Government: Records and documents → /records', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[1]);
    await panel.getByRole('link', { name: L.recordsAndDocuments, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/records$/);
    await expect(homePage.page.getByTestId('records-guide-packets')).toBeVisible();
  });

  test('Government: Transparency → /records', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[1]);
    await panel.getByRole('link', { name: L.transparency, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/records$/);
    await expect(homePage.page.getByTestId('records-guide-packets')).toBeVisible();
  });

  test('Government: Accessibility statement → /accessibility', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[1]);
    await panel.getByRole('link', { name: L.accessibilityStatement, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/accessibility$/);
    await expect(homePage.page.locator('#barrier-report')).toContainText(
      'Open accessibility report email',
    );
  });

  test('Government: Leadership → contact#leadership', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[1]);
    await panel.getByRole('link', { name: L.leadership, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/contact#leadership$/);
    await expect(homePage.page.locator('.leadership-grid')).toBeVisible();
    await expect(homePage.page.locator('.leadership-grid')).toContainText('Mayor and Council');
  });

  test('Services: Online Payments → services#payment-help', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[2]);
    await panel.getByRole('link', { name: L.onlinePayments, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/services#payment-help$/);
    await expect(homePage.page.locator('#payment-help')).toBeVisible();
  });

  test('Services: Report Street/Utility Issue → services#issue-report', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[2]);
    await panel.getByRole('link', { name: L.reportIssue, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/services#issue-report$/);
    await expect(homePage.page.locator('#issue-report')).toBeVisible();
  });

  test('Services: Permits & Licenses (records form) → services#records-request', async ({
    homePage,
  }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[2]);
    await panel.locator('a.mega-menu-sub-link[href*="records-request"]').click();
    await expect(homePage.page).toHaveURL(/\/services#records-request$/);
    await expect(homePage.page.locator('#records-request')).toBeVisible();
  });

  test('Services: Resident services → /services', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[2]);
    await panel.getByRole('link', { name: L.residentServices, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/services$/);
    await expect(homePage.page.locator('#resident-services')).toBeVisible();
  });

  test('Services: Records and documents → /records', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[2]);
    await panel.getByRole('link', { name: L.recordsAndDocuments, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/records$/);
    await expect(homePage.page.getByTestId('records-guide-packets')).toBeVisible();
  });

  test('Services: Permits & Licenses (services hub) → /services', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[2]);
    // "Resident services" and plain "Permits & Licenses" both use `href="/services"` (no fragment).
    const plainServices = panel.locator('a.mega-menu-sub-link[href="/services"]');
    await expect(plainServices).toHaveCount(2);
    await plainServices.nth(1).click();
    await expect(homePage.page).toHaveURL(/\/services$/);
    await expect(homePage.page.locator('#resident-services')).toBeVisible();
  });

  test('News & alerts: Town notices → /notices', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[3]);
    await panel.getByRole('link', { name: L.townNotices, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/notices$/);
    await expect(homePage.noticeCards).toHaveCount(siteContent.homepageCounts.noticeCards);
  });

  test('News & alerts: Town news → /news', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[3]);
    await panel.getByRole('link', { name: L.townNews, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/news$/);
    await expect(
      homePage.page.getByRole('heading', { name: siteContent.cmsHeadings.news }),
    ).toBeVisible();
  });

  test('News & alerts: National Weather Service Alert → /weather', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[3]);
    await panel.getByRole('link', { name: L.nwsAlert, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/weather$/);
    await expect(homePage.page.locator('#weather-heading')).toBeVisible();
  });

  test('News & alerts: Sign up for alerts → /weather', async ({ homePage }) => {
    await homePage.goto();
    const panel = await openMegaMenuPanel(homePage.page, roots[3]);
    await panel.getByRole('link', { name: L.signUpAlerts, exact: true }).click();
    await expect(homePage.page).toHaveURL(/\/weather$/);
    await expect(homePage.page.locator('#weather-heading')).toBeVisible();
  });
});
