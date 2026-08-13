import { buildAmplifyConsoleDataManagerModelUrl } from '../clerk-setup/clerk-setup-config';
import { SITE_COPY_KEY_CATALOG } from '../site-copy-overrides';

export type ClerkCmsTaskId =
  | 'post-notice'
  | 'add-meeting'
  | 'upload-meeting-documents'
  | 'homepage'
  | 'update-contacts'
  | 'update-leadership'
  | 'business-directory'
  | 'external-news'
  | 'emergency-banner'
  | 'edit-site-copy' // lightweight UI labels, nav, headings, top tasks (SiteCopy model)
  | 'manage-email-aliases'
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
        help: 'Short notice for bulletins on /news and /notices. Newsletter (PDF) for the embedded town newsletter on /news.',
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
      'Homepage text may be using default setup until SiteSettings is saved via Edit content.',
  },
  {
    id: 'update-contacts',
    title: 'Update administration contacts (not Town Hall card)',
    shortDescription:
      'Change clerk/superintendent mailto lines and Town Administration intro on /contact. For the main Town Hall address and phone card, use Homepage & menu labels.',
    model: 'OfficialContact',
    previewPath: '/contact',
    steps: [
      'Click Edit content to open the form and fill in the fields (sign in at /admin/login first).',
      'Find the row for Town Information (id town-information), City Clerk (id city-clerk), or Town Superintendent (id town-superintendent). Do not change those id values unless IT helps.',
      'Update label, value, detail, and mailto link fields in the form below.',
      'Save, click See on website, and hard-refresh /contact — check the Town Administration card.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Record id',
        technicalName: 'id',
        help: 'Keep town-information and city-clerk exactly — the website looks up these cards by id.',
      },
      {
        plainLabel: 'Label (display name)',
        technicalName: 'label',
        help: 'What residents see as the heading, e.g. "Town Hall" or "City Clerk".',
      },
      {
        plainLabel: 'Value (main info)',
        technicalName: 'value',
        help: 'The key detail, like phone number (719) 829-4974 or email address.',
      },
      {
        plainLabel: 'Detail (extra info)',
        technicalName: 'detail',
        help: 'Optional extra text below the value, e.g. "304 Main Street" or office hours.',
      },
      {
        plainLabel: 'Link URL (web address)',
        technicalName: 'href',
        help: 'Full web link starting with https:// that opens when clicked. Example: https://townofwiley.gov/contact. Leave blank if no clickable link.',
      },
      {
        plainLabel: 'Link text',
        technicalName: 'linkLabel',
        help: 'The clickable text for the link, e.g. "Email us" or "Visit website". Only needed if you set a Link URL above.',
      },
      {
        plainLabel: 'Display order',
        technicalName: 'displayOrder',
        help: 'Optional number to control sorting order (lower numbers appear first).',
      },
    ],
    emptyStateMessage:
      'If Town Hall or Clerk cards look wrong, ask IT to restore ids town-information and city-clerk.',
  },
  {
    id: 'update-leadership',
    title: 'Update elected officials & town administration lists',
    shortDescription:
      'Manage mayor/council names at /contact#leadership and town administration roster lines in the Town Administration card.',
    model: 'LeadershipRosterEntry',
    previewPath: '/contact',
    requiredGroups: ['Staff', 'Council'],
    steps: [
      'Click Edit content to open the form (sign in at /admin/login first).',
      'Choose Elected Officials (Mayor & Council) or Town Administration from the list dropdown.',
      'Review the current names shown below the dropdown — drag to reorder, or click Edit on a row to change or hide it.',
      'To add someone new, pick where they should appear, enter the English name line (role and name, e.g. Councilman: Ken Mooney), and optional Spanish.',
      'Save, click See on website, and hard-refresh /contact to verify both sections.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'List to update',
        technicalName: 'groupId',
        help: 'mayor-council (Elected Officials) or town-administration (Town Administration card).',
      },
      {
        plainLabel: 'English line',
        technicalName: 'lineEn',
        help: 'One bullet line in English, e.g. "Councilman: Ken Mooney" or "City Clerk: Deb Dillon".',
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
      'No roster rows yet — run the CMS seed script or add names below. Both Elected Officials and Town Administration lists are managed here.',
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
    emptyStateMessage:
      'No emergency banner is active until you create AlertBanner with Enabled on.',
  },
  {
    id: 'edit-site-copy',
    title: 'Homepage & menu labels (SiteCopy)',
    shortDescription:
      'Change menu text, page headings, and Town Hall card address/phone/hours without a code deploy.',
    model: 'SiteCopy',
    previewPath: '/',
    steps: [
      'Click Edit content to open the form (sign in at /admin/login first).',
      'Create or edit a row with a stable key from the key list in this help section (e.g. contactTownHallAddress, menuQuickTasksLabel).',
      'Fill English (required) and Spanish when residents use Spanish.',
      'Set Active on. Use description to note where the text appears.',
      'Save and hard-refresh the page where the text appears.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Key (stable ID)',
        technicalName: 'key',
        help: `Use one of the wired keys, for example: ${SITE_COPY_KEY_CATALOG.slice(0, 4)
          .map((e) => e.key)
          .join(', ')}, … (see full list below).`,
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
      'All labels are currently using built-in defaults. Add SiteCopy rows to let the clerk edit them directly.',
  },
  {
    id: 'manage-email-aliases',
    title: 'Manage email forwarding',
    shortDescription:
      'Control where mail sent to Town addresses (like clerk@townofwiley.gov) is delivered. Residents do not see this.',
    model: 'EmailAlias',
    previewPath: '/contact',
    icon: 'pi-envelope',
    editorMode: 'dedicated',
    showPublicPreview: false,
    requiredGroups: ['Staff'],
    steps: [
      'Click Edit content to open the email forwarding editor (sign in at /admin/login first).',
      'Click Add forwarding rule (or Edit an existing row).',
      'Town email address: e.g. steve.mckitrick@townofwiley.gov (you can type only steve.mckitrick).',
      'Staff inbox: the real mailbox where mail lands, e.g. example@example.com — not another @townofwiley.gov address.',
      'Leave Active on and Save. AWS picks up the rule on the next message; send a test to confirm.',
      'If residents should see the address on the site, also update Update contacts.',
    ],
    fieldGlossary: [
      {
        plainLabel: 'Town email address',
        technicalName: 'aliasAddress',
        help: 'The public address residents send mail to, e.g. clerk@townofwiley.gov.',
      },
      {
        plainLabel: 'Staff inbox',
        technicalName: 'destinationAddress',
        help: 'The private email where forwarded mail is delivered.',
      },
      {
        plainLabel: 'Active',
        technicalName: 'active',
        help: 'Turn on to forward mail; turn off to stop forwarding for this address.',
      },
      {
        plainLabel: 'Display name',
        technicalName: 'displayName',
        help: 'Optional label for clerks, e.g. "City Clerk mailbox".',
      },
      {
        plainLabel: 'Role label',
        technicalName: 'roleLabel',
        help: 'Optional role note for IT, e.g. "Clerk".',
      },
      {
        plainLabel: 'Notes',
        technicalName: 'notes',
        help: 'Optional internal notes about this forwarding rule.',
      },
    ],
    emptyStateMessage: 'No forwarding rules saved yet. Ask IT to add the first rule.',
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

export const CLERK_VERIFY_STEPS = [
  'Save your changes (in editor or the form).',
  'Open See on website (opens the live Town site).',
  'Hard-refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac).',
  'Still wrong? Call Town Hall at (719) 829-4974.',
] as const;
