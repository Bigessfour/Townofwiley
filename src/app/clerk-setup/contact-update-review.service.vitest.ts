import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import testProviders from '../../test-providers';
import { StaffAuthService } from '../auth/staff-auth.service';
import { ContactUpdateReviewService } from './contact-update-review.service';

type RuntimeWindow = Window & {
  __TOW_RUNTIME_CONFIG__?: {
    contactUpdate?: {
      reviewApiEndpoint?: string;
      reviewProxyEndpoint?: string;
    };
  };
};

describe('ContactUpdateReviewService', () => {
  let service: ContactUpdateReviewService;
  let httpTesting: HttpTestingController;
  let staffAuth: {
    refreshSession: ReturnType<typeof vi.fn>;
    accessToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    delete (window as RuntimeWindow).__TOW_RUNTIME_CONFIG__;
    delete (window as RuntimeWindow).__TOW_RUNTIME_CONFIG_OVERRIDE__;

    staffAuth = {
      refreshSession: vi.fn().mockResolvedValue(undefined),
      accessToken: vi.fn().mockReturnValue(null),
    };

    TestBed.configureTestingModule({
      providers: [...testProviders, { provide: StaffAuthService, useValue: staffAuth }],
    });
    service = TestBed.inject(ContactUpdateReviewService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('returns ok with data on successful GET to default proxy path', async () => {
    const promise = service.getAllUpdates();
    const req = httpTesting.expectOne('/api/contact-updates-review');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: '1',
        timestamp: '2026-01-01T00:00:00.000Z',
        fullName: 'A',
        serviceAddress: '',
        source: 'test',
        locale: 'en',
      },
    ]);
    const result = await promise;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
    }
  });

  it('returns ok false with error message on HTTP failure', async () => {
    const promise = service.getAllUpdates();
    const req = httpTesting.expectOne('/api/contact-updates-review');
    req.flush('denied', { status: 403, statusText: 'Forbidden' });
    const result = await promise;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('access denied');
    }
  });

  it('uses reviewApiEndpoint with Bearer token when configured', async () => {
    (window as RuntimeWindow).__TOW_RUNTIME_CONFIG__ = {
      contactUpdate: {
        reviewApiEndpoint: 'https://api.example/contact-updates',
      },
    };
    staffAuth.accessToken.mockReturnValue('staff-jwt');

    const promise = service.getAllUpdates();
    await Promise.resolve();
    expect(staffAuth.refreshSession).toHaveBeenCalled();

    const req = httpTesting.expectOne('https://api.example/contact-updates');
    expect(req.request.headers.get('Authorization')).toBe('Bearer staff-jwt');
    req.flush([]);
    const result = await promise;
    expect(result.ok).toBe(true);
  });

  it('returns ok false when review API returns a non-array body', async () => {
    (window as RuntimeWindow).__TOW_RUNTIME_CONFIG__ = {
      contactUpdate: {
        reviewApiEndpoint: 'https://api.example/contact-updates',
      },
    };
    staffAuth.accessToken.mockReturnValue('staff-jwt');

    const promise = service.getAllUpdates();
    await Promise.resolve();
    const req = httpTesting.expectOne('https://api.example/contact-updates');
    req.flush({ items: [] });
    const result = await promise;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('unexpected format');
    }
  });

  it('returns IT message when review API is a build placeholder', async () => {
    (window as RuntimeWindow).__TOW_RUNTIME_CONFIG__ = {
      contactUpdate: {
        reviewApiEndpoint: 'https://contact-review-not-deployed.townofwiley.local/contact-updates',
      },
    };

    const result = await service.getAllUpdates();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('CONTACT_UPDATE_REVIEW_API_URL');
    }
  });

  it('returns sign-in message when review API is configured but user has no token', async () => {
    (window as RuntimeWindow).__TOW_RUNTIME_CONFIG__ = {
      contactUpdate: {
        reviewApiEndpoint: 'https://api.example/contact-updates',
      },
    };

    const result = await service.getAllUpdates();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('/admin/login');
    }
    httpTesting.expectNone('https://api.example/contact-updates');
  });
});
