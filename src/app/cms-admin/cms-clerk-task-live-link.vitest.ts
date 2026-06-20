import { describe, expect, it } from 'vitest';
import {
  buildClerkTaskHubLiveLink,
  buildClerkTaskLiveLink,
  TASKS_WITHOUT_LIVE_LINK,
} from './cms-clerk-task-live-link';

describe('buildClerkTaskLiveLink — URL wiring only (not save→public E2E)', () => {
  it('post-notice: short notice → /notices#notice-{sanitized id}', () => {
    expect(
      buildClerkTaskLiveLink({
        taskId: 'post-notice',
        savedId: 'abc 123!',
        formValues: { announcementKind: 'notice' },
      }),
    ).toBe('https://townofwiley.gov/notices#notice-abc-123');
  });

  it('post-notice: short notice with no kind → /notices#notice-{sanitized id}', () => {
    expect(buildClerkTaskLiveLink({ taskId: 'post-notice', savedId: 'short-1' })).toBe(
      'https://townofwiley.gov/notices#notice-short-1',
    );
  });

  it('post-notice: newsletter → /news#town-newsletter-heading', () => {
    expect(
      buildClerkTaskLiveLink({
        taskId: 'post-notice',
        savedId: 'unused-id-for-newsletter',
        formValues: { announcementKind: 'newsletter' },
      }),
    ).toBe('https://townofwiley.gov/news#town-newsletter-heading');
  });

  it('add-meeting → /meetings#event-{savedId}', () => {
    expect(buildClerkTaskLiveLink({ taskId: 'add-meeting', savedId: 'meeting-42' })).toBe(
      'https://townofwiley.gov/meetings#event-meeting-42',
    );
  });

  it('homepage (singleton) → /#site-hero-title regardless of savedId', () => {
    expect(buildClerkTaskLiveLink({ taskId: 'homepage' })).toBe(
      'https://townofwiley.gov/#site-hero-title',
    );
    expect(buildClerkTaskLiveLink({ taskId: 'homepage', savedId: 'site-settings' })).toBe(
      'https://townofwiley.gov/#site-hero-title',
    );
  });

  it('update-contacts → /contact#contact-{savedId}', () => {
    expect(buildClerkTaskLiveLink({ taskId: 'update-contacts', savedId: 'town-information' })).toBe(
      'https://townofwiley.gov/contact#contact-town-information',
    );
  });

  it('update-leadership mayor-council → /contact#leadership-row-mayor-council-{savedId}', () => {
    expect(
      buildClerkTaskLiveLink({
        taskId: 'update-leadership',
        savedId: 'roster-1',
        formValues: { groupId: 'mayor-council' },
      }),
    ).toBe('https://townofwiley.gov/contact#leadership-row-mayor-council-roster-1');
  });

  it('update-leadership town-administration → /contact#leadership-row-town-administration-{savedId}', () => {
    expect(
      buildClerkTaskLiveLink({
        taskId: 'update-leadership',
        savedId: 'roster-2',
        formValues: { groupId: 'town-administration' },
      }),
    ).toBe('https://townofwiley.gov/contact#leadership-row-town-administration-roster-2');
  });

  it('update-leadership unknown groupId → falls back to leadership-row-group-{savedId}', () => {
    expect(
      buildClerkTaskLiveLink({
        taskId: 'update-leadership',
        savedId: 'roster-3',
        formValues: { groupId: 'unknown-group' },
      }),
    ).toBe('https://townofwiley.gov/contact#leadership-row-group-roster-3');
  });

  it('business-directory → /businesses#business-{savedId}', () => {
    expect(buildClerkTaskLiveLink({ taskId: 'business-directory', savedId: 'biz-9' })).toBe(
      'https://townofwiley.gov/businesses#business-biz-9',
    );
  });

  it('external-news → /news#external-news-{savedId}', () => {
    expect(buildClerkTaskLiveLink({ taskId: 'external-news', savedId: 'ext-5' })).toBe(
      'https://townofwiley.gov/news#external-news-ext-5',
    );
  });

  it('emergency-banner (singleton) → /#site-alert-title', () => {
    expect(buildClerkTaskLiveLink({ taskId: 'emergency-banner' })).toBe(
      'https://townofwiley.gov/#site-alert-title',
    );
    expect(buildClerkTaskLiveLink({ taskId: 'emergency-banner', savedId: 'banner-1' })).toBe(
      'https://townofwiley.gov/#site-alert-title',
    );
  });

  it('edit-site-copy → /#top-tasks-heading', () => {
    expect(buildClerkTaskLiveLink({ taskId: 'edit-site-copy', savedId: 'topTasksHeading' })).toBe(
      'https://townofwiley.gov/#top-tasks-heading',
    );
  });

  it('manage-email-aliases → null (showPublicPreview=false)', () => {
    expect(
      buildClerkTaskLiveLink({ taskId: 'manage-email-aliases', savedId: 'alias-1' }),
    ).toBeNull();
    expect(TASKS_WITHOUT_LIVE_LINK.has('manage-email-aliases')).toBe(true);
  });

  it('falls back to section URL when savedId is empty for a per-record task', () => {
    expect(buildClerkTaskLiveLink({ taskId: 'add-meeting', savedId: '   ' })).toBe(
      'https://townofwiley.gov/meetings#calendar',
    );
    expect(buildClerkTaskLiveLink({ taskId: 'business-directory' })).toBe(
      'https://townofwiley.gov/businesses#business-directory-heading',
    );
  });
});

describe('buildClerkTaskHubLiveLink (task-hub section URLs)', () => {
  it.each([
    ['post-notice', 'https://townofwiley.gov/news#recent-town-notices-heading'],
    ['add-meeting', 'https://townofwiley.gov/meetings#calendar'],
    ['homepage', 'https://townofwiley.gov/#site-hero-title'],
    ['update-contacts', 'https://townofwiley.gov/contact#contact-administration'],
    ['update-leadership', 'https://townofwiley.gov/contact#leadership'],
    ['business-directory', 'https://townofwiley.gov/businesses#business-directory-heading'],
    ['external-news', 'https://townofwiley.gov/news#external-news-heading'],
    ['emergency-banner', 'https://townofwiley.gov/#site-alert-title'],
    ['edit-site-copy', 'https://townofwiley.gov/#top-tasks-heading'],
  ] as const)('%s → %s', (taskId, expected) => {
    expect(buildClerkTaskHubLiveLink(taskId)).toBe(expected);
  });

  it('manage-email-aliases → null (showPublicPreview=false)', () => {
    expect(buildClerkTaskHubLiveLink('manage-email-aliases')).toBeNull();
  });
});
