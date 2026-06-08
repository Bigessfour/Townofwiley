import { datetimeLocalToIso, isoToDateInput, isoToDatetimeLocal } from './cms-clerk-datetime-fields';
import type { ClerkCmsTaskId } from './cms-clerk-tasks';

export type ClerkFormFieldType =
  | 'text'
  | 'textarea'
  | 'checkbox'
  | 'number'
  | 'date'
  | 'datetime';

export interface ClerkFormFieldDefinition {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  type?: ClerkFormFieldType;
  placeholder?: string;
}

/** PrimeNG form fields for every clerk CMS task (create + edit via AppSync). */
export const CLERK_TASK_FORM_FIELDS: Record<ClerkCmsTaskId, ClerkFormFieldDefinition[]> = {
  'post-notice': [
    { name: 'title', label: 'Title', required: true },
    { name: 'detail', label: 'Detail / Message', type: 'textarea', required: true },
    { name: 'date', label: 'Date (YYYY-MM-DD)', type: 'date' },
    {
      name: 'announcementKind',
      label: 'Kind',
      placeholder: 'newsletter',
      help: 'Leave blank for short notices. Type newsletter for PDF posts.',
    },
    {
      name: 'attachmentKey',
      label: 'File code from IT',
      help: 'For newsletters only — paste the storage key from upload',
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
    { name: 'officeHours', label: 'Office hours', placeholder: 'Monday–Friday 8am–5pm' },
    { name: 'address', label: 'Address' },
    { name: 'phone', label: 'Phone' },
    { name: 'email', label: 'Email' },
    { name: 'pageTitle', label: 'Page title (browser tab)' },
    { name: 'heroEyebrow', label: 'Hero eyebrow' },
    { name: 'heroStatus', label: 'Hero status' },
    { name: 'heroTitle', label: 'Hero Title' },
    { name: 'heroMessage', label: 'Hero Message', type: 'textarea' },
    { name: 'heroSubtext', label: 'Hero subtext' },
    {
      name: 'heroImageUrl',
      label: 'Photo web address (https://)',
      help: 'Paste from Upload homepage photo above',
    },
    { name: 'welcomeLabel', label: 'Welcome label' },
    { name: 'welcomeHeading', label: 'Welcome Heading' },
    { name: 'welcomeBody', label: 'Welcome Body', type: 'textarea' },
    { name: 'welcomeCaption', label: 'Welcome caption' },
  ],
  'emergency-banner': [
    { name: 'label', label: 'Label (short badge)', required: true, placeholder: 'ALERT' },
    { name: 'title', label: 'Title', required: true },
    { name: 'detail', label: 'Detail / Message', type: 'textarea', required: true },
    { name: 'linkLabel', label: 'Link Label (optional)' },
    { name: 'linkHref', label: 'Link URL (full https://, optional)' },
    { name: 'enabled', label: 'Show banner on homepage', type: 'checkbox' },
  ],
  'add-document': [
    {
      name: 'sectionId',
      label: 'Section name',
      required: true,
      placeholder: 'e.g. meeting-documents',
    },
    { name: 'title', label: 'Title', required: true },
    { name: 'titleEs', label: 'Title (Spanish)' },
    { name: 'summary', label: 'Summary', type: 'textarea' },
    { name: 'summaryEs', label: 'Summary (Spanish)', type: 'textarea' },
    {
      name: 'href',
      label: 'Link or file address',
      help: 'Full https:// URL or storage key from an upload',
    },
    {
      name: 'downloadFileName',
      label: 'Download file name',
      help: 'Suggested name when someone downloads the file',
    },
    {
      name: 'status',
      label: 'Status',
      placeholder: 'Published',
      help: 'Usually "Published"',
    },
    { name: 'format', label: 'Format', placeholder: 'PDF' },
    {
      name: 'keywords',
      label: 'Keywords',
      help: 'Search tags, comma-separated',
    },
    { name: 'displayOrder', label: 'Sort order (number)', type: 'number' },
    { name: 'active', label: 'Show on website', type: 'checkbox' },
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
      label: 'Group',
      required: true,
      placeholder: 'mayor-council or town-administration',
    },
    { name: 'lineEn', label: 'Name line (English)', required: true },
    { name: 'lineEs', label: 'Name line (Spanish)' },
    { name: 'displayOrder', label: 'Sort order (number)', type: 'number' },
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
      placeholder: 'e.g. topTasksKicker, nav.services',
      help: 'Consistent key the site understands — ask IT for supported keys',
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

export function defaultDynamicFormValues(
  fields: ClerkFormFieldDefinition[],
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
    values[field.name] = '';
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
      continue;
    }
    if (field.name === 'id' && !editingId) {
      input['id'] = text;
      continue;
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