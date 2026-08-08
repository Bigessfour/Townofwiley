/**
 * Docs: community calendar / homepage “this week”
 * E2E: e2e/specs/smoke/community-calendar.spec.ts
 */
import { describe, expect, it } from 'vitest';
import { ThisWeekInWileyComponent } from './this-week-in-wiley.component';

describe('ThisWeekInWileyComponent', () => {
  it('exports the This week in Wiley surface', () => {
    expect(ThisWeekInWileyComponent.name).toBe('ThisWeekInWileyComponent');
  });
});
