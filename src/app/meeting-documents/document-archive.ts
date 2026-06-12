/** Public meeting documents sourced from CMS PublicDocument (meeting-documents section only). */
export type MeetingDocumentSectionId = 'meeting-documents';

export interface PublishedMeetingDocument {
  id: string;
  sectionId: MeetingDocumentSectionId;
  title: string;
  summary: string;
  status: string;
  updatedAt: string;
  format: string;
  href: string;
  downloadFileName: string;
  keywords: string[];
}
