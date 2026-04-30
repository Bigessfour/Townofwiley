import { expect, test } from '../../fixtures/town.fixture';

const formRoutes = [
  { path: '/', label: 'homepage search' },
  { path: '/weather', label: 'weather signup' },
  { path: '/services#payment-help', label: 'payment help' },
  { path: '/services#issue-report', label: 'issue report' },
  { path: '/services#records-request', label: 'records request' },
  { path: '/accessibility', label: 'accessibility report' },
  { path: '/businesses', label: 'business directory' },
  { path: '/documents', label: 'document archive search' },
];

test.describe('public form labeling', () => {
  for (const formRoute of formRoutes) {
    test(`${formRoute.label} controls have accessible labels`, async ({ homePage }) => {
      if (formRoute.path === '/weather') {
        await homePage.enableAlertSignup('/mock-alert-signup');
      }

      await homePage.page.goto(formRoute.path, { waitUntil: 'domcontentloaded' });

      const unlabeledControls = await homePage.page.evaluate(() => {
        const controls = Array.from(
          document.body.querySelectorAll<HTMLElement>(
            'input:not([type="hidden"]), textarea, select, [role="combobox"]',
          ),
        );

        return controls
          .filter((control) => {
            const rect = control.getBoundingClientRect();
            const style = getComputedStyle(control);

            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
          })
          .map((control) => {
            const id = control.getAttribute('id');
            const labelledBy = control.getAttribute('aria-labelledby');
            const ariaLabel = control.getAttribute('aria-label');
            const labelFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
            const closestLabel = control.closest('label');
            const labelledByText = labelledBy
              ? labelledBy
                  .split(/\s+/)
                  .map((labelId) => document.getElementById(labelId)?.textContent?.trim() ?? '')
                  .join(' ')
                  .trim()
              : '';
            const labelText =
              ariaLabel ||
              labelledByText ||
              labelFor?.textContent?.trim() ||
              closestLabel?.textContent?.trim() ||
              control.getAttribute('placeholder') ||
              control.getAttribute('title') ||
              '';

            return {
              id: id ?? control.getAttribute('name') ?? control.tagName.toLowerCase(),
              labelText: labelText.replace(/\s+/g, ' ').trim(),
            };
          })
          .filter((control) => control.labelText.length === 0);
      });

      expect(
        unlabeledControls,
        `${formRoute.label} unlabeled controls: ${JSON.stringify(unlabeledControls)}`,
      ).toEqual([]);
    });
  }
});
