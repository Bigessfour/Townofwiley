export interface CmsAdminDocumentSection {
  label: string;
  sectionId: string;
  detail: string;
}

export const DOCUMENT_PUBLISHING_STEPS: string[] = [
  'Click Edit content on a task card above (AppSync), or open the Content editor URL from Advanced (IT).',
  'Open PublicDocument and create or update a record (do not use the old in-page uploader).',
  'Use the exact section name from the table below.',
  'Save, open /documents on the live site, and hard-refresh to confirm.',
];

export const DOCUMENT_SECTIONS: CmsAdminDocumentSection[] = [
  {
    label: 'Meeting Documents',
    sectionId: 'meeting-documents',
    detail: 'Agenda packets, approved minutes, and other recurring meeting records.',
  },
  {
    label: 'Financial Documents',
    sectionId: 'financial-documents',
    detail: 'Budget summaries, annual reports, audits, and finance downloads.',
  },
  {
    label: 'Code & Zoning References',
    sectionId: 'code-references',
    detail: 'Ordinances, zoning references, permit guidance, and code lookups.',
  },
  {
    label: 'Records & Requests',
    sectionId: 'records-requests',
    detail: 'Records request forms, clerk follow-up files, and public records guidance.',
  },
  {
    label: 'Town Newsletter',
    sectionId: 'newsletter',
    detail:
      'Newsletter PDFs. Upload via the newsletter upload help on this page, then paste the file code into your Announcement (announcement kind = newsletter).',
  },
];

export const DOCUMENT_PUBLISHING_CHECKS: string[] = [
  'If the AppSync editor says access denied or not authorized, ask IT to fix your staff login or permissions first.',
  'Keep file details in PublicDocument so the website and database stay together.',
  'Use Add meeting or event for calendar dates on the Meetings page.',
];
