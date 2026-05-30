import { describe, expect, it } from 'vitest';
import { buildContactUpdatePrintDocument } from './contact-update-report';
import type { ContactUpdateRecord } from './contact-update-review.service';

const labels = {
  title: 'Customer contact report',
  generatedLabel: 'Generated',
  recordCountLabel: 'Records',
  fields: {
    date: 'Date',
    fullName: 'Full name',
    serviceAddress: 'Service address',
    poBox: 'PO Box',
    accountNumber: 'Account #',
    phone: 'Phone',
    email: 'Email',
    preferredContact: 'Preferred contact',
    consent: 'Consent',
    notes: 'Notes',
    source: 'Source',
    language: 'Language',
  },
};

describe('buildContactUpdatePrintDocument', () => {
  it('includes billing fields in printable HTML', () => {
    const updates: ContactUpdateRecord[] = [
      {
        id: '1',
        timestamp: '2026-05-30T12:00:00.000Z',
        fullName: 'Pat Resident',
        serviceAddress: '100 Main St',
        accountNumber: 'ACC-1',
        phone: '719-555-0140',
        email: 'pat@example.com',
        preferredContactMethod: 'email',
        consentToContact: true,
        notes: 'Billing help',
        source: 'pay-bill-page',
        locale: 'en',
      },
    ];

    const html = buildContactUpdatePrintDocument(updates, labels);

    expect(html).toContain('Pat Resident');
    expect(html).toContain('ACC-1');
    expect(html).toContain('email');
    expect(html).toContain('Yes');
    expect(html).toContain('pay-bill-page');
  });
});
