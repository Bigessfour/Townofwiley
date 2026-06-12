import { describe, expect, it } from 'vitest';
import {
    CLERK_CMS_TASKS,
    CLERK_VERIFY_STEPS,
    clerkTaskById,
    clerkTaskPreviewUrl,
    clerkTaskUsesDedicatedEditor,
} from './cms-clerk-tasks';

describe('cms-clerk-tasks', () => {
  it('defines clerk tasks with unique ids', () => {
    expect(CLERK_CMS_TASKS.length).toBeGreaterThanOrEqual(9);
    const ids = CLERK_CMS_TASKS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('builds preview URLs on townofwiley.gov', () => {
    expect(clerkTaskPreviewUrl('/news')).toBe('https://townofwiley.gov/news');
    expect(clerkTaskPreviewUrl('contact')).toBe('https://townofwiley.gov/contact');
  });

  it('includes Spanish content guidance on leadership tasks', () => {
    const roster = clerkTaskById('update-leadership');
    expect(roster?.fieldGlossary.some((f) => f.technicalName === 'lineEs')).toBe(true);
  });

  it('provides verify steps for clerks', () => {
    expect(CLERK_VERIFY_STEPS.length).toBeGreaterThanOrEqual(3);
    expect(CLERK_VERIFY_STEPS.join(' ')).toMatch(/hard-refresh/i);
  });

  it('defines manage-email-aliases as a dedicated editor task', () => {
    const task = clerkTaskById('manage-email-aliases');
    expect(task?.model).toBe('EmailAlias');
    expect(task?.icon).toBe('pi-envelope');
    expect(task?.showPublicPreview).toBe(false);
    expect(clerkTaskUsesDedicatedEditor('manage-email-aliases')).toBe(true);
  });
});
