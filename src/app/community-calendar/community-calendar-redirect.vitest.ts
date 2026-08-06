import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { CommunityCalendarRedirect } from './community-calendar-redirect';

describe('CommunityCalendarRedirect', () => {
  it('navigates legacy /community-calendar to /meetings#community on init', () => {
    const navigateByUrl = vi.fn(() => Promise.resolve(true));
    TestBed.configureTestingModule({
      providers: [
        CommunityCalendarRedirect,
        { provide: Router, useValue: { navigateByUrl } },
      ],
    });

    const component = TestBed.inject(CommunityCalendarRedirect);
    component.ngOnInit();
    expect(navigateByUrl).toHaveBeenCalledWith('/meetings#community');
  });
});
