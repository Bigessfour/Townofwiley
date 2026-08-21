import { describe, expect, it } from 'vitest';
import {
  buildClerkTaskHubLiveLink,
  buildClerkTaskLiveLink,
  TASKS_WITHOUT_LIVE_LINK,
} from './cms-clerk-task-live-link';
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
    expect(clerkTaskPreviewUrl('/contact#leadership')).toBe(
      'https://townofwiley.gov/contact#leadership',
    );
  });

  it('includes Spanish content guidance on leadership tasks', () => {
    const roster = clerkTaskById('update-leadership');
    expect(roster?.fieldGlossary.some((f) => f.technicalName === 'lineEs')).toBe(true);
  });

  it('documents post-notice imageUrl as a photo or webpage', () => {
    const task = clerkTaskById('post-notice');
    const imageField = task?.fieldGlossary.find((f) => f.technicalName === 'imageUrl');
    expect(imageField?.help).toMatch(/StoryMap/i);
  });

  it('provides verify steps for clerks', () => {
    expect(CLERK_VERIFY_STEPS.length).toBeGreaterThanOrEqual(3);
    expect(CLERK_VERIFY_STEPS.join(' ')).toMatch(/hard-refresh/i);
  });

  it('defines manage-community-calendar as a dedicated editor task', () => {
    const task = clerkTaskById('manage-community-calendar');
    expect(task?.model).toBe('CommunityEvent');
    expect(task?.previewPath).toBe('/meetings');
    expect(clerkTaskUsesDedicatedEditor('manage-community-calendar')).toBe(true);
  });

  it('every task either opts out of the live-site link or has a hub URL', () => {
    for (const task of CLERK_CMS_TASKS) {
      const optedOut = task.showPublicPreview === false || TASKS_WITHOUT_LIVE_LINK.has(task.id);
      if (optedOut) {
        expect(buildClerkTaskHubLiveLink(task.id)).toBeNull();
        expect(buildClerkTaskLiveLink({ taskId: task.id })).toBeNull();
      } else {
        const url = buildClerkTaskHubLiveLink(task.id);
        expect(url, `Task ${task.id} must have a hub live-site URL`).not.toBeNull();
        expect(url).toMatch(/^https:\/\/townofwiley\.gov\//);
      }
    }
  });
});
