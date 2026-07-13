import { describe, expect, it } from 'vitest';
import {
  applyPostNoticeAttachmentDefaults,
  CLERK_TASK_FORM_FIELDS,
  clerkTaskFormFields,
  clerkTaskHasForm,
  defaultDynamicFormValues,
  formValuesToMutationInput,
  recordToFormValues,
  todayDateInputValue,
} from './cms-clerk-task-form-fields';
import { CLERK_CMS_TASKS, clerkTaskHasInAppEditor } from './cms-clerk-tasks';

describe('cms-clerk-task-form-fields', () => {
  it('provides PrimeNG form fields for every generic in-app editor task', () => {
    for (const task of CLERK_CMS_TASKS) {
      if (!clerkTaskHasInAppEditor(task.id)) {
        expect(clerkTaskFormFields(task.id).length).toBe(0);
        continue;
      }
      expect(clerkTaskHasForm(task.id), `${task.id} should have a form`).toBe(true);
      expect(clerkTaskFormFields(task.id).length).toBeGreaterThan(0);
    }
  });

  it('includes SiteCopy fields for edit-site-copy', () => {
    const fields = clerkTaskFormFields('edit-site-copy');
    expect(fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['key', 'valueEn', 'valueEs', 'description', 'active']),
    );
  });

  it('includes announcement and homepage fields for in-app editors', () => {
    expect(clerkTaskFormFields('post-notice').map((field) => field.name)).toEqual(
      expect.arrayContaining(['title', 'detail', 'active']),
    );
    expect(clerkTaskFormFields('homepage').map((field) => field.name)).toEqual(
      expect.arrayContaining(['townName', 'heroImageUrl', 'welcomeHeading']),
    );
  });

  it('rejects ephemeral S3 hero URLs on save and allows clearing hero photo', () => {
    const fields = clerkTaskFormFields('homepage');
    expect(() =>
      formValuesToMutationInput(
        fields,
        {
          townName: 'Town of Wiley',
          heroImageUrl:
            'https://bucket.s3.amazonaws.com/x.jpg?X-Amz-Signature=abc&X-Amz-Credential=y',
        },
        'site-settings-1',
      ),
    ).toThrow(/temporary S3 link/i);

    const cleared = formValuesToMutationInput(
      fields,
      { townName: 'Town of Wiley', heroImageUrl: '' },
      'site-settings-1',
    );
    expect(cleared.heroImageUrl).toBeNull();
  });

  it('defaults checkbox fields to true and text fields to empty strings', () => {
    const values = defaultDynamicFormValues(CLERK_TASK_FORM_FIELDS['edit-site-copy']);
    expect(values.active).toBe(true);
    expect(values.key).toBe('');
    expect(values.valueEn).toBe('');
  });

  it('maps saved records back into form values', () => {
    const fields = clerkTaskFormFields('update-contacts');
    const values = recordToFormValues(fields, {
      id: 'town-information',
      label: 'Town Hall',
      value: '(719) 829-4974',
      detail: '304 Main Street',
    });
    expect(values.id).toBe('town-information');
    expect(values.label).toBe('Town Hall');
  });

  it('uses fileOrUrl for post-notice attachment field', () => {
    const pdfField = clerkTaskFormFields('post-notice').find(
      (field) => field.name === 'attachmentKey',
    );
    expect(pdfField?.type).toBe('fileOrUrl');
    expect(pdfField?.uploadValue).toBe('storageKey');
  });

  it('uses fileOrUrl hero upload on homepage with public URL result', () => {
    const heroField = clerkTaskFormFields('homepage').find(
      (field) => field.name === 'heroImageUrl',
    );
    expect(heroField?.type).toBe('fileOrUrl');
    expect(heroField?.uploadSectionId).toBe('cms-uploads/hero');
    expect(heroField?.uploadValue).toBe('publicUrl');
    expect(heroField?.accept).toContain('image/jpeg');
    const names = clerkTaskFormFields('homepage').map((field) => field.name);
    expect(names.indexOf('heroImageUrl')).toBeLessThan(names.indexOf('heroTitle'));
  });

  it('uses select kind and fileOrUrl PDF upload for post-notice', () => {
    const kindField = clerkTaskFormFields('post-notice').find(
      (field) => field.name === 'announcementKind',
    );
    const pdfField = clerkTaskFormFields('post-notice').find(
      (field) => field.name === 'attachmentKey',
    );
    expect(kindField?.type).toBe('select');
    expect(kindField?.options?.some((option) => option.value === 'newsletter')).toBe(true);
    expect(pdfField?.type).toBe('fileOrUrl');
    expect(pdfField?.uploadSectionId).toBe('newsletter');
  });

  it('prefills post-notice date on create and auto-sets newsletter kind when PDF is attached', () => {
    const values = defaultDynamicFormValues(clerkTaskFormFields('post-notice'), {
      taskId: 'post-notice',
    });
    expect(values.date).toBe(todayDateInputValue());
    const withPdf = applyPostNoticeAttachmentDefaults({
      ...values,
      attachmentKey: 'documents/newsletter/2026-06-09-town-newsletter.pdf',
    });
    expect(withPdf.announcementKind).toBe('newsletter');
  });

  it('builds mutation input with custom OfficialContact id on create', () => {
    const fields = clerkTaskFormFields('update-contacts');
    const input = formValuesToMutationInput(fields, {
      id: 'city-clerk',
      label: 'City Clerk',
      value: 'clerk@townofwiley.gov',
      detail: '304 Main Street',
      href: '',
      linkLabel: '',
      displayOrder: '',
    });
    expect(input.id).toBe('city-clerk');
    expect(input.label).toBe('City Clerk');
  });

  it('uses group dropdown and defaults for update-leadership', () => {
    const fields = clerkTaskFormFields('update-leadership');
    const groupField = fields.find((field) => field.name === 'groupId');
    expect(groupField?.type).toBe('select');
    expect(groupField?.options?.map((option) => option.value)).toEqual([
      'mayor-council',
      'town-administration',
    ]);
    expect(fields.some((field) => field.name === 'displayOrder')).toBe(false);

    const defaults = defaultDynamicFormValues(fields, { taskId: 'update-leadership' });
    expect(defaults.groupId).toBe('mayor-council');
  });
});
