import { buildAmplifyConsoleDataManagerModelUrl } from '../clerk-setup/clerk-setup-config';

export type ClerkCmsTaskId =
  | 'post-notice'
  | 'add-meeting'
  | 'homepage'
  | 'add-document'
  | 'update-contacts'
  | 'update-leadership'
  | 'business-directory'
  | 'external-news'
  | 'emergency-banner';

export interface ClerkCmsFieldGlossaryEntry {
  /** Label clerks see in Data Manager (technical name in parentheses for IT). */
  plainLabel: string;
  technicalName: string;
  help: string;
}

export interface ClerkCmsTask {
  id: ClerkCmsTaskId;
  title: string;
  shortDescription: string;
  model: string;
  /** Path on townofwiley.gov to verify changes. */
  previewPath: string;
  steps: string[];
  fieldGlossary: ClerkCmsFieldGlossaryEntry[];
  emptyStateMessage?: string;
  supportsUpload?: 'hero' | 'newsletter-pdf';
}

const PUBLIC_SITE_ORIGIN = 'https://townofwiley.gov';

export function clerkTaskPreviewUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${PUBLIC_SITE_ORIGIN}${normalized}`;
}

export function clerkTaskEditorUrl(
  region: string,
  appId: string,
  branch: string,
  model: string,
  fallbackUrl: string,
): string {
  return buildAmplifyConsoleDataManagerModelUrl(region, appId, branch, model, fallbackUrl);
}

export const CLERK_CMS_TASKS: ClerkCmsTask[] = [
  {
    id: 'post-notice',
    title: 'Post news or notice',
    shortDescription: 'Add a closure, reminder, or newsletter for residents on the News page.',
    model: 'Announcement',
    previewPath: '/news',
    steps: [
      'Click Edit content below. In the editor, open Announcement.',
      'Click Create, then fill in Title and Details (what happened, who is affected, dates).',
      'When the editor shows Spanish title or body fields, fill them so Spanish-speaking residents see the notice.',
      'Set Date to today or the notice date (YYYY-MM-DD).',
      'Turn Active on. For a short bulletin, leave Announcement kind blank.',
      'For a long Town newsletter with a PDF, set Announcement kind to newsletter and ask IT for a file code (see upload help on this page).',
      'Click Save, then use See on website and hard-refresh the page (Ctrl+Shift+R or Cmd+Shift+R on Mac).',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Announcement kind',
        technicalName: 'announcementKind',
        help: 'Leave blank for short notices. Type newsletter (lowercase) for the newsletter section on /news.',
      },
      {
        plainLabel: 'File code from IT',
        technicalName: 'attachmentKey',
        help: 'Only for newsletters. Paste the full path IT gives you, e.g. documents/newsletter/2026-05-newsletter.pdf — not a Google link.',
      },
      {
        plainLabel: 'Priority',
        technicalName: 'priority',
        help: 'Lower numbers show first among short notices (1 is highest priority).',
      },
    ],
  },
  {
    id: 'add-meeting',
    title: 'Add meeting or event',
    shortDescription: 'Show meetings and hearings on the Meetings page and homepage calendar.',
    model: 'Event',
    previewPath: '/meetings',
    steps: [
      'Click Edit content and open Event.',
      'Click Create. Enter Title, Start date and time, and turn Active on.',
      'Add Location and Description if residents need them.',
      'Save, then check See on website and hard-refresh.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Start',
        technicalName: 'start',
        help: 'Required. Use the date and time picker for when the meeting begins.',
      },
    ],
  },
  {
    id: 'homepage',
    title: 'Change homepage photo or welcome text',
    shortDescription: 'Update the big photo and welcome message on the Town homepage.',
    model: 'SiteSettings',
    previewPath: '/',
    supportsUpload: 'hero',
    steps: [
      'Usually there is only one SiteSettings row — open it (do not create extras unless IT asks).',
      'Update welcome text fields residents read on the homepage.',
      'For the photo: paste a Photo web address (https://…) from IT or from Upload homepage photo below.',
      'Save, then open the homepage and hard-refresh.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Photo web address',
        technicalName: 'heroImageUrl',
        help: 'Must start with https:// and open without logging in. Leave blank to keep the default Town photo.',
      },
      {
        plainLabel: 'Welcome heading',
        technicalName: 'welcomeHeading',
        help: 'Main welcome headline on the homepage.',
      },
    ],
    emptyStateMessage:
      'Homepage text may be using default setup until SiteSettings is saved in the editor.',
  },
  {
    id: 'add-document',
    title: 'Add a form or PDF',
    shortDescription: 'Publish a downloadable file on the Documents page.',
    model: 'PublicDocument',
    previewPath: '/documents',
    supportsUpload: 'newsletter-pdf',
    steps: [
      'Read the Document publishing section on this page for the correct section name.',
      'In the editor, open PublicDocument and create a record.',
      'Match the section name exactly, add title and summary, and set Active on.',
      'For Spanish residents, fill Title (Spanish) and Summary (Spanish) when those fields appear.',
      'Save, then check /documents and hard-refresh.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Section name',
        technicalName: 'sectionId',
        help: 'Must match the list in Document publishing on this page (e.g. meeting-documents).',
      },
    ],
    emptyStateMessage:
      'No documents in the editor yet — the site may still show setup guides until you add a PublicDocument.',
  },
  {
    id: 'update-contacts',
    title: 'Update Town Hall or clerk contact',
    shortDescription: 'Change phone, email, or labels on contact cards across the site.',
    model: 'OfficialContact',
    previewPath: '/contact',
    steps: [
      'Open OfficialContact in the editor.',
      'Find the row for Town Hall (id town-information) or City Clerk (id city-clerk). Do not change those id values unless IT helps.',
      'Update label, value, detail, and link fields. Save and check /contact.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Record id',
        technicalName: 'id',
        help: 'Keep town-information and city-clerk exactly — the website looks up these cards by id.',
      },
    ],
    emptyStateMessage:
      'If Town Hall or Clerk cards look wrong, ask IT to restore ids town-information and city-clerk.',
  },
  {
    id: 'update-leadership',
    title: 'Update mayor and council list',
    shortDescription: 'Change name bullets under Mayor and Council on the Contact page.',
    model: 'LeadershipRosterEntry',
    previewPath: '/contact',
    steps: [
      'Open LeadershipRosterEntry in the editor.',
      'For each person, create one row with groupId mayor-council or town-administration.',
      'Fill English line and Spanish line — residents who use Spanish on the site need the Spanish line.',
      'Set display order and Active on. Save and check /contact.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Group',
        technicalName: 'groupId',
        help: 'Use mayor-council or town-administration exactly.',
      },
      {
        plainLabel: 'English line',
        technicalName: 'lineEn',
        help: 'One bullet line in English.',
      },
      {
        plainLabel: 'Spanish line',
        technicalName: 'lineEs',
        help: 'Same bullet in Spanish for bilingual pages.',
      },
    ],
    emptyStateMessage:
      'No roster rows yet — the Contact page shows the default name list until you add rows here.',
  },
  {
    id: 'business-directory',
    title: 'Update business directory',
    shortDescription: 'Add or edit businesses on the Business Directory page.',
    model: 'Business',
    previewPath: '/businesses',
    steps: [
      'Open Business in the editor, create or edit a row, set Active on, and save.',
      'Use display order to control sort order. Check /businesses after a hard refresh.',
    ],
    fieldGlossary: [],
  },
  {
    id: 'external-news',
    title: 'Add outside news link',
    shortDescription: 'Link to a news story about Wiley or Prowers County on the News page.',
    model: 'ExternalNewsLink',
    previewPath: '/news',
    steps: [
      'Open ExternalNewsLink, create a row with title, url, and source, set Active on, save.',
      'Check /news after hard-refresh.',
    ],
    fieldGlossary: [],
  },
  {
    id: 'emergency-banner',
    title: 'Turn on emergency banner',
    shortDescription: 'Show an urgent message strip at the top of the homepage.',
    model: 'AlertBanner',
    previewPath: '/',
    steps: [
      'Open AlertBanner. Use one active banner at a time.',
      'Set Enabled on, fill label, title, and detail. Optional button: link label and link address (https://).',
      'Save and check the homepage.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Link address',
        technicalName: 'linkHref',
        help: 'Full https:// URL for the optional button — not link URL.',
      },
    ],
    emptyStateMessage:
      'No emergency banner is active until you create AlertBanner with Enabled on.',
  },
];

export function clerkTaskById(id: ClerkCmsTaskId): ClerkCmsTask | undefined {
  return CLERK_CMS_TASKS.find((task) => task.id === id);
}

export const CLERK_VERIFY_STEPS = [
  'Save your changes in the editor.',
  'Open See on website (opens the live Town site).',
  'Hard-refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac).',
  'Still wrong? Call Town Hall at (719) 829-4974.',
] as const;
