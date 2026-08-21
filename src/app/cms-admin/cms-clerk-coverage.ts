import type { ClerkCmsTaskId } from './cms-clerk-tasks';

export type ClerkCoverageMethod = 'admin-task' | 'documents-section' | 'labels';

export interface ClerkCoverageRow {
  whatResidentsSee: string;
  whereOnSite: string;
  method: ClerkCoverageMethod;
  taskId?: ClerkCmsTaskId;
  adminHint: string;
}

/** Plain-language map for clerks: public content → how to change it on `/admin`. */
export const CLERK_COVERAGE_ROWS: readonly ClerkCoverageRow[] = [
  {
    whatResidentsSee: 'Homepage photo and welcome message',
    whereOnSite: 'Homepage',
    method: 'admin-task',
    taskId: 'homepage',
    adminHint: 'Edit content → save → See on website',
  },
  {
    whatResidentsSee: 'Emergency banner at top of site',
    whereOnSite: 'All pages when turned on',
    method: 'admin-task',
    taskId: 'emergency-banner',
    adminHint: 'Turn Enabled on and fill in the message',
  },
  {
    whatResidentsSee: 'Short public notices',
    whereOnSite: 'News page',
    method: 'admin-task',
    taskId: 'post-notice',
    adminHint: 'Choose short notice (not Newsletter)',
  },
  {
    whatResidentsSee: 'Town newsletter PDF and news items',
    whereOnSite: 'News page',
    method: 'admin-task',
    taskId: 'post-notice',
    adminHint: 'Choose Newsletter for a PDF',
  },
  {
    whatResidentsSee: 'Outside news links',
    whereOnSite: 'News page',
    method: 'admin-task',
    taskId: 'external-news',
    adminHint: 'Add the headline and link, then Save',
  },
  {
    whatResidentsSee: 'Meetings and events calendar',
    whereOnSite: 'Meetings page and homepage',
    method: 'admin-task',
    taskId: 'add-meeting',
    adminHint: 'Set the start date/time and Show on website',
  },
  {
    whatResidentsSee: 'Meeting agendas and approved minutes (PDFs)',
    whereOnSite: 'Meetings page',
    method: 'documents-section',
    taskId: 'upload-meeting-documents',
    adminHint: 'Add the meeting first, then upload the PDF',
  },
  {
    whatResidentsSee: 'Town Hall address, phone, and hours',
    whereOnSite: 'Contact page — visit card',
    method: 'admin-task',
    taskId: 'update-contact-page',
    adminHint: 'Choose Town Hall address, phone, and hours',
  },
  {
    whatResidentsSee: 'Town Administration names',
    whereOnSite: 'Contact page — staff table',
    method: 'admin-task',
    taskId: 'update-contact-page',
    adminHint: 'Choose Town Administration names',
  },
  {
    whatResidentsSee: 'Staff emails',
    whereOnSite: 'Contact page — email column',
    method: 'admin-task',
    taskId: 'update-contact-page',
    adminHint: 'Choose Staff emails',
  },
  {
    whatResidentsSee: 'Note under Town Administration',
    whereOnSite: 'Contact page — under the staff table',
    method: 'admin-task',
    taskId: 'update-contact-page',
    adminHint: 'Choose Note under Town Administration',
  },
  {
    whatResidentsSee: 'Mayor and Trustees',
    whereOnSite: 'Contact page — elected officials',
    method: 'admin-task',
    taskId: 'update-contact-page',
    adminHint: 'Choose Mayor and Trustees',
  },
  {
    whatResidentsSee: 'Business directory',
    whereOnSite: 'Businesses page',
    method: 'admin-task',
    taskId: 'business-directory',
    adminHint: 'Add or edit a business, then Save',
  },
  {
    whatResidentsSee: 'Menu labels and page headings',
    whereOnSite: 'Header menu and section titles',
    method: 'labels',
    taskId: 'edit-site-copy',
    adminHint: 'Pick the menu name or heading from the list',
  },
  {
    whatResidentsSee: 'Community events (yard sales, fundraisers, school events)',
    whereOnSite: 'Meetings page — community',
    method: 'admin-task',
    taskId: 'manage-community-calendar',
    adminHint: 'Approve pending submissions or add an event',
  },
];

export function clerkTaskTitleForModel(modelName: string | undefined): string | null {
  if (!modelName) {
    return null;
  }
  const map: Record<string, string> = {
    SiteSettings: 'Change homepage photo or welcome text',
    AlertBanner: 'Turn on emergency banner',
    Announcement: 'Post news or notice',
    Event: 'Add meeting or event',
    PublicDocument: 'Upload meeting agenda or minutes',
    OfficialContact: 'Update the Contact page',
    LeadershipRosterEntry: 'Update the Contact page',
    Business: 'Update business directory',
    ExternalNewsLink: 'External news links',
    SiteCopy: 'Change menu labels and page headings',
    ContactPage: 'Update the Contact page',
  };
  return map[modelName] ?? null;
}

export function clerkPlainOperationLabel(operation: string | undefined): string {
  switch ((operation ?? '').toUpperCase()) {
    case 'INSERT':
      return 'Added';
    case 'MODIFY':
      return 'Updated';
    case 'REMOVE':
      return 'Removed';
    default:
      return 'Changed';
  }
}
