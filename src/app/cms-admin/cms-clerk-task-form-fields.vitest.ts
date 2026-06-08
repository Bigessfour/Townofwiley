import { describe, expect, it } from 'vitest';
import {
  CLERK_TASK_FORM_FIELDS,
  clerkTaskFormFields,
  clerkTaskHasDynamicForm,
  defaultDynamicFormValues,
} from './cms-clerk-task-form-fields';
import { CLERK_CMS_TASKS } from './cms-clerk-tasks';

describe('cms-clerk-task-form-fields', () => {
  it('provides dynamic forms for every clerk task without a dedicated in-app editor', () => {
    const dynamicTaskIds = CLERK_CMS_TASKS.filter(
      (task) =>
        !['post-notice', 'add-meeting', 'homepage', 'emergency-banner'].includes(task.id),
    ).map((task) => task.id);

    for (const taskId of dynamicTaskIds) {
      expect(clerkTaskHasDynamicForm(taskId), `${taskId} should have a dynamic form`).toBe(true);
      expect(clerkTaskFormFields(taskId).length).toBeGreaterThan(0);
    }
  });

  it('includes SiteCopy fields for edit-site-copy', () => {
    const fields = clerkTaskFormFields('edit-site-copy');
    expect(fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['key', 'valueEn', 'valueEs', 'description', 'active']),
    );
  });

  it('includes document publishing metadata on add-document', () => {
    const fields = clerkTaskFormFields('add-document');
    expect(fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['downloadFileName', 'status', 'format', 'keywords']),
    );
  });

  it('defaults checkbox fields to true and text fields to empty strings', () => {
    const values = defaultDynamicFormValues(CLERK_TASK_FORM_FIELDS['edit-site-copy'] ?? []);
    expect(values.active).toBe(true);
    expect(values.key).toBe('');
    expect(values.valueEn).toBe('');
  });
});