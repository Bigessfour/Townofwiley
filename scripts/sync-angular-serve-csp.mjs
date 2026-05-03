#!/usr/bin/env node
/**
 * Mirrors Content-Security-Policy from customHttp.yml into angular.json serve.headers
 * so `ng serve` applies the same policy as Amplify Hosting (dev CSP parity).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractCspValueFromCustomHttpFile } from './lib/custom-http-csp.mjs';

const root = join(import.meta.dirname, '..');
const csp = extractCspValueFromCustomHttpFile(root);
const angularPath = join(root, 'angular.json');
const angular = JSON.parse(readFileSync(angularPath, 'utf8'));

const serve = angular.projects['townofwiley-app'].architect.serve;
serve.options = serve.options ?? {};
serve.options.headers = {
  ...(serve.options.headers ?? {}),
  'Content-Security-Policy': csp,
};

writeFileSync(angularPath, `${JSON.stringify(angular, null, 2)}\n`, 'utf8');
console.log('OK: angular.json serve.options.headers.Content-Security-Policy synced from customHttp.yml');
