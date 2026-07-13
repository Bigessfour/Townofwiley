import { isEphemeralCmsAssetUrl } from '../cms-public-asset-url';
import { LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL } from '../leadership-roster-group-ids';
import { LEADERSHIP_GROUP_FORM_OPTIONS } from '../leadership-roster-seed';
import {
  datetimeLocalToIso,
  isoToDateInput,
  isoToDatetimeLocal,
} from './cms-clerk-datetime-fields';
import { applyClerkTaskFieldLayout } from './cms-clerk-task-field-layout';
import type { ClerkCmsTaskId } from './cms-clerk-tasks';
import type { ClerkUploadFieldValue } from './cms-clerk-upload-field';

export type ClerkFormFieldType =
  | 'text'
  | 'textarea'
  | 'checkbox'
  | 'number'
  | 'date'
  | 'datetime'
  | 'fileOrUrl'
  | 'select';

export interface ClerkFormFieldOption {
  value: string;
  label: string;
}

export interface ClerkFormFieldDefinition {
  name: string;
  label: string;
  help?: string;
  /** Section heading in the record editor (plain English). */
  group?: string;
  /** Shown under the label — where residents will see this value. */
  previewHint?: string;
  /** Rendered inside “Optional fields” — safe to skip for routine edits. */
  optional?: boolean;
  required?: boolean;
  type?: ClerkFormFieldType;
  placeholder?: string;
  options?: ClerkFormFieldOption[];
  accept?: string;
  uploadSectionId?: string;
  /** After presigned upload: store S3 key (newsletter PDF) or public HTTPS URL (hero photo). */
  uploadValue?: ClerkUploadFieldValue;
}

