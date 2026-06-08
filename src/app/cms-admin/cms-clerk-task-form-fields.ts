import type { ClerkCmsTaskId } from './cms-clerk-tasks';

export type ClerkFormFieldType = 'text' | 'textarea' | 'checkbox' | 'number';

export interface ClerkFormFieldDefinition {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  type?: ClerkFormFieldType;
  placeholder?: string;
}

/** Input fields clerks use for tasks without a dedicated hard-coded form. */
export const CLERK_TASK_FORM_FIELDS: Partial<Record<ClerkCmsTaskId, ClerkFormFieldDefinition[]>> = {
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
    { name: 'detail', label: 'Extra detail line', type: 'textarea' },
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

export function clerkTaskHasDynamicForm(taskId: ClerkCmsTaskId): boolean {
  return clerkTaskFormFields(taskId).length > 0;
}

export function defaultDynamicFormValues(
  fields: ClerkFormFieldDefinition[],
): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const field of fields) {
    values[field.name] = field.type === 'checkbox' ? true : '';
  }
  return values;
}
