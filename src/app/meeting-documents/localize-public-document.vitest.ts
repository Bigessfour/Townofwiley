import { describe, expect, it } from 'vitest';
import { localizeCmsPublicDocument } from './localize-public-document';
import type { CmsPublicDocument } from '../site-cms-content';

const DOC: CmsPublicDocument = {
  id: 'doc-1',
  title: 'June Agenda',
  titleEs: 'Agenda de junio',
  summary: 'Packet',
  summaryEs: 'Paquete',
  sectionId: 'meeting-documents',
  status: 'Published',
  statusEs: 'Publicado',
  format: 'PDF',
  href: '/docs/june.pdf',
  downloadFileName: 'june.pdf',
  keywords: ['agenda'],
};

describe('localizeCmsPublicDocument', () => {
  it('prefers English fields for en', () => {
    const localized = localizeCmsPublicDocument(DOC, 'en');
    expect(localized.title).toBe('June Agenda');
    expect(localized.summary).toBe('Packet');
    expect(localized.status).toBe('Published');
    expect(localized.sectionId).toBe('meeting-documents');
  });

  it('prefers Spanish fields for es when present', () => {
    const localized = localizeCmsPublicDocument(DOC, 'es');
    expect(localized.title).toBe('Agenda de junio');
    expect(localized.summary).toBe('Paquete');
    expect(localized.status).toBe('Publicado');
  });

  it('falls back to English when Spanish is blank', () => {
    const localized = localizeCmsPublicDocument(
      { ...DOC, titleEs: '   ', summaryEs: '', statusEs: undefined },
      'es',
    );
    expect(localized.title).toBe('June Agenda');
    expect(localized.summary).toBe('Packet');
    expect(localized.status).toBe('Published');
  });
});