/** PrimeNG form fields for every clerk CMS task (create + edit via AppSync). */
export const CLERK_TASK_FORM_FIELDS: Record<ClerkCmsTaskId, ClerkFormFieldDefinition[]> = {
  'post-notice': [
    {
      name: 'title',
      label: 'Notice headline (shown on /notices and /news)',
      required: true,
    },
    {
      name: 'detail',
      label: 'Notice message (body text residents read)',
      type: 'textarea',
      required: true,
    },
    {
      name: 'date',
      label: 'Date shown on the notice',
      type: 'date',
      help: 'The date residents see next to this notice.',
    },
    {
      name: 'announcementKind',
      label: 'Notice type',
      type: 'select',
      options: [
        { value: '', label: 'Short notice (bulletin)' },
        { value: 'newsletter', label: 'Newsletter (PDF on /news)' },
      ],
      help: 'Newsletter publishes the PDF on /news; short notices appear on /notices and /news lists.',
    },
    {
      name: 'attachmentKey',
      label: 'Newsletter PDF file',
      type: 'fileOrUrl',
      accept: 'application/pdf',
      uploadSectionId: 'newsletter',
      uploadValue: 'storageKey',
      help: 'Only for Newsletter type — upload a PDF or paste the storage file code (documents/newsletter/…).',
    },
    {
      name: 'priority',
      label: 'Sort order (lower number = higher on the list)',
      type: 'number',
      help: '1 appears before 2 among short notices.',
    },
    {
      name: 'imageUrl',
      label: 'Optional image web address (https://)',
      help: 'Rarely used — leave blank unless IT provided an image link.',
    },
    { name: 'active', label: 'Show on website', type: 'checkbox' },
  ],
  'add-meeting': [
    { name: 'title', label: 'Meeting or Event Title', required: true },
    {
      name: 'start',
      label: 'Start Date & Time',
      type: 'datetime',
      required: true,
      help: 'When the meeting begins',
    },
    { name: 'end', label: 'End Date & Time', type: 'datetime' },
    { name: 'location', label: 'Location', placeholder: 'Town Hall or Zoom link' },
    { name: 'description', label: 'Description or Details', type: 'textarea' },
    { name: 'active', label: 'Show on website', type: 'checkbox' },
  ],
  homepage: [
    {
      name: 'townName',
      label: 'Town name (browser tab and headings)',
      required: true,
    },
    {
      name: 'heroImageUrl',
      label: 'Large homepage photo (top of /)',
      type: 'fileOrUrl',
      accept: 'image/jpeg,image/png,image/webp,image/gif',
      uploadSectionId: 'cms-uploads/hero',
      uploadValue: 'publicUrl',
      placeholder: 'https://townofwiley.gov/media/cms/hero/your-photo.webp',
      help: 'Choose a photo from this computer (recommended). Wait for the web address to fill in as https://townofwiley.gov/media/cms/hero/… — then click Save. Temporary S3 links are rejected. Leave blank for the default Town photo.',
    },
    {
      name: 'heroTitle',
      label: 'Headline on the large photo',
      help: 'Short title over the hero image.',
    },
    {
      name: 'heroMessage',
      label: 'Message on the large photo',
      type: 'textarea',
      help: 'One or two sentences on the hero image.',
    },
    {
      name: 'heroSubtext',
      label: 'Small line under hero message (optional)',
    },
    {
      name: 'heroEyebrow',
      label: 'Tiny label above hero headline (optional)',
      help: 'Example: “Welcome to Wiley”.',
    },
    {
      name: 'heroStatus',
      label: 'Status line on hero (optional)',
      help: 'Example: “Town offices open today”.',
    },
    {
      name: 'welcomeLabel',
      label: 'Welcome section kicker (small label)',
    },
    {
      name: 'welcomeHeading',
      label: 'Welcome section main heading',
    },
    {
      name: 'welcomeBody',
      label: 'Welcome section paragraph',
      type: 'textarea',
    },
    {
      name: 'welcomeCaption',
      label: 'Caption under welcome text (optional)',
    },
    {
      name: 'officeHours',
      label: 'Office hours line on homepage (optional)',
      placeholder: 'Monday–Friday 8am–5pm',
    },
    {
      name: 'address',
      label: 'Address line on homepage (optional)',
      help: 'For the main Town Hall card on /contact, use SiteCopy keys instead.',
    },
    { name: 'phone', label: 'Phone line on homepage (optional)' },
    { name: 'email', label: 'Email line on homepage (optional)' },
    {
      name: 'pageTitle',
      label: 'Browser tab title for homepage',
    },
  ],
  'emergency-banner': [
    {
      name: 'label',
      label: 'Badge text (short word on the strip)',
      required: true,
      placeholder: 'ALERT',
    },
    {
      name: 'title',
      label: 'Alert headline (bold line)',
      required: true,
    },
    {
      name: 'detail',
      label: 'Alert details (longer message)',
      type: 'textarea',
      required: true,
    },
    {
      name: 'linkLabel',
      label: 'Button text (optional)',
      help: 'Only if you add a link below.',
    },
    {
      name: 'linkHref',
      label: 'Button link (full https://, optional)',
    },
    { name: 'enabled', label: 'Show emergency strip on site', type: 'checkbox' },
  ],
  'update-contacts': [
    {
      name: 'id',
      label: 'System id (do not change unless IT helps)',
      required: true,
      placeholder: 'town-information or city-clerk',
      help: 'town-information, city-clerk, or town-superintendent — the site looks up these exact ids.',
    },
    {
      name: 'label',
      label: 'Card heading residents see',
      required: true,
      help: 'Example: Town Information or City Clerk.',
    },
    {
      name: 'value',
      label: 'Main phone number or name line',
      required: true,
    },
    {
      name: 'detail',
      label: 'Extra sentence under the main line',
      type: 'textarea',
      required: true,
    },
    {
      name: 'href',
      label: 'Clickable link (tel:, mailto:, or https://)',
      help: 'Example: mailto:clerk@townofwiley.gov or tel:+17198294974',
    },
    {
      name: 'linkLabel',
      label: 'Clickable link text',
      help: 'What residents click, e.g. an email address.',
    },
    {
      name: 'displayOrder',
      label: 'Sort order among contact rows (number)',
      type: 'number',
    },
  ],
  'update-leadership': [
    {
      name: 'groupId',
      label: 'List to update',
      required: true,
      type: 'select',
      options: [...LEADERSHIP_GROUP_FORM_OPTIONS],
      help: 'Elected Officials appear at /contact#leadership. Town Administration lines appear in the Town Administration card.',
    },
    {
      name: 'lineEn',
      label: 'Name line (English)',
      required: true,
      help: 'Include role and name, e.g. Councilman: Ken Mooney or City Clerk: Deb Dillon.',
    },
    {
      name: 'lineEs',
      label: 'Name line (Spanish)',
      help: 'Optional — if left blank, English is copied automatically when saving.',
    },
    { name: 'active', label: 'Show on website', type: 'checkbox' },
  ],
  'business-directory': [
    { name: 'name', label: 'Business name', required: true },
    { name: 'phone', label: 'Phone' },
    { name: 'address', label: 'Address', type: 'textarea' },
    { name: 'website', label: 'Website (https://)' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'imageUrl', label: 'Image URL (https://)' },
    { name: 'displayOrder', label: 'Sort order (number)', type: 'number' },
    { name: 'active', label: 'Show on website', type: 'checkbox' },
  ],
  'external-news': [
    { name: 'title', label: 'Headline', required: true },
    { name: 'url', label: 'News link (https://)', required: true },
    { name: 'source', label: 'Source name (e.g. local paper)' },
    { name: 'displayOrder', label: 'Sort order (number)', type: 'number' },
    { name: 'active', label: 'Show on website', type: 'checkbox' },
  ],
  'edit-site-copy': [
    {
      name: 'key',
      label: 'Which site area this text controls (key)',
      required: true,
      placeholder: 'e.g. contactTownHallAddress or menuQuickTasksLabel',
      help: 'Must match a key from the list in task help — wrong keys save but do not change the site.',
    },
    {
      name: 'valueEn',
      label: 'English text residents see',
      required: true,
    },
    {
      name: 'valueEs',
      label: 'Spanish text residents see (optional)',
      help: 'Leave blank to use English for both languages.',
    },
    {
      name: 'description',
      label: 'Note for clerks (not shown on website)',
      type: 'textarea',
      help: 'Example: “Town Hall card phone on /contact”.',
    },
    {
      name: 'displayOrder',
      label: 'Sort order in admin lists (number)',
      type: 'number',
    },
    { name: 'active', label: 'Use this text on the live website', type: 'checkbox' },
  ],
  'manage-email-aliases': [],
  'upload-meeting-documents': [],
};

