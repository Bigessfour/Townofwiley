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
      'media-src must allow documents bucket (remote cow welcome / hosted media)',
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
  ];
  for (const [pattern, msg] of checks) {
    if (!pattern.test(csp)) {
      throw new Error(`${label}: ${msg}`);
    }
  }
}

const amp = readFileSync(join(root, 'amplify.yml'), 'utf8');
const custom = readFileSync(join(root, 'customHttp.yml'), 'utf8');

if (/^\s*customHeaders:/m.test(amp)) {
  console.error(
    'error: amplify.yml must not define customHeaders.\n' +
      'Per AWS, use repo-root customHttp.yml only, then deploy and run npm run amplify:sync-headers as needed.\n' +
      'https://docs.aws.amazon.com/amplify/latest/userguide/migrate-custom-headers.html',
  );
  process.exit(1);
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
  throw new Error(
    'angular.json: missing projects.townofwiley-app.architect.serve.options.headers.Content-Security-Policy — run `npm run sync:angular-serve-csp` after editing customHttp.yml.',
  );
}
if (serveCsp !== cspCustom) {
  throw new Error(
    'angular.json dev-server CSP does not match customHttp.yml — run `npm run sync:angular-serve-csp`.',
  );
}

console.log(
  'OK: customHttp.yml CSP matches GA4 + SW baselines; amplify.yml has no customHeaders block; angular serve CSP matches customHttp.yml.',
);
