import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { StaffAuthService } from '../auth/staff-auth.service';
import { CommunityCalendarAdminService } from './community-calendar-admin.service';

function setCalendarEndpoint(endpoint: string): void {
  const runtimeWindow = window as Window & {
    __TOW_RUNTIME_CONFIG__?: { communityCalendar?: { apiEndpoint?: string } };
  };
  runtimeWindow.__TOW_RUNTIME_CONFIG__ = {
    communityCalendar: { apiEndpoint: endpoint },
  };
}

describe('CommunityCalendarAdminService', () => {
  afterEach(() => {
    const runtimeWindow = window as Window & { __TOW_RUNTIME_CONFIG__?: unknown };
    delete runtimeWindow.__TOW_RUNTIME_CONFIG__;
  });

  it('returns empty list when staff has no API bearer token', async () => {
    setCalendarEndpoint('https://example.lambda-url.us-east-2.on.aws');
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
    expect(service.isConfigured()).toBe(false);
    const events = await firstValueFrom(service.listEvents());
    expect(events).toEqual([]);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('lists admin events with bearer auth when configured', async () => {
    setCalendarEndpoint('https://example.lambda-url.us-east-2.on.aws');
    const http = {
      get: vi.fn(() => of({ events: [{ eventId: 'pending-1', status: 'pending' }] })),
      post: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        CommunityCalendarAdminService,
        { provide: HttpClient, useValue: http },
        {
          provide: StaffAuthService,
          useValue: {
            apiBearerToken: () => 'staff-token',
          },
        },
      ],
    });

    const service = TestBed.inject(CommunityCalendarAdminService);
    expect(service.isConfigured()).toBe(true);
    const events = await firstValueFrom(service.listEvents('pending'));
    expect(http.get).toHaveBeenCalled();
    const [url, options] = http.get.mock.calls[0] as [string, { headers: { get: (k: string) => string | null } }];
    expect(url).toBe('https://example.lambda-url.us-east-2.on.aws/admin/events?status=pending');
    expect(options.headers.get('Authorization')).toBe('Bearer staff-token');
    expect(events).toEqual([{ eventId: 'pending-1', status: 'pending' }]);
  });

  it('approves an event via admin mutate POST', async () => {
    setCalendarEndpoint('https://example.lambda-url.us-east-2.on.aws');
    const approved = { eventId: 'evt-1', status: 'approved', title: 'Approved' };
    const http = {
      get: vi.fn(),
      post: vi.fn(() => of({ ok: true, event: approved })),
    };
    TestBed.configureTestingModule({
      providers: [
        CommunityCalendarAdminService,
        { provide: HttpClient, useValue: http },
        {
          provide: StaffAuthService,
          useValue: {
            apiBearerToken: () => 'staff-token',
          },
        },
      ],
    });

    const service = TestBed.inject(CommunityCalendarAdminService);
    const event = await firstValueFrom(service.approveEvent('evt-1'));
    expect(http.post).toHaveBeenCalledWith(
      'https://example.lambda-url.us-east-2.on.aws/admin/events/evt-1/approve',
      {},
      expect.objectContaining({ headers: expect.anything() }),
    );
    expect(event).toEqual(approved);
  });
});
