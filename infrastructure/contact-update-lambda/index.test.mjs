import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALLOWED_FIELDS,
  PREFERRED_CONTACT_METHODS,
  sanitizeContactUpdateBody,
} from './sanitize-body.mjs';

test('sanitizeContactUpdateBody drops unknown keys and truncates strings', () => {
  const result = sanitizeContactUpdateBody({
    fullName: 'Taylor Resident',
    extraField: 'ignore me',
    notes: 'n'.repeat(1200),
    locale: 'en',
    source: 'payment-panel',
  });

  assert.equal(result.fullName, 'Taylor Resident');
  assert.equal(result.notes.length, 1200);
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

test('sanitizeContactUpdateBody accepts billing assistance fields', () => {
  const result = sanitizeContactUpdateBody({
    fullName: 'Pat Resident',
    serviceAddress: '100 Main St',
    accountNumber: 'ACC-99',
    email: 'pat@example.com',
    phone: '719-555-0140',
    preferredContactMethod: 'email',
    notes: 'Billing question',
    consentToContact: true,
    locale: 'en',
    source: 'pay-bill-page',
  });

  assert.equal(result.accountNumber, 'ACC-99');
  assert.equal(result.preferredContactMethod, 'email');
  assert.equal(result.consentToContact, true);
  assert.equal(result.source, 'pay-bill-page');
});

test('sanitizeContactUpdateBody strips invalid preferredContactMethod', () => {
  const result = sanitizeContactUpdateBody({
    fullName: 'Test',
    preferredContactMethod: 'carrier-pigeon',
  });

  assert.equal(result.preferredContactMethod, undefined);
  assert.equal(PREFERRED_CONTACT_METHODS.has('email'), true);
});

test('sanitizeContactUpdateBody normalizes accountNumber characters', () => {
  const result = sanitizeContactUpdateBody({
    accountNumber: 'AB 12!@#',
  });

  assert.equal(result.accountNumber, 'AB12');
});
