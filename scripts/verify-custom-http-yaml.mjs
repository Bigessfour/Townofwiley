#!/usr/bin/env node
/**
 * Enforce AWS-recommended single source for Amplify Hosting headers: repo-root
 * customHttp.yml only (no customHeaders in amplify.yml).
 *
 * CSP baselines follow Google Tag Platform (GA4 + optional Google Signals) and
 * Angular service-worker behavior (connect-src for SW fetch; same-origin gtag init).
 *
 * https://docs.aws.amazon.com/amplify/latest/userguide/migrate-custom-headers.html
 * https://developers.google.com/tag-platform/security/guides/csp
 * https://angular.io/guide/service-worker-devops (CSP + SW)
 *
 * Usage: node scripts/verify-custom-http-yaml.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractCspValueFromCustomHttpText } from './lib/custom-http-csp.mjs';

const root = join(import.meta.dirname, '..');

function assertGoogleAnalyticsAndSiteBaselines(csp, label) {
  const checks = [
    [/worker-src[^;]*'self'/, "worker-src must include 'self' (Angular ngsw-worker.js)"],
    [
      /script-src[^;]*\*\.googletagmanager\.com/i,
      'script-src must allow https://*.googletagmanager.com (GA4)',
    ],
    [/script-src[^;]*googletagmanager\.com/i, 'script-src must allow googletagmanager.com (GA4)'],
    [
      /img-src[^;]*\*\.googletagmanager\.com/i,
      'img-src must allow https://*.googletagmanager.com (GA4 beacons / pixels)',
    ],
    [
      /img-src[^;]*\*\.google-analytics\.com/i,
      'img-src must allow https://*.google-analytics.com (GA4)',
    ],
    [/media-src[^;]*'self'/, "media-src must include 'self' (local video assets)"],
    [/media-src[^;]*data:/, 'media-src must include data: (inline / data URLs if used)'],
    [/media-src[^;]*blob:/, 'media-src must include blob: (MediaSource / blob playback if used)'],
    [
      /media-src[^;]*townofwiley-documents-storage\.s3\.us-east-2\.amazonaws\.com/i,
      'media-src must allow documents bucket (logical Amplify name)',
    ],
    [
      /media-src[^;]*townofwiley-documents-storage-main\.s3\.us-east-2\.amazonaws\.com/i,
      'media-src must allow live branch documents bucket (-main suffix)',
    ],
    [
      /connect-src[^;]*\*\.googletagmanager\.com/i,
      'connect-src must allow https://*.googletagmanager.com (gtag + SW fetch)',
    ],
    [
      /connect-src[^;]*\*\.google-analytics\.com/i,
      'connect-src must allow https://*.google-analytics.com (GA4 collect)',
    ],
    [
      /connect-src[^;]*\*\.analytics\.google\.com/i,
      'connect-src must allow https://*.analytics.google.com (GA4)',
    ],
    [
      /connect-src[^;]*\*\.g\.doubleclick\.net/i,
      'connect-src must allow https://*.g.doubleclick.net (Google Signals / Ads)',
    ],
    [
      /connect-src[^;]*stats\.g\.doubleclick\.net/i,
      'connect-src must allow https://stats.g.doubleclick.net (GA)',
    ],
    [
      /connect-src[^;]*https:\/\/www\.google\.com/i,
      'connect-src must allow https://www.google.com (Google beacons)',
    ],
    [
      /connect-src[^;]*https:\/\/google\.com/i,
      'connect-src must allow https://google.com (Google beacons)',
    ],
    [/font-src[^;]*data:/, 'font-src must include data: (PrimeIcons / icomoon)'],
    [
      /frame-src[^;]*https:\/\/www\.googletagmanager\.com/i,
      'frame-src must allow https://www.googletagmanager.com (GA4 / GTM iframes per Google CSP guide)',
    ],
    [/object-src\s+'none'/, "object-src must be 'none'"],
    [
      /connect-src[^;]*\*\.execute-api\.us-east-2\.amazonaws\.com/i,
      'connect-src must allow https://*.execute-api.us-east-2.amazonaws.com (staff contact review API)',
    ],
    [
      /connect-src[^;]*\*\.lambda-url\.us-east-2\.on\.aws/i,
      'connect-src must allow https://*.lambda-url.us-east-2.on.aws (weather proxy and alert signup)',
    ],
    [
      /style-src[^;]*'self'/,
      "style-src must include 'self'",
    ],
    [
      /style-src-attr[^;]*'unsafe-inline'/,
      "style-src-attr must include 'unsafe-inline' (Angular/PrimeNG attribute styles)",
    ],
  ];
  for (const [pattern, msg] of checks) {
    if (!pattern.test(csp)) {
      failWithHint(`${label}: ${msg}`);
    }
  }
}

const amp = readFileSync(join(root, 'amplify.yml'), 'utf8');
const custom = readFileSync(join(root, 'customHttp.yml'), 'utf8');

function failWithHint(message) {
  const fix =
    'Fix: npm run sync:angular-serve-csp && npm run verify:custom-http-yaml (edit customHttp.yml only; never add customHeaders to amplify.yml)';
  console.error(`error: ${message}\n${fix}`);
  if (process.env.GITHUB_ACTIONS === 'true') {
    console.error(`::error title=CSP SSOT check failed::${message}. ${fix}`);
  }
  process.exit(1);
}

if (/^\s*customHeaders:/m.test(amp)) {
  failWithHint(
    'amplify.yml must not define customHeaders — use repo-root customHttp.yml only, then npm run amplify:sync-headers after merge.\n' +
      'https://docs.aws.amazon.com/amplify/latest/userguide/migrate-custom-headers.html',
  );
}

const cspCustom = extractCspValueFromCustomHttpText(custom, 'customHttp.yml');
assertGoogleAnalyticsAndSiteBaselines(cspCustom, 'customHttp.yml');

const angularPath = join(root, 'angular.json');
const angular = JSON.parse(readFileSync(angularPath, 'utf8'));
const serveCsp =
  angular?.projects?.['townofwiley-app']?.architect?.serve?.options?.headers?.[
    'Content-Security-Policy'
  ];
if (!serveCsp) {
  failWithHint(
    'angular.json: missing projects.townofwiley-app.architect.serve.options.headers.Content-Security-Policy — run npm run sync:angular-serve-csp after editing customHttp.yml.',
  );
}
if (serveCsp !== cspCustom) {
  failWithHint('angular.json dev-server CSP does not match customHttp.yml — run npm run sync:angular-serve-csp.');
}

console.log(
  'OK: customHttp.yml CSP matches GA4 + SW baselines; amplify.yml has no customHeaders block; angular serve CSP matches customHttp.yml.',
);