export function clerkTaskFormFields(taskId: ClerkCmsTaskId): ClerkFormFieldDefinition[] {
  const base = CLERK_TASK_FORM_FIELDS[taskId] ?? [];
  return applyClerkTaskFieldLayout(taskId, base);
}

export function clerkTaskHasForm(taskId: ClerkCmsTaskId): boolean {
  return clerkTaskFormFields(taskId).length > 0;
}

/** @deprecated Use clerkTaskHasForm */
export function clerkTaskHasDynamicForm(taskId: ClerkCmsTaskId): boolean {
  return clerkTaskHasForm(taskId);
}

export function todayDateInputValue(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function defaultDynamicFormValues(
  fields: ClerkFormFieldDefinition[],
  options?: { taskId?: ClerkCmsTaskId },
): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const field of fields) {
    if (field.type === 'checkbox') {
      values[field.name] = true;
      continue;
    }
    if (field.name === 'townName') {
      values[field.name] = 'Town of Wiley';
      continue;
    }
    if (options?.taskId === 'post-notice' && field.name === 'date') {
      values[field.name] = todayDateInputValue();
      continue;
    }
    if (options?.taskId === 'update-leadership' && field.name === 'groupId') {
      values[field.name] = LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL;
      continue;
    }
    values[field.name] = '';
  }
  return values;
}

export function applyPostNoticeAttachmentDefaults(
  values: Record<string, string | boolean>,
): Record<string, string | boolean> {
  const attachmentKey =
    typeof values['attachmentKey'] === 'string' ? values['attachmentKey'].trim() : '';
  const announcementKind =
    typeof values['announcementKind'] === 'string' ? values['announcementKind'].trim() : '';

  if (attachmentKey && !announcementKind) {
    return { ...values, announcementKind: 'newsletter' };
  }

  return values;
}

export function recordToFormValues(
  fields: ClerkFormFieldDefinition[],
  record: Record<string, unknown>,
): Record<string, string | boolean> {
  const values = defaultDynamicFormValues(fields);
  for (const field of fields) {
    const raw = record[field.name];
    if (field.type === 'checkbox') {
      values[field.name] = raw === true;
      continue;
    }
    if (raw == null) {
      continue;
    }
    if (field.name === 'keywords' && Array.isArray(raw)) {
      values[field.name] = raw.map(String).join(', ');
      continue;
    }
    if (field.type === 'datetime') {
      values[field.name] = isoToDatetimeLocal(String(raw));
      continue;
    }
    if (field.type === 'date') {
      values[field.name] = isoToDateInput(String(raw));
      continue;
    }
    values[field.name] = String(raw);
  }
  return values;
}

export function formValuesToMutationInput(
  fields: ClerkFormFieldDefinition[],
  raw: Record<string, string | boolean>,
  editingId?: string | null,
): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  if (editingId) {
    input['id'] = editingId;
  }

  for (const field of fields) {
    const value = raw[field.name];
    if (field.type === 'checkbox') {
      input[field.name] = value === true;
      continue;
    }
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) {
      if (field.required && !editingId) {
        throw new Error(`${field.label} is required.`);
      }
      // Allow clearing optional hero photo back to the site default.
      if (field.name === 'heroImageUrl' && editingId) {
        input[field.name] = null;
      }
      continue;
    }
    if (field.name === 'id' && !editingId) {
      input['id'] = text;
      continue;
    }
    if (field.uploadValue === 'publicUrl' || field.name === 'heroImageUrl') {
      if (isEphemeralCmsAssetUrl(text)) {
        throw new Error(
          `${field.label} cannot use a temporary S3 link. Choose the photo again from this computer, or clear the field and Save to use the default Town photo.`,
        );
      }
    }
    if (field.type === 'number') {
      const parsed = Number(text);
      if (Number.isNaN(parsed)) {
        throw new Error(`${field.label} must be a number.`);
      }
      input[field.name] = parsed;
    } else if (field.name === 'keywords') {
      input[field.name] = text
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean);
    } else if (field.type === 'datetime') {
      input[field.name] = datetimeLocalToIso(text);
    } else {
      input[field.name] = text;
    }
  }

  return input;
}
