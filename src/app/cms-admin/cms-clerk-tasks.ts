import { buildAmplifyConsoleDataManagerModelUrl } from '../clerk-setup/clerk-setup-config';

export type ClerkCmsTaskId =
  | 'post-notice'
  | 'add-meeting'
  | 'upload-meeting-documents'
  | 'homepage'
  | 'update-contact-page'
  | 'update-contacts'
  | 'update-leadership'
  | 'business-directory'
  | 'external-news'
  | 'emergency-banner'
  | 'edit-site-copy' // lightweight UI labels, nav, headings, top tasks (SiteCopy model)
  | 'manage-community-calendar';

export type ClerkCmsEditorMode = 'generic' | 'dedicated' | 'documents';

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
  /** PrimeIcons class shown on the task hub card (e.g. pi-envelope). */
  icon?: string;
  /** generic = record editor; dedicated = custom component; documents = meeting PDF upload section. */
  editorMode?: ClerkCmsEditorMode;
  /** Overrides the task card primary button (default: Edit content). */
  primaryActionLabel?: string;
  /** When false, hide "See on website" (mail-only / non-public tasks). */
  showPublicPreview?: boolean;
  /** Cognito groups that may open this task. Defaults to Staff-only when omitted. */
  requiredGroups?: string[];
  /** When false, keep the task for inner editors but hide it on the hub. Default true. */
  hubVisible?: boolean;
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
      'Click Edit content to open the in-app form (sign in at /admin/login first).',
      'Fill Title and Details (short summary for newsletters).',
      'For a scanned newsletter PDF: choose Kind = Newsletter, upload the PDF in the form (or paste the file code), set Date, and turn Show on website on.',
      'Save and hard-refresh the public News page.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Kind',
        technicalName: 'announcementKind',
        help: 'Short notice for bulletins on /news. Newsletter (PDF) for the embedded town newsletter on /news.',
      },
      {
        plainLabel: 'Newsletter PDF',
        technicalName: 'attachmentKey',
        help: 'Upload a PDF in the form or paste the storage file code, e.g. documents/newsletter/2026-06-09-town-newsletter.pdf.',
      },
      {
        plainLabel: 'Priority',
        technicalName: 'priority',
        help: 'Lower numbers show first among short notices (1 is highest priority).',
      },
      {
        plainLabel: 'Photo or web page',
        technicalName: 'imageUrl',
        help: 'Optional. A photo (.png, .jpg, .webp) shows on the card. An ArcGIS StoryMap or other webpage opens in a new tab and is not shown as a picture.',
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
      'Click Edit content to open the in-app form (sign in at /admin/login first).',
      'Enter Title, Start date and time, and turn Active on.',
      'Add Location and Description if residents need them.',
      'Save, then use Upload meeting agenda or minutes for the PDF (or Document publishing below).',
      'Hard-refresh /meetings and click View agenda on the meeting row to confirm the PDF opens.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Start',
        technicalName: 'start',
        help: 'Required. Use the date and time picker for when the meeting begins (ISO format in editor).',
      },
    ],
  },
  {
    id: 'upload-meeting-documents',
    title: 'Upload meeting agenda or minutes',
    shortDescription:
      'Attach a PDF to a meeting already on the calendar. Residents see it on /meetings.',
    model: 'PublicDocument',
    previewPath: '/meetings',
    editorMode: 'documents',
    primaryActionLabel: 'Open upload form',
    icon: 'pi pi-file-pdf',
    steps: [
      'Add the meeting first (Add meeting or event) if it is not on the calendar yet.',
      'Click Open upload form — the Document publishing section opens on this page.',
      'Choose the meeting from the list, pick the PDF, and upload.',
      'Hard-refresh /meetings and open View agenda or the documents archive to verify.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Meeting',
        technicalName: 'eventId',
        help: 'Select the calendar event this PDF belongs to.',
      },
      {
        plainLabel: 'PDF file',
        technicalName: 'file',
        help: 'Agenda before the meeting; approved minutes after.',
      },
    ],
    emptyStateMessage: 'Upload a PDF after at least one active meeting exists on the calendar.',
  },
  {
    id: 'homepage',
    title: 'Change homepage photo or welcome text',
    shortDescription: 'Update the big photo and welcome message on the Town homepage.',
    model: 'SiteSettings',
    previewPath: '/',
    supportsUpload: 'hero',
    steps: [
      'Click Edit content to open the in-app form (sign in at /admin/login first).',
      'Under Homepage hero photo, click Choose photo from this computer and pick a JPG, PNG, or WebP.',
      'Click Save, then open the homepage and hard-refresh (or wait about one minute for the public copy).',
      'Optional: paste a public https:// photo link instead of uploading, or update welcome text below the photo.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Homepage hero photo',
        technicalName: 'heroImageUrl',
        help: 'Choose a file from this computer (recommended) or paste a public https:// address. Leave blank to keep the default Town photo.',
      },
      {
        plainLabel: 'Welcome heading',
        technicalName: 'welcomeHeading',
        help: 'Main welcome headline on the homepage.',
      },
      {
        plainLabel: 'Town name',
        technicalName: 'townName',
        help: 'Official name, e.g. "Town of Wiley".',
      },
      {
        plainLabel: 'Office hours',
        technicalName: 'officeHours',
        help: 'e.g. "Monday–Friday 8am–5pm".',
      },
      {
        plainLabel: 'Address',
        technicalName: 'address',
        help: 'Physical address of Town Hall.',
      },
      {
        plainLabel: 'Phone',
        technicalName: 'phone',
        help: 'Main phone number.',
      },
      {
        plainLabel: 'Email',
        technicalName: 'email',
        help: 'Main contact email.',
      },
      {
        plainLabel: 'Page title',
        technicalName: 'pageTitle',
        help: 'Browser tab title, e.g. "Town of Wiley | Official Website".',
      },
      {
        plainLabel: 'Hero eyebrow',
        technicalName: 'heroEyebrow',
        help: 'Small text above the main hero title.',
      },
      {
        plainLabel: 'Hero status',
        technicalName: 'heroStatus',
        help: 'Optional status line in hero.',
      },
      {
        plainLabel: 'Hero title',
        technicalName: 'heroTitle',
        help: 'Large headline in the hero image area.',
      },
      {
        plainLabel: 'Hero message',
        technicalName: 'heroMessage',
        help: 'Main welcome paragraph.',
      },
      {
        plainLabel: 'Hero subtext',
        technicalName: 'heroSubtext',
        help: 'Smaller text below the message.',
      },
      {
        plainLabel: 'Welcome label',
        technicalName: 'welcomeLabel',
        help: 'Label above the welcome section.',
      },
      {
        plainLabel: 'Welcome body',
        technicalName: 'welcomeBody',
        help: 'Main body text in the welcome section.',
      },
      {
        plainLabel: 'Welcome caption',
        technicalName: 'welcomeCaption',
        help: 'Caption or credit under the welcome text.',
      },
    ],
    emptyStateMessage:
      'Homepage text may be using default setup until the homepage form is saved.',
  },
  {
    id: 'update-contact-page',
    title: 'Update the Contact page',
    shortDescription:
      'Change Town Hall visit info, staff names, staff emails, the note under the staff table, or Mayor and Trustees — pick the part that matches the live page.',
    model: 'ContactPage',
    previewPath: '/contact',
    editorMode: 'dedicated',
    primaryActionLabel: 'Choose what to change',
    icon: 'pi pi-users',
    requiredGroups: ['Staff', 'Council'],
    steps: [
      'Click Choose what to change.',
      'Pick the part of the Contact page you want to edit (Town Hall, staff names, staff emails, the note, or Mayor and Trustees).',
      'Change only that part, click Save, then See on website.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Town Hall address, phone, and hours',
        technicalName: 'town-hall',
        help: 'The visit card at the top of /contact.',
      },
      {
        plainLabel: 'Town Administration names',
        technicalName: 'admin-names',
        help: 'Clerk, Deputy Clerk, and Superintendent names in the staff table.',
      },
      {
        plainLabel: 'Staff emails',
        technicalName: 'staff-emails',
        help: 'The email column next to Clerk and Superintendent.',
      },
      {
        plainLabel: 'Note under Town Administration',
        technicalName: 'agenda-note',
        help: 'The extra paragraph under the staff table.',
      },
      {
        plainLabel: 'Mayor and Trustees',
        technicalName: 'elected',
        help: 'Names under Elected Officials.',
      },
    ],
  },
  {
    id: 'update-contacts',
    title: 'Staff emails and Contact page note',
    shortDescription:
      'Used from Update the Contact page. Edits Clerk/Superintendent emails and the note under the staff table.',
    model: 'OfficialContact',
    previewPath: '/contact',
    hubVisible: false,
    steps: [
      'Open Update the Contact page and pick Staff emails or Note under Town Administration.',
      'Edit the existing row. Do not add a new one unless the list is empty.',
      'Save, then See on website.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Card id (system)',
        technicalName: 'id',
        help: 'Only when adding a brand-new card. Use town-information, city-clerk, or town-superintendent. Existing cards lock this field so you cannot break the site by accident.',
      },
      {
        plainLabel: 'Label (display name)',
        technicalName: 'label',
        help: 'What residents see as the heading, e.g. "Town Information" or "City Clerk".',
      },
      {
        plainLabel: 'Value (main info)',
        technicalName: 'value',
        help: 'The key detail, like phone number (719) 829-4974 or email address.',
      },
      {
        plainLabel: 'Detail (extra info)',
        technicalName: 'detail',
        help: 'Extra text below the value, e.g. office description or street address.',
      },
      {
        plainLabel: 'Link URL (web address)',
        technicalName: 'href',
        help: 'mailto:, tel:, or https:// link. Example: mailto:clerk@townofwiley.gov.',
      },
      {
        plainLabel: 'Link text',
        technicalName: 'linkLabel',
        help: 'Clickable text for the link, e.g. the email address.',
      },
      {
        plainLabel: 'Display order',
        technicalName: 'displayOrder',
        help: 'Optional sort number (lower appears first).',
      },
    ],
    emptyStateMessage: 'Edit the existing Clerk or Superintendent row. Do not add a new one.',
  },
  {
    id: 'update-leadership',
    title: 'Staff and elected names',
    shortDescription:
      'Used from Update the Contact page. Edits Town Administration names or Mayor and Trustees.',
    model: 'LeadershipRosterEntry',
    previewPath: '/contact',
    hubVisible: false,
    requiredGroups: ['Staff', 'Council'],
    steps: [
      'Click Edit content (sign in at /admin/login first).',
      'Choose Elected Officials (Mayor & Council) or Town Administration from the list dropdown.',
      'Look at “Current order on the website”. To change an existing name (including Deputy Clerk), click Edit on that row — do not Add new unless the person is missing entirely.',
      'Update the English name line (role and name, e.g. Deputy City Clerk - Paige Lindo). Spanish is optional.',
      'Save, click See on website, and hard-refresh /contact to verify.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'List to update',
        technicalName: 'groupId',
        help: 'Elected Officials appear under Mayor and Trustees. Town Administration names appear in the staff table.',
      },
      {
        plainLabel: 'English line',
        technicalName: 'lineEn',
        help: 'One line residents see, e.g. "Deputy City Clerk - Paige Lindo" or "City Clerk - Deb Dillon".',
      },
      {
        plainLabel: 'Spanish line',
        technicalName: 'lineEs',
        help: 'Optional — English is copied automatically when Spanish is left blank.',
      },
      {
        plainLabel: 'Active',
        technicalName: 'active',
        help: 'Show or hide this entry on the public site.',
      },
    ],
    emptyStateMessage:
      'No roster rows yet — add names below after choosing Elected Officials or Town Administration.',
  },
  {
    id: 'business-directory',
    title: 'Update business directory',
    shortDescription: 'Add or edit businesses on the Business Directory page.',
    model: 'Business',
    previewPath: '/businesses',
    steps: [
      'Click Edit content to open the form and fill in the fields (sign in at /admin/login first).',
      'Create or edit a Business row in the form below and set Active on.',
      'Use display order to control sort order. Check /businesses after a hard refresh.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Name',
        technicalName: 'name',
        help: 'Business or organization name.',
      },
      {
        plainLabel: 'Phone',
        technicalName: 'phone',
        help: 'Phone number with area code.',
      },
      {
        plainLabel: 'Address',
        technicalName: 'address',
        help: 'Street address or location.',
      },
      {
        plainLabel: 'Website (URL)',
        technicalName: 'website',
        help: 'Full web address (https://...) if they have one.',
      },
      {
        plainLabel: 'Description',
        technicalName: 'description',
        help: 'Short note about what they do.',
      },
      {
        plainLabel: 'Image URL',
        technicalName: 'imageUrl',
        help: 'Optional photo link (https://...) for the listing.',
      },
      {
        plainLabel: 'Active',
        technicalName: 'active',
        help: 'Show or hide in the directory.',
      },
      {
        plainLabel: 'Display order',
        technicalName: 'displayOrder',
        help: 'Optional number to sort the list (lower first).',
      },
    ],
  },
  {
    id: 'external-news',
    title: 'Add outside news link',
    shortDescription: 'Link to a news story about Wiley or Prowers County on the News page.',
    model: 'ExternalNewsLink',
    previewPath: '/news',
    steps: [
      'Click Edit content to open the form and fill in the fields (sign in at /admin/login first).',
      'Create a row with title, url, and source in the form below and set Active on.',
      'Check /news after hard-refresh.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Title',
        technicalName: 'title',
        help: 'Headline of the news link.',
      },
      {
        plainLabel: 'URL (web address)',
        technicalName: 'url',
        help: 'Full link to the external article (https://...).',
      },
      {
        plainLabel: 'Source',
        technicalName: 'source',
        help: 'Where the news is from, e.g. "Prowers County News".',
      },
      {
        plainLabel: 'Active',
        technicalName: 'active',
        help: 'Show or hide this link.',
      },
      {
        plainLabel: 'Display order',
        technicalName: 'displayOrder',
        help: 'Optional number to sort the list.',
      },
    ],
  },
  {
    id: 'emergency-banner',
    title: 'Turn on emergency banner',
    shortDescription: 'Show an urgent message strip at the top of the homepage.',
    model: 'AlertBanner',
    previewPath: '/',
    steps: [
      'Click Edit content to open the in-app form (sign in at /admin/login first).',
      'Use one active banner at a time. Set Enabled on, fill label (short tag like "URGENT"), title, and detail.',
      'Optional button: set "Link label" (e.g. "Learn more") and "Link address" (full https:// URL).',
      'Save and check the homepage top strip. Hard-refresh after.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Enabled',
        technicalName: 'enabled',
        help: 'Turn the banner on or off. Only one should be enabled at a time.',
      },
      {
        plainLabel: 'Label (tag)',
        technicalName: 'label',
        help: 'Short bold tag at top of banner, e.g. "EMERGENCY" or "NOTICE".',
      },
      {
        plainLabel: 'Title',
        technicalName: 'title',
        help: 'Main headline of the banner message.',
      },
      {
        plainLabel: 'Detail (message)',
        technicalName: 'detail',
        help: 'The full text of the alert or notice.',
      },
      {
        plainLabel: 'Link label',
        technicalName: 'linkLabel',
        help: 'Text for the optional button, e.g. "More info" or "Register here".',
      },
      {
        plainLabel: 'Link address (URL)',
        technicalName: 'linkHref',
        help: 'Full web address (https://...) the button links to. Example: https://example.com/page',
      },
    ],
    emptyStateMessage: 'No emergency banner is showing until you turn Enabled on and save.',
  },
  {
    id: 'edit-site-copy',
    title: 'Change menu labels and page headings',
    shortDescription:
      'Change menu names and section headings. Town Hall address, phone, and hours are on Update the Contact page.',
    model: 'SiteCopy',
    previewPath: '/',
    steps: [
      'Click Edit content to open the form (sign in at /admin/login first).',
      'Pick which text to change from the list (menu name or heading).',
      'Fill English (required) and Spanish when residents use Spanish.',
      'Turn “Use this text on the live website” on, then Save.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Which text to change',
        technicalName: 'key',
        help: 'Pick the menu name or heading from the list. Town Hall address lives under Update the Contact page.',
      },
      {
        plainLabel: 'English text',
        technicalName: 'valueEn',
        help: 'The text residents see when the site is in English.',
      },
      {
        plainLabel: 'Spanish text',
        technicalName: 'valueEs',
        help: 'Optional Spanish version. If blank, English is used for both languages.',
      },
      {
        plainLabel: 'Description (for clerks)',
        technicalName: 'description',
        help: 'Where this text appears on the site (e.g. "Top of the How do I... section").',
      },
      {
        plainLabel: 'Active',
        technicalName: 'active',
        help: 'Only active rows override the default text.',
      },
    ],
    emptyStateMessage:
      'Labels are using the built-in defaults. Add a row here to change a menu name or heading.',
  },
  {
    id: 'manage-community-calendar',
    title: 'Manage community calendar',
    shortDescription:
      'Review resident submissions and publish community events on the Meetings calendar.',
    model: 'CommunityEvent',
    previewPath: '/meetings',
    icon: 'pi-calendar-plus',
    editorMode: 'dedicated',
    requiredGroups: ['Staff'],
    steps: [
      'Click Edit content to open the community calendar editor (sign in at /admin/login first).',
      'Filter by Pending to review resident submissions.',
      'Approve to publish on /meetings (community section), or Reject to keep it off the public calendar.',
      'Use Add event to create a community listing directly, or Edit / Delete to maintain existing ones.',
      'Hard-refresh /meetings#community to confirm the public list.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Status',
        technicalName: 'status',
        help: 'pending = awaiting review; approved = public; rejected = hidden.',
      },
      {
        plainLabel: 'Category',
        technicalName: 'category',
        help: 'yard_sale, bake_sale, school, fundraiser, and other community types.',
      },
      {
        plainLabel: 'Submitter email',
        technicalName: 'submitterEmail',
        help: 'Receives an email when you approve (not shown on the public calendar).',
      },
    ],
    emptyStateMessage: 'No community events yet. Residents can submit from /meetings#community.',
  },
];

