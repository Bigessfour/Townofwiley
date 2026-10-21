import { describe, expect, it } from 'vitest';
import {
  matchAgendaNoteRecord,
  matchStaffEmailRecord,
  CONTACT_PAGE_SECTIONS,
  staffEmailRecordLabel,
} from './cms-contact-page-sections';

describe('cms-contact-page-sections', () => {
  it('names the five public /contact blocks', () => {
    expect(CONTACT_PAGE_SECTIONS.map((section) => section.id)).toEqual([
      'town-hall',
      'admin-names',
      'staff-emails',
      'agenda-note',
      'elected',
    ]);
  });

  it('matches staff email rows by stable id or clerk/superintendent label', () => {
    expect(matchStaffEmailRecord({ id: 'city-clerk', label: 'Anything' })).toBe(true);
    expect(matchStaffEmailRecord({ id: 'uuid-1', label: 'City Clerk' })).toBe(true);
    expect(matchStaffEmailRecord({ id: 'uuid-2', label: 'Town Information' })).toBe(false);
    expect(staffEmailRecordLabel({ id: 'city-clerk', label: 'Debbie' })).toBe('Clerk email');
  });

  it('matches the agenda note by town-information id or label', () => {
    expect(matchAgendaNoteRecord({ id: 'town-information', label: 'x' })).toBe(true);
    expect(matchAgendaNoteRecord({ id: 'uuid-9', label: 'Need time on the agenda' })).toBe(true);
    expect(
      matchAgendaNoteRecord({ id: 'uuid-8', label: 'Point of Contact for Official Town Business' }),
    ).toBe(true);
    expect(matchAgendaNoteRecord({ id: 'city-clerk', label: 'City Clerk' })).toBe(false);
  });

  it('points Town Hall edits at the visit card, not homepage headings', () => {
    const townHall = CONTACT_PAGE_SECTIONS.find((section) => section.id === 'town-hall');
    expect(townHall?.editorTaskId).toBe('edit-site-copy');
    expect(townHall?.editorOptions.liveSiteUrl).toContain('#contact-town-hall');
    expect(townHall?.editorOptions.useRecordLiveLink).toBe(false);
  });
});
