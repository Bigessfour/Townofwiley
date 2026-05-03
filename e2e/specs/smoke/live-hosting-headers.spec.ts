import { expect, test } from '@playwright/test';

const headerChecks = [
  {
    path: '/',
    label: 'site shell',
    headers: {
      'strict-transport-security': /max-age=31536000/,
      'x-content-type-options': /^nosniff$/,
      // Repo amplify.yml uses DENY; live may still serve SAMEORIGIN until edge headers match the repo.
      'x-frame-options': /^(DENY|SAMEORIGIN)$/,
      'referrer-policy': /^strict-origin-when-cross-origin$/,
      'permissions-policy': /camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\)/,
      // font-src must allow data: (PrimeIcons); keep other baseline directives
      'content-security-policy':
        /(?=.*default-src 'self')(?=.*font-src[^;]*data:)(?=.*frame-src 'none')(?=.*object-src 'none')/,
    },
  },
  {
    path: '/runtime-config.js',
    label: 'runtime config',
    headers: {
      'cache-control': /no-cache, no-store, must-revalidate/,
      'x-content-type-options': /^nosniff$/,
    },
  },
  {
    path: '/documents/archive/city-council-meeting-access-guide.html',
    label: 'document archive page',
    headers: {
      'cache-control': /no-cache, no-store, must-revalidate/,
      'x-frame-options': /^DENY$/,
      'content-security-policy': /object-src 'none'/,
    },
  },
];

test.describe('live hosting security headers', () => {
  test.skip(!process.env.E2E_BASE_URL, 'Set E2E_BASE_URL to validate deployed hosting headers.');

  for (const check of headerChecks) {
    test(`${check.label} returns expected Amplify headers`, async ({ request }) => {
      const response = await request.get(check.path);

      await expect(response).toBeOK();

      for (const [headerName, expectedPattern] of Object.entries(check.headers)) {
        const actualValue = response.headers()[headerName];

        expect(actualValue, `${check.path} ${headerName}`).toBeTruthy();
        expect(actualValue, `${check.path} ${headerName}`).toMatch(expectedPattern);
      }
    });
  }
});