export const CLERK_IN_APP_EDITOR_TASK_IDS = CLERK_CMS_TASKS.filter(
  (task) => (task.editorMode ?? 'generic') === 'generic',
).map((task) => task.id) as ClerkCmsTaskId[];

export function clerkTaskEditorMode(id: ClerkCmsTaskId): ClerkCmsEditorMode {
  return clerkTaskById(id)?.editorMode ?? 'generic';
}

export function clerkTaskHasInAppEditor(id: ClerkCmsTaskId): boolean {
  return clerkTaskEditorMode(id) === 'generic';
}

export function clerkTaskUsesDedicatedEditor(id: ClerkCmsTaskId): boolean {
  return clerkTaskEditorMode(id) === 'dedicated';
}

export function clerkTaskUsesDocumentsWorkflow(id: ClerkCmsTaskId): boolean {
  return clerkTaskEditorMode(id) === 'documents';
}

export function clerkTaskById(id: ClerkCmsTaskId): ClerkCmsTask | undefined {
  return CLERK_CMS_TASKS.find((task) => task.id === id);
}

export function clerkTaskVisibleOnHub(task: ClerkCmsTask): boolean {
  return task.hubVisible !== false;
}

export const CLERK_VERIFY_STEPS = [
  'Save your changes (in editor or the form).',
  'Open See on website (opens the live Town site).',
  'Hard-refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac).',
  'Still wrong? Call Town Hall at (719) 829-4974.',
] as const;
