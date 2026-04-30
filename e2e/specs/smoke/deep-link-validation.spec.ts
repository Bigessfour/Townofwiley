import { expect, test } from '../../fixtures/town.fixture';

const deepLinkTargets = [
  { path: '/#top-tasks', selector: '#top-tasks', label: 'homepage top tasks' },
  { path: '/services#payment-help', selector: '#payment-help', label: 'payment help' },
  { path: '/services#issue-report', selector: '#issue-report', label: 'issue report' },
  { path: '/services#records-request', selector: '#records-request', label: 'records request' },
  { path: '/meetings#calendar', selector: '#calendar', label: 'meetings calendar' },
  {
    path: '/documents#meeting-documents',
    selector: '#meeting-documents',
    label: 'meeting documents',
  },
  {
    path: '/documents#financial-documents',
    selector: '#financial-documents',
    label: 'financial documents',
  },
  {
    path: '/documents#records-requests',
    selector: '#records-requests',
    label: 'records request documents',
  },
];

test.describe('public deep links', () => {
  for (const target of deepLinkTargets) {
    test(`${target.label} direct link lands on the target section`, async ({ homePage }) => {
      await homePage.page.goto(target.path, { waitUntil: 'domcontentloaded' });

      const targetSection = homePage.page.locator(target.selector);

      await expect(targetSection).toBeVisible({ timeout: 20000 });
      await expect(homePage.page).toHaveURL(new RegExp(`${target.selector}$`));

      await expect
        .poll(
          async () =>
            targetSection.evaluate((element) => {
              const rect = element.getBoundingClientRect();

              return rect.top >= -24 && rect.top <= window.innerHeight * 0.75;
            }),
          { message: `${target.label} should scroll into view from the fragment` },
        )
        .toBe(true);
    });
  }
});
