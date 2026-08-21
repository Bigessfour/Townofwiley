import type { ClerkCmsTaskId } from './cms-clerk-tasks';

export type ClerkCoverageMethod = 'admin-task' | 'documents-section' | 'site-copy-task' | 'it-only';

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
    whereOnSite: '/',
    method: 'admin-task',
    taskId: 'homepage',
    adminHint: 'Edit content → save → See on website',
  },
  {
    whatResidentsSee: 'Emergency banner at top of site',
    whereOnSite: '/ (all pages when enabled)',
    method: 'admin-task',
    taskId: 'emergency-banner',
    adminHint: 'Turn Enabled on and fill in the message',
  },
  {
    whatResidentsSee: 'Short public notices',
    whereOnSite: '/news',
    method: 'admin-task',
    taskId: 'post-notice',
    adminHint: 'Kind = short notice (not Newsletter)',
  },
  {
    whatResidentsSee: 'Town newsletter PDF and news items',
    whereOnSite: '/news',
    method: 'admin-task',
    taskId: 'post-notice',
    adminHint: 'Kind = Newsletter for PDF; use External news task for outside links',
  },
  {
    whatResidentsSee: 'Outside news links',
    whereOnSite: '/news',
    method: 'admin-task',
    taskId: 'external-news',
    adminHint: 'Add link rows with Active on',
  },
  {
    whatResidentsSee: 'Meetings and events calendar',
    whereOnSite: '/meetings, homepage calendar',
    method: 'admin-task',
    taskId: 'add-meeting',
    adminHint: 'Set Start date/time and Active on',
  },
  {
    whatResidentsSee: 'Meeting agendas and approved minutes (PDFs)',
    whereOnSite: '/meetings',
    method: 'documents-section',
    taskId: 'upload-meeting-documents',
    adminHint: 'Pick the meeting, choose PDF, upload — after the event exists',
  },
  {
    whatResidentsSee: 'Town staff table + agenda note on /contact',
    whereOnSite: '/contact (administration card)',
    method: 'admin-task',
    taskId: 'update-contacts',
    adminHint: 'Edit existing Town Information / City Clerk / Town Superintendent cards — system id is locked while editing',
  },
  {
    whatResidentsSee: 'Town Hall address, phone, and hours (main card)',
    whereOnSite: '/contact (Town Hall card)',
    method: 'site-copy-task',
    taskId: 'edit-site-copy',
    adminHint: 'SiteCopy keys contactTownHallAddress, contactTownHallPhone, contactTownHallHours, etc.',
  },
  {
    whatResidentsSee: 'Elected officials and administration name lists',
    whereOnSite: '/contact#leadership',
    method: 'admin-task',
    taskId: 'update-leadership',
    adminHint: 'Choose list (Elected vs Administration), drag to reorder',
  },
  {
    whatResidentsSee: 'Business directory',
    whereOnSite: '/businesses',
    method: 'admin-task',
    taskId: 'business-directory',
    adminHint: 'Add businesses with Active on',
  },
  {
    whatResidentsSee: 'Menu labels, page headings, Town Hall card text',
    whereOnSite: 'Header nav, /contact, /news, homepage headings',
    method: 'site-copy-task',
    taskId: 'edit-site-copy',
    adminHint: 'Use stable keys from the key list in the task help (English + Spanish)',
  },
  {
    whatResidentsSee: 'Community events (yard sales, fundraisers, school events)',
    whereOnSite: '/meetings#community',
    method: 'admin-task',
    taskId: 'manage-community-calendar',
    adminHint: 'Approve pending submissions or add/edit community events',
  },
  {
    whatResidentsSee: 'Pay utility bill links',
    whereOnSite: '/pay-bill',
    method: 'it-only',
    adminHint: 'Town IT updates payment settings and redeploys — not CMS',
  },
  {
    whatResidentsSee: 'Weather page and text alerts signup',
    whereOnSite: '/weather',
    method: 'it-only',
    adminHint: 'Town IT — not CMS',
  },
  {
    whatResidentsSee: 'Privacy and terms pages',
    whereOnSite: '/privacy, /terms',
    method: 'it-only',
    adminHint: 'Town IT / code update — not CMS',
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
    OfficialContact: 'Update administration contacts',
    LeadershipRosterEntry: 'Update elected officials & administration lists',
    Business: 'Update business directory',
    ExternalNewsLink: 'External news links',
    SiteCopy: 'Homepage & menu labels (SiteCopy)',
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
