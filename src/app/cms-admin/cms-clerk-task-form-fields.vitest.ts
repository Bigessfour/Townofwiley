import { describe, expect, it } from 'vitest';
import {
  CLERK_TASK_FORM_FIELDS,
  clerkTaskFormFields,
  clerkTaskHasForm,
  defaultDynamicFormValues,
  formValuesToMutationInput,
  recordToFormValues,
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
});