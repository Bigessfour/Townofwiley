import { expect, test } from '../../fixtures/town.fixture';

const deepLinkTargets = [
  { path: '/#top-tasks', selector: '#top-tasks', label: 'homepage top tasks' },
  { path: '/services#payment-help', selector: '#payment-help', label: 'payment help' },
  { path: '/services#issue-report', selector: '#issue-report', label: 'issue report' },
  {
    path: '/contact',
    selector: '#leadership',
    label: 'leadership roster',
  },
  { path: '/meetings#calendar', selector: '#calendar', label: 'meetings calendar' },
];

test.describe('public deep links', () => {
  for (const target of deepLinkTargets) {
    test(`${target.label} direct link lands on the target section`, async ({ homePage }) => {
      await homePage.page.goto(target.path, { waitUntil: 'domcontentloaded' });

      const targetSection = homePage.page.locator(target.selector);

      await expect(targetSection).toBeVisible({ timeout: 20_000 });
    });
  }
});
