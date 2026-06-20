import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildStorageKey,
    resolveSectionRule,
    sanitizeUploadFileName,
} from './cms-media-lib.mjs';

test('sanitizeUploadFileName normalizes unsafe characters', () => {
  assert.equal(sanitizeUploadFileName('Town Newsletter May 2026.pdf'), 'town-newsletter-may-2026.pdf');
});

test('hero section targets static site bucket and public URL path', () => {
  const rule = resolveSectionRule('cms-uploads/hero');
  assert.equal(rule.bucket, 'townofwiley-static-site');
  assert.equal(rule.keyPrefix, 'media/cms/hero');
  assert.ok(rule.cfPaths.includes('/media/cms/hero/*'));
});

test('buildStorageKey uses section prefix', () => {
  const key = buildStorageKey('newsletter', 'Newsletter.pdf');
  assert.match(key, /^documents\/newsletter\/\d+-newsletter\.pdf$/);
});
