import { describe, expect, it } from 'vitest';
import { sanitizeContactUpdateRequest } from './contact-update-sanitize';
import type { ContactUpdateRequest } from './contact-update.service';

function base(overrides: Partial<ContactUpdateRequest> = {}): ContactUpdateRequest {
  return {
    fullName: 'Jordan Resident',
    serviceAddress: '210 Main Street',
    poBox: 'PO 12',
    phone: '719-555-0102',
    email: 'jordan@example.com',
    notes: 'Please update mailing address.',
    locale: 'en',
    source: 'payment-panel',
    ...overrides,
  };
}

describe('sanitizeContactUpdateRequest', () => {
  it('strips NUL and control characters from text fields', () => {
    const result = sanitizeContactUpdateRequest(
      base({
        fullName: 'Bad\u0000Name',
        notes: 'line\u0007break',
      }),
    );

    expect(result.fullName).toBe('BadName');
    expect(result.notes).toBe('linebreak');
  });

  it('enforces max lengths on text fields', () => {
    const longName = 'n'.repeat(200);
    const longNotes = 'x'.repeat(1500);

    const result = sanitizeContactUpdateRequest(
      base({
        fullName: longName,
        notes: longNotes,
      }),
    );

    expect(result.fullName).toHaveLength(160);
    expect(result.notes).toHaveLength(1000);
  });

  it('defaults invalid locale to en and fixes source', () => {
    const result = sanitizeContactUpdateRequest(
      base({
        locale: 'fr' as ContactUpdateRequest['locale'],
        source: 'payment-panel',
      }),
    );

    expect(result.locale).toBe('en');
    expect(result.source).toBe('payment-panel');
  });

  it('preserves es locale when valid', () => {
    const result = sanitizeContactUpdateRequest(base({ locale: 'es' }));
    expect(result.locale).toBe('es');
  });
});
