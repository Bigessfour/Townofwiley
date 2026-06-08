import { describe, expect, it } from 'vitest';
import {
  CLERK_CMS_TASKS,
  CLERK_VERIFY_STEPS,
  clerkTaskById,
  clerkTaskPreviewUrl,
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

  it('includes Spanish content guidance on document and leadership tasks', () => {
    const doc = clerkTaskById('add-document');
    const roster = clerkTaskById('update-leadership');
    expect(doc?.steps.some((s) => /Spanish/i.test(s))).toBe(true);
    expect(roster?.fieldGlossary.some((f) => f.technicalName === 'lineEs')).toBe(true);
  });

  it('provides verify steps for clerks', () => {
    expect(CLERK_VERIFY_STEPS.length).toBeGreaterThanOrEqual(3);
    expect(CLERK_VERIFY_STEPS.join(' ')).toMatch(/hard-refresh/i);
  });
});
