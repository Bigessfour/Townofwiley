import { isEphemeralCmsAssetUrl } from '../cms-public-asset-url';
import { LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL } from '../leadership-roster-group-ids';
import { LEADERSHIP_GROUP_FORM_OPTIONS } from '../leadership-roster-seed';
import {
  datetimeLocalToIso,
  isoToDateInput,
  isoToDatetimeLocal,
} from './cms-clerk-datetime-fields';
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
    { name: 'title', label: 'Title', required: true },
    { name: 'detail', label: 'Detail / Message', type: 'textarea', required: true },
    {
      name: 'date',
      label: 'Date',
      type: 'date',
      help: 'The date residents should see on the notice',
    },
    {
      name: 'announcementKind',
      label: 'Kind',
      type: 'select',
      options: [
        { value: '', label: 'Short notice (bulletin)' },
        { value: 'newsletter', label: 'Newsletter (PDF on /news)' },
      ],
      help: 'Choose Newsletter when publishing a scanned or digital town newsletter PDF.',
    },
    {
      name: 'attachmentKey',
      label: 'Newsletter PDF',
      type: 'fileOrUrl',
      accept: 'application/pdf',
      uploadSectionId: 'newsletter',
      uploadValue: 'storageKey',
      help: 'Upload a PDF or paste the storage file code (documents/newsletter/…).',
    },
    { name: 'priority', label: 'Priority (number)', type: 'number', help: '1 is highest' },
    { name: 'imageUrl', label: 'Image URL (https://)' },
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
    { name: 'townName', label: 'Town Name', required: true },
    {
      name: 'heroImageUrl',
      label: 'Homepage hero photo',
      type: 'fileOrUrl',
      accept: 'image/jpeg,image/png,image/webp,image/gif',
      uploadSectionId: 'cms-uploads/hero',
      uploadValue: 'publicUrl',
      placeholder: 'https://townofwiley.gov/media/cms/hero/your-photo.webp',
      help: 'Choose a photo from this computer (recommended). Wait for the web address to fill in as https://townofwiley.gov/media/cms/hero/… — then click Save. Temporary S3 links are rejected. Leave blank for the default Town photo.',
    },
    { name: 'heroTitle', label: 'Hero Title' },
    { name: 'heroMessage', label: 'Hero Message', type: 'textarea' },
    { name: 'heroSubtext', label: 'Hero subtext' },
    { name: 'heroEyebrow', label: 'Hero eyebrow' },
    { name: 'heroStatus', label: 'Hero status' },
    { name: 'welcomeLabel', label: 'Welcome label' },
    { name: 'welcomeHeading', label: 'Welcome Heading' },
    { name: 'welcomeBody', label: 'Welcome Body', type: 'textarea' },
    { name: 'welcomeCaption', label: 'Welcome caption' },
    { name: 'officeHours', label: 'Office hours', placeholder: 'Monday–Friday 8am–5pm' },
    { name: 'address', label: 'Address' },
    { name: 'phone', label: 'Phone' },
    { name: 'email', label: 'Email' },
    { name: 'pageTitle', label: 'Page title (browser tab)' },
  ],
  'emergency-banner': [
    { name: 'label', label: 'Label (short badge)', required: true, placeholder: 'ALERT' },
    { name: 'title', label: 'Title', required: true },
    { name: 'detail', label: 'Detail / Message', type: 'textarea', required: true },
    { name: 'linkLabel', label: 'Link Label (optional)' },
    { name: 'linkHref', label: 'Link URL (full https://, optional)' },
    { name: 'enabled', label: 'Show banner on homepage', type: 'checkbox' },
  ],
  'update-contacts': [
    {
      name: 'id',
      label: 'Record id',
      required: true,
      placeholder: 'town-information or city-clerk',
    },
    { name: 'label', label: 'Label (display name)', required: true },
    { name: 'value', label: 'Phone, email, or main value', required: true },
    { name: 'detail', label: 'Extra detail line', type: 'textarea', required: true },
    { name: 'href', label: 'Link (optional https://)' },
    {
      name: 'linkLabel',
      label: 'Link text',
      help: 'Clickable text for the link, e.g. "Email us"',
    },
    { name: 'displayOrder', label: 'Sort order (number)', type: 'number' },
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
      label: 'Key (stable ID)',
      required: true,
      placeholder: 'topTasksKicker or topTasksHeading',
      help: 'Keys the website understands today: topTasksKicker and topTasksHeading ("How do I..." section). Other keys need IT to connect them first',
    },
    { name: 'valueEn', label: 'English text', required: true },
    { name: 'valueEs', label: 'Spanish text' },
    {
      name: 'description',
      label: 'Description (for clerks)',
      type: 'textarea',
      help: 'Where this text appears on the site',
    },
    { name: 'displayOrder', label: 'Sort order (number)', type: 'number' },
    { name: 'active', label: 'Show on website', type: 'checkbox' },
  ],
  'manage-email-aliases': [],
};

export function clerkTaskFormFields(taskId: ClerkCmsTaskId): ClerkFormFieldDefinition[] {
  return CLERK_TASK_FORM_FIELDS[taskId] ?? [];
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
