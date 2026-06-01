import { describe, expect, it } from 'vitest';
import type { CmsPublicDocument } from '../site-cms-content';
import { localizeCmsPublicDocument } from './localize-public-document';

const baseDoc: CmsPublicDocument = {
  id: 'guide-1',
  title: 'English Title',
  titleEs: 'Titulo en espanol',
  summary: 'English summary',
  summaryEs: 'Resumen en espanol',
  sectionId: 'meeting-documents',
  status: 'Published',
  statusEs: 'Publicado',
  format: 'PDF',
  href: '/documents/guide.pdf',
  downloadFileName: 'guide.pdf',
  keywords: ['meeting'],
};

describe('localizeCmsPublicDocument', () => {
  it('uses English fields for en', () => {
    const localized = localizeCmsPublicDocument(baseDoc, 'en');
    expect(localized.title).toBe('English Title');
    expect(localized.summary).toBe('English summary');
    expect(localized.status).toBe('Published');
  });

  it('prefers Spanish fields for es when present', () => {
    const localized = localizeCmsPublicDocument(baseDoc, 'es');
    expect(localized.title).toBe('Titulo en espanol');
    expect(localized.summary).toBe('Resumen en espanol');
    expect(localized.status).toBe('Publicado');
  });

  it('falls back to English when Spanish fields are empty', () => {
    const localized = localizeCmsPublicDocument(
      { ...baseDoc, titleEs: '  ', summaryEs: undefined, statusEs: '' },
      'es',
    );
    expect(localized.title).toBe('English Title');
    expect(localized.summary).toBe('English summary');
    expect(localized.status).toBe('Published');
  });
});
