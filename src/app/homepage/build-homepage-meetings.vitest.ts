import { describe, expect, it } from 'vitest';
import { APP_COPY } from '../app-copy';
import type { CmsCalendarEvent } from '../site-cms-content';
import { buildHomepageMeetings } from './build-homepage-meetings';

const LIVE_EVENT: CmsCalendarEvent = {
  id: 'evt-1',
  title: 'Special Council Session',
  start: '2026-06-01T18:00:00.000Z',
  end: '2026-06-01T19:00:00.000Z',
  description: 'Budget review',
  location: 'Town Hall',
};

describe('buildHomepageMeetings', () => {
  it('prefers live CMS events over seed rows', () => {
    const rows = buildHomepageMeetings(
      [LIVE_EVENT],
      APP_COPY.en.meetings,
      APP_COPY.en,
      'en-US',
      {},
      false,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe('Special Council Session');
    expect(rows[0]?.eventId).toBe('evt-1');
  });

  it('strips notices-seed navigation when the homepage already shows enough notices', () => {
    const noticesSeed = APP_COPY.en.meetings.find((row) => row.href === '/news');
    expect(noticesSeed).toBeTruthy();

    const rows = buildHomepageMeetings([], [noticesSeed!], APP_COPY.en, 'en-US', {}, false);
    expect(rows[0]?.href).toBeUndefined();
    expect(rows[0]?.cta).toBeUndefined();
    expect(rows[0]?.agendaButtonLabel).toBe(APP_COPY.en.meetingsDocumentsHubButtonLabel);
  });

  it('keeps notices-seed navigation when extra notices exist', () => {
    const noticesSeed = APP_COPY.en.meetings.find((row) => row.href === '/news');
    expect(noticesSeed).toBeTruthy();

    const rows = buildHomepageMeetings([], [noticesSeed!], APP_COPY.en, 'en-US', {}, true);
    expect(rows[0]?.href).toBe('/news');
  });
});
