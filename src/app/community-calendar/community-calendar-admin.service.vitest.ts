import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { StaffAuthService } from '../auth/staff-auth.service';
import { CommunityCalendarAdminService } from './community-calendar-admin.service';

describe('CommunityCalendarAdminService', () => {
  it('returns empty list when staff has no API bearer token', async () => {
    const http = { get: vi.fn(() => of({ events: [{ eventId: 'x' }] })) };
    TestBed.configureTestingModule({
      providers: [
        CommunityCalendarAdminService,
        { provide: HttpClient, useValue: http },
        {
          provide: StaffAuthService,
          useValue: {
            apiBearerToken: () => null,
          },
        },
      ],
    });

    const service = TestBed.inject(CommunityCalendarAdminService);
    const events = await firstValueFrom(service.listEvents());
    expect(events).toEqual([]);
    expect(http.get).not.toHaveBeenCalled();
  });
});
