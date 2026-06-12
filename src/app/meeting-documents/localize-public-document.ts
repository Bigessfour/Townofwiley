import type { CmsPublicDocument } from '../site-cms-content';
import type { SiteLanguage } from '../site-language';
import type { PublishedMeetingDocument } from './document-archive';

export function localizeCmsPublicDocument(
  doc: CmsPublicDocument,
  language: SiteLanguage,
): PublishedMeetingDocument {
  const useSpanish = language === 'es';
  return {
    id: doc.id,
    sectionId: 'meeting-documents',
    title: (useSpanish ? doc.titleEs?.trim() : '') || doc.title,
    summary: (useSpanish ? doc.summaryEs?.trim() : '') || doc.summary,
    status: (useSpanish ? doc.statusEs?.trim() : '') || doc.status,
    updatedAt: '',
    format: doc.format,
    href: doc.href,
    downloadFileName: doc.downloadFileName,
    keywords: doc.keywords,
  };
}
