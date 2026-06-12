import { describe, expect, it } from 'vitest';
import {
    buildAgendaHubHrefByEventId,
    buildLinkedAgendaDocumentByEventId,
    eventDocumentKeyword,
    formatMeetingDocumentTitle,
    readLinkedEventId,
} from './public-document-event-link';
import type { CmsPublicDocument } from './site-cms-content';

describe('public-document-event-link', () => {
  it('builds and reads event keywords', () => {
    expect(eventDocumentKeyword('evt-123')).toBe('event:evt-123');
    expect(readLinkedEventId(['meeting-documents', 'event:evt-123'])).toBe('evt-123');
  });

  it('maps linked meeting documents to document hub anchors', () => {
    const documents: CmsPublicDocument[] = [
      {
        id: 'doc-1',
        title: 'Council agenda',
        summary: 'Agenda packet',
        sectionId: 'meeting-documents',
        status: 'Published',
        format: 'PDF',
        href: 'storage:documents/meeting-documents/a.pdf',
        downloadFileName: 'a.pdf',
        keywords: ['meeting-documents', 'event:evt-1'],
      },
    ];

    expect(buildAgendaHubHrefByEventId(documents)).toEqual({
      'evt-1': '/meetings#cms-doc-doc-1',
    });
    expect(buildLinkedAgendaDocumentByEventId(documents)).toEqual({
      'evt-1': {
        documentId: 'doc-1',
        storageHref: 'storage:documents/meeting-documents/a.pdf',
      },
    });
  });

  it('prefers the newest linked document when multiple rows share an event id', () => {
    const documents: CmsPublicDocument[] = [
      {
        id: 'doc-old',
        title: 'Older agenda',
        summary: 'Old packet',
        sectionId: 'meeting-documents',
        status: 'Published',
        format: 'PDF',
        href: 'storage:documents/meeting-documents/old.pdf',
        downloadFileName: 'old.pdf',
        keywords: ['event:evt-1'],
      },
      {
        id: 'doc-new',
        title: 'Newer agenda',
        summary: 'New packet',
        sectionId: 'meeting-documents',
        status: 'Published',
        format: 'PDF',
        href: 'storage:documents/meeting-documents/new.pdf',
        downloadFileName: 'new.pdf',
        keywords: ['event:evt-1'],
      },
    ];

    expect(buildLinkedAgendaDocumentByEventId(documents)).toEqual({
      'evt-1': {
        documentId: 'doc-new',
        storageHref: 'storage:documents/meeting-documents/new.pdf',
      },
    });
  });

  it('formats meeting document titles with event dates', () => {
    expect(
      formatMeetingDocumentTitle('City Council Meeting', '2026-06-08T18:00:00.000Z', 'en-US'),
    ).toContain('City Council Meeting');
    expect(
      formatMeetingDocumentTitle('City Council Meeting', '2026-06-08T18:00:00.000Z', 'en-US'),
    ).toContain('Agenda');
  });
});
