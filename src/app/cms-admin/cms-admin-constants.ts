export interface CmsAdminDocumentSection {
  label: string;
  sectionId: string;
  detail: string;
}

/** Short clerk guidance shown on demand from the admin page and task hub. */
export const CMS_CLERK_QUICK_HELP =
  'Pick a task and click Edit content. Save, then use See on website to check. Need help? Call Town Hall at (719) 829-4974.';

export const DOCUMENT_PUBLISHING_STEPS: string[] = [
  'Use the upload form below for council agendas and approved minutes.',
  'For newsletter PDFs, use Post a notice and choose Newsletter.',
  'Save, then open the Meetings page on the live site to confirm.',
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
  'If upload says you are not signed in, use Staff sign in at the top of this page.',
  'Public records, budgets, and code documents are not published on the website — residents email clerk@townofwiley.gov.',
  'Use Add meeting or event for calendar dates on the Meetings page.',
];
