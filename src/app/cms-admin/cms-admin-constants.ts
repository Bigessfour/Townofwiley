export interface CmsAdminDocumentSection {
  label: string;
  sectionId: string;
  detail: string;
}

export const DOCUMENT_PUBLISHING_STEPS: string[] = [
  'Use Upload a meeting agenda or packet below for council agendas and approved minutes.',
  'For newsletter PDFs, use Post a notice with Kind = Newsletter (not PublicDocument).',
  'Save, open /meetings on the live site, and hard-refresh to confirm.',
];

export const DOCUMENT_SECTIONS: CmsAdminDocumentSection[] = [
  {
    label: 'Meeting Documents',
    sectionId: 'meeting-documents',
    detail:
      'Agenda packets linked to a meeting (via upload below) and approved minutes (keyword "minutes" helps clerks sort).',
  },
];

export const DOCUMENT_PUBLISHING_CHECKS: string[] = [
  'If the AppSync editor says access denied or not authorized, ask IT to fix your staff login or permissions first.',
  'Public records, budgets, and code documents are not published on the website — residents email clerk@townofwiley.gov.',
  'Use Add meeting or event for calendar dates on the Meetings page.',
];
