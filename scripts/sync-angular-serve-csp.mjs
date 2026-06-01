#!/usr/bin/env node
/**
 * Mirrors Content-Security-Policy from customHttp.yml into angular.json serve.headers
 * so `ng serve` applies the same policy as Amplify Hosting (dev CSP parity).
 *
 * Updates only the CSP header line in angular.json (no full-file JSON reformat).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractCspValueFromCustomHttpFile } from './lib/custom-http-csp.mjs';

const root = join(import.meta.dirname, '..');
const csp = extractCspValueFromCustomHttpFile(root);
const angularPath = join(root, 'angular.json');
const angularText = readFileSync(angularPath, 'utf8');
const angular = JSON.parse(angularText);

const serve = angular.projects['townofwiley-app'].architect.serve;
serve.options = serve.options ?? {};
serve.options.headers = serve.options.headers ?? {};

const headerKey = 'Content-Security-Policy';
const currentCsp = serve.options.headers[headerKey];

if (currentCsp === csp) {
  console.log(`OK: angular.json serve.options.headers.${headerKey} already synced from customHttp.yml`);
  process.exit(0);
}

serve.options.headers[headerKey] = csp;

const cspPattern = /"Content-Security-Policy"\s*:\s*"(?:[^"\\]|\\.)*"/;
const replacement = `"Content-Security-Policy": ${JSON.stringify(csp)}`;

if (!cspPattern.test(angularText)) {
  console.error(
    'Error: Could not find Content-Security-Policy in angular.json; add serve.options.headers first.',
  );
  process.exit(1);
}

const updated = angularText.replace(cspPattern, replacement);
writeFileSync(angularPath, updated, 'utf8');
console.log(`OK: angular.json serve.options.headers.${headerKey} synced from customHttp.yml`);
