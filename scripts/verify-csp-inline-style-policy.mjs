#!/usr/bin/env node
/**
 * CI entry: fail if customHttp.yml or angular.json CSP regresses to the d22973b inline-style pattern.
 *
 * Usage: node scripts/verify-csp-inline-style-policy.mjs
 * Prefer: npm run test:csp-inline-style-policy (includes regression fixtures)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertAngularInlineStylePolicy } from './lib/csp-inline-style-policy.mjs';
import { extractCspValueFromCustomHttpFile } from './lib/custom-http-csp.mjs';

const root = join(import.meta.dirname, '..');

function fail(message) {
  console.error(`error: ${message}`);
  console.error('Run: npm run test:csp-inline-style-policy');
  if (process.env.GITHUB_ACTIONS === 'true') {
    console.error(`::error title=CSP inline-style regression::${message}`);
  }
  process.exit(1);
}

try {
  const cspCustom = extractCspValueFromCustomHttpFile(root);
  assertAngularInlineStylePolicy(cspCustom, 'customHttp.yml');

  const angular = JSON.parse(readFileSync(join(root, 'angular.json'), 'utf8'));
  const serveCsp =
    angular?.projects?.['townofwiley-app']?.architect?.serve?.options?.headers?.[
      'Content-Security-Policy'
    ];
  if (!serveCsp) {
    fail(
      'angular.json: missing serve.options.headers.Content-Security-Policy — run npm run sync:angular-serve-csp',
    );
  }
  if (serveCsp !== cspCustom) {
    fail('angular.json CSP does not match customHttp.yml — run npm run sync:angular-serve-csp');
  }
  assertAngularInlineStylePolicy(serveCsp, 'angular.json');
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

console.log(
  'OK: customHttp.yml and angular.json CSP allow Angular <style> tags (style-src + style-src-attr unsafe-inline).',
);
