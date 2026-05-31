import assert from 'node:assert/strict';
import test from 'node:test';
import { extractClientIp, hashIp } from './geo-lookup.mjs';
import { sanitizeMessageBody, sanitizeVisitBody } from './sanitize.mjs';

test('extractClientIp uses first forwarded address', () => {
  assert.equal(extractClientIp('203.0.113.1, 10.0.0.1'), '203.0.113.1');
});

test('hashIp is stable', () => {
  assert.equal(hashIp('1.2.3.4', 'salt'), hashIp('1.2.3.4', 'salt'));
});

test('sanitizeVisitBody defaults page path', () => {
  assert.deepEqual(sanitizeVisitBody({}), {
    kind: 'visit',
    pagePath: '/hello-from',
    source: 'hello-from',
    locale: 'en',
  });
});

test('sanitizeMessageBody rejects links', () => {
  const result = sanitizeMessageBody({
    message: 'See https://evil.example',
    placeLabel: 'Ireland',
    countryCode: 'IE',
    publicConsent: true,
  });
  assert.ok('error' in result);
});

test('sanitizeMessageBody accepts valid payload', () => {
  const result = sanitizeMessageBody({
    message: 'Hello from the Wild Atlantic Way',
    displayName: 'Siobhán',
    placeLabel: 'Ireland',
    countryCode: 'IE',
    lat: 53.3,
    lng: -6.2,
    publicConsent: true,
    locale: 'en',
  });
  assert.equal(result.kind, 'message');
  assert.equal(result.status, 'published');
});
