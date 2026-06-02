#!/usr/bin/env node
/**
 * Component tests: CSP must not regress to style-src 'self' only + style-src-attr 'unsafe-inline'.
 * That pattern blocks Angular <style> tags and causes "Applying inline style violates…" in the browser.
 *
 * Run: npm run test:csp-inline-style-policy
 * CI: Site CI custom-headers-parity + test:vitest chain
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  assertAngularInlineStylePolicy,
  CSP_INLINE_STYLE_REGRESSION_FIXTURE,
  CSP_INLINE_STYLE_VALID_FIXTURE,
  hasInlineStyleElementRegression,
  validateAngularInlineStylePolicy,
} from './lib/csp-inline-style-policy.mjs';
import { extractCspValueFromCustomHttpFile } from './lib/custom-http-csp.mjs';

const root = join(import.meta.dirname, '..');

describe('hasInlineStyleElementRegression (d22973b pattern)', () => {
  it('detects style-src-attr-only unsafe-inline (blocks <style> tags)', () => {
    assert.equal(hasInlineStyleElementRegression(CSP_INLINE_STYLE_REGRESSION_FIXTURE), true);
  });

  it('does not flag when both style-src and style-src-attr allow unsafe-inline', () => {
    assert.equal(hasInlineStyleElementRegression(CSP_INLINE_STYLE_VALID_FIXTURE), false);
  });

  it('does not flag when neither directive allows unsafe-inline', () => {
    const strict = "style-src 'self'; style-src-attr 'self'";
    assert.equal(hasInlineStyleElementRegression(strict), false);
  });

  it('does not flag when only style-src allows unsafe-inline (missing style-src-attr)', () => {
    const partial = "style-src 'self' 'unsafe-inline'; script-src 'self'";
    assert.equal(hasInlineStyleElementRegression(partial), false);
  });
});

describe('validateAngularInlineStylePolicy', () => {
  it('rejects the d22973b regression with an actionable message', () => {
    const result = validateAngularInlineStylePolicy(CSP_INLINE_STYLE_REGRESSION_FIXTURE, 'fixture');
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.message, /d22973b regression/i);
      assert.match(result.message, /Applying inline style violates/i);
      assert.match(result.message, /style-src 'self' 'unsafe-inline'/i);
    }
  });

  it('accepts the required Angular hosting policy', () => {
    const result = validateAngularInlineStylePolicy(CSP_INLINE_STYLE_VALID_FIXTURE, 'fixture');
    assert.equal(result.ok, true);
  });

  it('rejects style-src without unsafe-inline even when style-src-attr is absent', () => {
    const result = validateAngularInlineStylePolicy(
      "style-src 'self'; script-src 'self'",
      'fixture',
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.message, /style-src must include 'unsafe-inline'/i);
    }
  });

  it('rejects missing style-src-attr unsafe-inline when style-src is correct', () => {
    const result = validateAngularInlineStylePolicy(
      "style-src 'self' 'unsafe-inline'; script-src 'self'",
      'fixture',
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.message, /style-src-attr must include 'unsafe-inline'/i);
    }
  });
});

describe('repo Content-Security-Policy (SSOT)', () => {
  it('customHttp.yml does not regress inline <style> CSP', () => {
    const csp = extractCspValueFromCustomHttpFile(root);
    assert.doesNotThrow(() => assertAngularInlineStylePolicy(csp, 'customHttp.yml'));
  });

  it('angular.json serve.headers matches customHttp.yml inline-style policy', () => {
    const cspCustom = extractCspValueFromCustomHttpFile(root);
    const angular = JSON.parse(readFileSync(join(root, 'angular.json'), 'utf8'));
    const serveCsp =
      angular?.projects?.['townofwiley-app']?.architect?.serve?.options?.headers?.[
        'Content-Security-Policy'
      ];
    assert.ok(serveCsp, 'angular.json serve CSP header missing');
    assert.equal(
      serveCsp,
      cspCustom,
      'angular.json CSP must match customHttp.yml — run npm run sync:angular-serve-csp',
    );
    assert.doesNotThrow(() => assertAngularInlineStylePolicy(serveCsp, 'angular.json'));
  });
});
