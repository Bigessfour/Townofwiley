/**
 * Symbol smoke for clerk admin calendar UI.
 * Service CRUD proof: community-calendar-admin.service.vitest.ts
 * Backend proof: infrastructure/community-calendar/tests/test_app.py
 */
import { describe, expect, it } from 'vitest';
import { CmsCommunityCalendarAdminComponent } from './cms-community-calendar-admin.component';

describe('CmsCommunityCalendarAdminComponent', () => {
  it('exports the clerk community-calendar admin component', () => {
    expect(CmsCommunityCalendarAdminComponent.name).toBe('CmsCommunityCalendarAdminComponent');
  });
});
