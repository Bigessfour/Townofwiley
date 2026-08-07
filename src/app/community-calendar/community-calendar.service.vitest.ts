import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { CommunityCalendarService } from './community-calendar.service';
import type { CommunityEvent, CommunityEventSubmission } from './community-calendar.types';

const SAMPLE_EVENT: CommunityEvent = {
  eventId: 'evt-api-1',
  title: 'API Bake Sale',
  description: 'From the API',
  category: 'bake_sale',
  location: 'Main Street',
  startDateTime: '2099-08-01T16:00:00.000Z',
  endDateTime: '2099-08-01T20:00:00.000Z',
};

const SUBMISSION: CommunityEventSubmission = {
  title: 'Neighborhood Gathering',
  description: 'Block party',
  location: '100 Main Street',
  category: 'gathering',
  submitterName: 'Jane Resident',
  submitterPhone: '719-555-0100',
  submitterEmail: 'jane@example.com',
  startDateTime: '2099-09-01T18:00:00.000Z',
  language: 'en',
  website: '',
};

function setCalendarEndpoint(endpoint: string): void {
  const runtimeWindow = window as Window & {
    __TOW_RUNTIME_CONFIG__?: { communityCalendar?: { apiEndpoint?: string } };
    __TOW_RUNTIME_CONFIG_OVERRIDE__?: { communityCalendar?: { apiEndpoint?: string } };
  };
  runtimeWindow.__TOW_RUNTIME_CONFIG__ = {
    communityCalendar: { apiEndpoint: endpoint },
  };
  delete runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__;
}

describe('CommunityCalendarService', () => {
  afterEach(() => {
    const runtimeWindow = window as Window & {
      __TOW_RUNTIME_CONFIG__?: unknown;
      __TOW_RUNTIME_CONFIG_OVERRIDE__?: unknown;
    };
    delete runtimeWindow.__TOW_RUNTIME_CONFIG__;
    delete runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__;
  });

  it('reports unconfigured when apiEndpoint is empty', () => {
    setCalendarEndpoint('');
    TestBed.configureTestingModule({
      providers: [
        CommunityCalendarService,
        { provide: HttpClient, useValue: { get: vi.fn(), post: vi.fn() } },
      ],
    });
    const service = TestBed.inject(CommunityCalendarService);
    expect(service.isConfigured()).toBe(false);
    expect(service.apiEndpoint()).toBe('');
  });

  it('strips trailing slash from apiEndpoint when configured', () => {
    setCalendarEndpoint('https://example.lambda-url.us-east-2.on.aws/');
    TestBed.configureTestingModule({
      providers: [
        CommunityCalendarService,
        { provide: HttpClient, useValue: { get: vi.fn(), post: vi.fn() } },
      ],
    });
    const service = TestBed.inject(CommunityCalendarService);
    expect(service.isConfigured()).toBe(true);
    expect(service.apiEndpoint()).toBe('https://example.lambda-url.us-east-2.on.aws');
  });

  it('lists bundled seeds when not configured without calling HTTP', async () => {
    setCalendarEndpoint('');
    const http = { get: vi.fn(), post: vi.fn() };
    TestBed.configureTestingModule({
      providers: [CommunityCalendarService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CommunityCalendarService);
    const events = await firstValueFrom(service.listEvents());
    expect(http.get).not.toHaveBeenCalled();
    expect(events.some((e) => e.eventId.startsWith('tow-community-'))).toBe(true);
  });

  it('merges API events with bundled seeds when configured', async () => {
    setCalendarEndpoint('https://example.lambda-url.us-east-2.on.aws');
    const http = {
      get: vi.fn(() => of({ events: [SAMPLE_EVENT] })),
      post: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [CommunityCalendarService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CommunityCalendarService);
    const events = await firstValueFrom(service.listEvents());
    expect(http.get).toHaveBeenCalledWith(
      'https://example.lambda-url.us-east-2.on.aws/events',
    );
    expect(events.some((e) => e.eventId === 'evt-api-1')).toBe(true);
  });

  it('filters by category after merge', async () => {
    setCalendarEndpoint('https://example.lambda-url.us-east-2.on.aws');
    const http = {
      get: vi.fn(() => of({ events: [SAMPLE_EVENT] })),
      post: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [CommunityCalendarService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CommunityCalendarService);
    const events = await firstValueFrom(service.listEvents('bake_sale'));
    expect(http.get).toHaveBeenCalledWith(
      'https://example.lambda-url.us-east-2.on.aws/events?category=bake_sale',
    );
    expect(events.every((e) => e.category === 'bake_sale')).toBe(true);
  });

  it('falls back to bundled seeds when list HTTP fails', async () => {
    setCalendarEndpoint('https://example.lambda-url.us-east-2.on.aws');
    const http = {
      get: vi.fn(() => throwError(() => new Error('network'))),
      post: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [CommunityCalendarService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CommunityCalendarService);
    const events = await firstValueFrom(service.listEvents());
    expect(events.some((e) => e.eventId.startsWith('tow-community-'))).toBe(true);
  });

  it('posts submissions to /events when configured', async () => {
    setCalendarEndpoint('https://example.lambda-url.us-east-2.on.aws');
    const http = {
      get: vi.fn(),
      post: vi.fn(() => of({ ok: true, eventId: 'evt-new' })),
    };
    TestBed.configureTestingModule({
      providers: [CommunityCalendarService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CommunityCalendarService);
    const result = await firstValueFrom(service.submitEvent(SUBMISSION));
    expect(http.post).toHaveBeenCalledWith(
      'https://example.lambda-url.us-east-2.on.aws/events',
      SUBMISSION,
    );
    expect(result.eventId).toBe('evt-new');
  });

  it('throws when submit is attempted without configuration', () => {
    setCalendarEndpoint('');
    TestBed.configureTestingModule({
      providers: [
        CommunityCalendarService,
        { provide: HttpClient, useValue: { get: vi.fn(), post: vi.fn() } },
      ],
    });
    const service = TestBed.inject(CommunityCalendarService);
    expect(() => service.submitEvent(SUBMISSION)).toThrow(
      /Community calendar endpoint is not configured/,
    );
  });
});
