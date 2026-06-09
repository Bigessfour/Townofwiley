import { describe, expect, it } from 'vitest';
import { isNoticeDateStillVisible } from './cms-notice-visibility';

describe('isNoticeDateStillVisible', () => {
  const afternoonJune8 = Date.parse('2026-06-08T18:00:00-06:00');

  it('keeps same-day AWSDate notices visible through the local calendar day', () => {
    expect(isNoticeDateStillVisible('2026-06-08', afternoonJune8)).toBe(true);
  });

  it('hides AWSDate notices after that calendar day ends', () => {
    const morningJune9 = Date.parse('2026-06-09T08:00:00-06:00');
    expect(isNoticeDateStillVisible('2026-06-08', morningJune9)).toBe(false);
  });

  it('shows future dated notices', () => {
    expect(isNoticeDateStillVisible('2026-06-15', afternoonJune8)).toBe(true);
  });

  it('shows notices with no date', () => {
    expect(isNoticeDateStillVisible(undefined, afternoonJune8)).toBe(true);
    expect(isNoticeDateStillVisible('', afternoonJune8)).toBe(true);
  });
});
