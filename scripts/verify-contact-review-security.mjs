#!/usr/bin/env node
/**
 * Verify the staff contact-review JWT API blocks unauthenticated access.
 *
 * Usage:
 *   npm run verify:contact-review
 *   node scripts/verify-contact-review-security.mjs --api-url https://lmppzxwh3h.execute-api.us-east-2.amazonaws.com/contact-updates
 */
import { loadProductionBindingsFromRepo } from './lib/runtime-config-env.mjs';

function parseArgs(argv) {
  const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
  const apiUrl =
    argv.find((arg) => arg.startsWith('--api-url='))?.split('=').slice(1).join('=') ??
    process.env.CONTACT_UPDATE_REVIEW_API_URL ??
    loadProductionBindingsFromRepo()?.contactReview?.reviewApiEndpoint ??
    '';
  return { apiUrl: apiUrl.trim().replace(/\/$/, ''), flags };
}

async function main() {
  const { apiUrl } = parseArgs(process.argv.slice(2));

  if (!apiUrl) {
    console.error(
      'Missing review API URL. Pass --api-url= or set CONTACT_UPDATE_REVIEW_API_URL.',
    );
    process.exit(1);
  }

  if (apiUrl.includes('contact-review-not-deployed') || apiUrl.includes('.local')) {
    console.error(`Refusing placeholder review API URL: ${apiUrl}`);
    process.exit(1);
  }

  const response = await fetch(apiUrl, { method: 'GET' });
  const body = await response.text();

  if (response.status === 401 || response.status === 403) {
    console.log(`OK: unauthenticated GET blocked (${response.status}) at ${apiUrl}`);
    return;
  }

  console.error(
    `FAIL: expected 401/403 for unauthenticated GET, got ${response.status}. Body: ${body.slice(0, 200)}`,
  );
  process.exit(1);
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
});