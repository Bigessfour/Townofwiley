import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ContactUpdateReviewService } from './contact-update-review.service';
import testProviders from '../../test-providers';

describe('ContactUpdateReviewService', () => {
  let service: ContactUpdateReviewService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContactUpdateReviewService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('returns ok with data on successful GET', async () => {
    const promise = service.getAllUpdates();
    const req = httpTesting.expectOne('/api/contact-updates-review');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: '1', timestamp: '2026-01-01T00:00:00.000Z', fullName: 'A', serviceAddress: '', source: 'test', locale: 'en' }]);
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
});
