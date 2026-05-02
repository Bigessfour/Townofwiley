import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import testProviders from '../../test-providers';
import { LoggingService } from '../logging.service';
import { BillPayService } from './bill-pay.service';

vi.mock('./bill-pay-config', () => ({
  getBillPayRuntimeConfig: vi.fn(() => ({
    apiEndpoint: 'https://api.wiley.gov/api/v1/bill-pay-requests',
  })),
}));

beforeEach(async () => {
  const { getBillPayRuntimeConfig } = await import('./bill-pay-config');
  vi.mocked(getBillPayRuntimeConfig).mockReturnValue({
    apiEndpoint: 'https://api.wiley.gov/api/v1/bill-pay-requests',
  });
});

describe('BillPayService (Unit)', () => {
  const setup = () => {
    TestBed.configureTestingModule({
      providers: [
        ...testProviders,
        BillPayService,
        { provide: LoggingService, useValue: { log: vi.fn() } },
      ],
    });

    const service = TestBed.inject(BillPayService);
    const http = TestBed.inject(HttpClient);
    const logging = TestBed.inject(LoggingService);

    return { service, http, logging };
  };

  const samplePayload = {
    fullName: 'Test User',
    serviceAddress: '123 Main',
    accountNumber: 'ACC-1',
    email: 'test@example.com',
    phone: '555-1212',
    preferredContactMethod: 'email' as const,
    notes: 'Hello',
    consentToContact: true,
    locale: 'en' as const,
  };

  it('falls back to mailto outcome on API failure', async () => {
    const { service, http, logging } = setup();
    const postSpy = vi
      .spyOn(http, 'post')
      .mockReturnValue(throwError(() => new Error('Gateway timeout')));

    const result = await service.submitRequest(samplePayload);

    expect(result.outcome).toBe('api-failure-mailto');
    if (result.outcome !== 'api-success') {
      expect(result.href).toContain('mailto:deb.dillon@townofwiley.gov');
    }
    expect(postSpy).toHaveBeenCalled();
    expect(logging.log).toHaveBeenCalledWith(
      'warn',
      expect.stringContaining('Bill pay request API failed'),
      expect.anything(),
    );
  });

  it('immediately uses mailto if no apiEndpoint configured', async () => {
    const { service, http } = setup();
    const { getBillPayRuntimeConfig } = await import('./bill-pay-config');
    vi.mocked(getBillPayRuntimeConfig).mockReturnValue({ apiEndpoint: '' });

    const result = await service.submitRequest(samplePayload);
    expect(result.outcome).toBe('mailto');
    expect(vi.spyOn(http, 'post')).not.toHaveBeenCalled();
  });

  it('returns api-success when POST succeeds', async () => {
    const { service, http } = setup();
    vi.spyOn(http, 'post').mockReturnValue(of({}));

    const result = await service.submitRequest(samplePayload);

    expect(result.outcome).toBe('api-success');
  });
});
