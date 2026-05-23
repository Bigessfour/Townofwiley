import assert from 'node:assert/strict';
import test from 'node:test';

import { ALLOWED_FIELDS, sanitizeContactUpdateBody } from './sanitize-body.mjs';

test('sanitizeContactUpdateBody drops unknown keys and truncates strings', () => {
  const result = sanitizeContactUpdateBody({
    fullName: 'Taylor Resident',
    extraField: 'ignore me',
    notes: 'n'.repeat(1200),
    locale: 'en',
    source: 'payment-panel',
  });

  assert.equal(result.fullName, 'Taylor Resident');
  assert.equal(result.notes, 'n'.repeat(1000));
  assert.equal(result.extraField, undefined);
  assert.equal(ALLOWED_FIELDS.has('fullName'), true);
});

test('sanitizeContactUpdateBody coerces non-string values to strings', () => {
  const result = sanitizeContactUpdateBody({
    fullName: 42,
    phone: null,
    locale: 'es',
  });

  assert.equal(result.fullName, '42');
  assert.equal(result.phone, '');
  assert.equal(result.locale, 'es');
});
