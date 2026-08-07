/**
 * Symbol smoke + documentation of where behavior is proven.
 * Full UI/submit flows: e2e/specs/smoke/community-calendar.spec.ts
 * Live ops: GET /health + submit form on https://townofwiley.gov/meetings#community
 */
import { describe, expect, it } from 'vitest';
import { CommunityCalendarPanel, CommunityCalendarPage } from './community-calendar.page';

describe('CommunityCalendarPanel', () => {
  it('exports the meetings community panel (alias CommunityCalendarPage)', () => {
    expect(CommunityCalendarPanel).toBe(CommunityCalendarPage);
    expect(CommunityCalendarPanel.name).toBe('CommunityCalendarPanel');
  });
});
