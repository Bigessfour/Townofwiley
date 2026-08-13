import type { ClerkCmsTaskId } from './cms-clerk-tasks';
import type { ClerkFormFieldDefinition } from './cms-clerk-task-form-fields';
import { siteCopyAppearsOn } from '../site-copy-overrides';

type FieldLayoutPatch = Pick<ClerkFormFieldDefinition, 'group' | 'optional' | 'previewHint'>;

const CLERK_TASK_FIELD_LAYOUT: Partial<
  Record<ClerkCmsTaskId, Partial<Record<string, FieldLayoutPatch>>>
> = {
  'post-notice': {
    title: { group: 'Notice text', previewHint: 'Headline on /news' },
    detail: { group: 'Notice text' },
    date: { group: 'Notice text' },
    announcementKind: { group: 'Type & attachments' },
    attachmentKey: { group: 'Type & attachments' },
    priority: { group: 'Advanced', optional: true },
    imageUrl: { group: 'Advanced', optional: true },
    active: { group: 'Publish on website' },
  },
  'add-meeting': {
    title: { group: 'Meeting info', previewHint: '/meetings calendar and homepage' },
    start: { group: 'Meeting info' },
    end: { group: 'Meeting info', optional: true },
    location: { group: 'Meeting info' },
    description: { group: 'Details for residents' },
    active: { group: 'Publish on website' },
  },
  homepage: {
    townName: { group: 'Site title', previewHint: 'Browser tab and site name' },
    pageTitle: { group: 'Site title', optional: true },
    heroImageUrl: { group: 'Large homepage photo', previewHint: 'Top of townofwiley.gov' },
    heroTitle: { group: 'Large homepage photo' },
    heroMessage: { group: 'Large homepage photo' },
    heroSubtext: { group: 'Large homepage photo', optional: true },
    heroEyebrow: { group: 'Large homepage photo', optional: true },
    heroStatus: { group: 'Large homepage photo', optional: true },
    welcomeLabel: { group: 'Welcome section' },
    welcomeHeading: { group: 'Welcome section' },
    welcomeBody: { group: 'Welcome section' },
    welcomeCaption: { group: 'Welcome section', optional: true },
    officeHours: { group: 'Extra homepage lines', optional: true },
    address: { group: 'Extra homepage lines', optional: true },
    phone: { group: 'Extra homepage lines', optional: true },
    email: { group: 'Extra homepage lines', optional: true },
  },
  'emergency-banner': {
    label: { group: 'Alert message', previewHint: 'Top strip on all pages when enabled' },
    title: { group: 'Alert message' },
    detail: { group: 'Alert message' },
    linkLabel: { group: 'Optional button', optional: true },
    linkHref: { group: 'Optional button', optional: true },
    enabled: { group: 'Publish on website' },
  },
  'update-contacts': {
    id: { group: 'Which contact row', previewHint: '/contact Town Administration area' },
    label: { group: 'What residents see' },
    value: { group: 'What residents see' },
    detail: { group: 'What residents see' },
    href: { group: 'Optional link', optional: true },
    linkLabel: { group: 'Optional link', optional: true },
    displayOrder: { group: 'Advanced', optional: true },
  },
  'update-leadership': {
    groupId: { group: 'Which list', previewHint: '/contact elected or administration lists' },
    lineEn: { group: 'Name on the website' },
    lineEs: { group: 'Name on the website', optional: true },
    active: { group: 'Publish on website' },
  },
  'business-directory': {
    name: { group: 'Business info', previewHint: '/businesses directory' },
    phone: { group: 'Business info' },
    address: { group: 'Business info' },
    website: { group: 'Business info', optional: true },
    description: { group: 'Business info', optional: true },
    imageUrl: { group: 'Advanced', optional: true },
    displayOrder: { group: 'Advanced', optional: true },
    active: { group: 'Publish on website' },
  },
  'external-news': {
    title: { group: 'News link', previewHint: '/news external links section' },
    url: { group: 'News link' },
    source: { group: 'News link', optional: true },
    displayOrder: { group: 'Advanced', optional: true },
    active: { group: 'Publish on website' },
  },
  'edit-site-copy': {
    key: { group: 'Which text to change' },
    valueEn: { group: 'Text on the website' },
    valueEs: { group: 'Text on the website', optional: true },
    description: { group: 'Clerk notes', optional: true },
    displayOrder: { group: 'Advanced', optional: true },
    active: { group: 'Publish on website' },
  },
};

export function applyClerkTaskFieldLayout(
  taskId: ClerkCmsTaskId,
  fields: readonly ClerkFormFieldDefinition[],
): ClerkFormFieldDefinition[] {
  const patches = CLERK_TASK_FIELD_LAYOUT[taskId];
  if (!patches) {
    return [...fields];
  }

  return fields.map((field) => {
    const patch = patches[field.name];
    if (!patch) {
      return { ...field };
    }
    let previewHint = patch.previewHint;
    if (taskId === 'edit-site-copy' && field.name === 'key') {
      previewHint = 'Pick a key — appears-on hint updates after you type it';
    }
    return { ...field, ...patch, previewHint: previewHint ?? patch.previewHint };
  });
}

export function resolveFieldPreviewHint(
  taskId: ClerkCmsTaskId,
  field: ClerkFormFieldDefinition,
  formValues: Readonly<Record<string, string | boolean>>,
): string | null {
  if (field.previewHint) {
    return field.previewHint;
  }
  if (taskId === 'edit-site-copy' && field.name === 'key') {
    const key = String(formValues['key'] ?? '').trim();
    return siteCopyAppearsOn(key);
  }
  if (taskId === 'edit-site-copy' && (field.name === 'valueEn' || field.name === 'valueEs')) {
    const key = String(formValues['key'] ?? '').trim();
    const where = siteCopyAppearsOn(key);
    return where ? `Residents see this on: ${where}` : null;
  }
  return null;
}