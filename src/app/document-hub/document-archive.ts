import { SiteLanguage } from '../site-language';

export type DocumentArchiveSectionId =
  | 'records-requests'
  | 'meeting-documents'
  | 'financial-documents'
  | 'code-references';

/** Shape used by the document hub UI and homepage search (sourced from CMS PublicDocument). */
export interface PublishedDocument {
  id: string;
  sectionId: DocumentArchiveSectionId;
  title: string;
  summary: string;
  status: string;
  updatedAt: string;
  format: string;
  href: string;
  downloadFileName: string;
  keywords: string[];
}

/**
 * @deprecated Public documents are loaded from AppSync PublicDocument only.
 * Retained as an empty manifest for backwards-compatible imports during migration.
 */
export const DOCUMENT_ARCHIVE: Record<SiteLanguage, PublishedDocument[]> = {
  en: [],
  es: [],
};
