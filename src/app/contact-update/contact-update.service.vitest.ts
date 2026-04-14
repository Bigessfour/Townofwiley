import { throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContactUpdateService } from './contact-update.service';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { LoggingService } from '../logging.service';
import testProviders from '../../test-providers';

vi.mock('./contact-update-config', () => ({
  getContactUpdateRuntimeConfig: vi.fn(() => ({ apiEndpoint: 'https://api.wiley.gov/update' }))
}));

describe('ContactUpdateService (Unit)', () => {
  const setup = () => {
    TestBed.configureTestingModule({
      providers: [
        ...testProviders,
        ContactUpdateService,
        { provide: LoggingService, useValue: { log: vi.fn() } }
      ]
    });

    const service = TestBed.inject(ContactUpdateService);
    const http = TestBed.inject(HttpClient);
    const logging = TestBed.inject(LoggingService);
    
    return { service, http, logging };
  };

  it('falls back to mailto outcome on API failure', async () => {
    const { service, http, logging } = setup();
    const postSpy = vi.spyOn(http, 'post').mockReturnValue(throwError(() => new Error('Lambda timeout')));

    const request = {
      fullName: 'Test User',
      serviceAddress: '123 Main',
      poBox: '',
      phone: '555-1212',
      email: 'test@example.com',
      notes: '',
      locale: 'en' as const,
      source: 'payment-panel' as const,
    };

    const result = await service.submitUpdate(request, 'mailto:test@wiley.gov');

    expect(result.outcome).toBe('api-failure-mailto');
    if (result.outcome !== 'api-success') {
      expect(result.href).toBe('mailto:test@wiley.gov');
    }
    expect(postSpy).toHaveBeenCalled();
    expect(logging.log).toHaveBeenCalledWith('warn', expect.stringContaining('Lambda failed'), expect.anything());
  });

  it('immediately uses mailto if no apiEndpoint configured', async () => {
    const { service, http } = setup();
    const { getContactUpdateRuntimeConfig } = await import('./contact-update-config');
    vi.mocked(getContactUpdateRuntimeConfig).mockReturnValue({ apiEndpoint: '' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await service.submitUpdate({} as unknown as any, 'mailto:clerk@wiley.gov');
    expect(result.outcome).toBe('mailto');
    expect(vi.spyOn(http, 'post')).not.toHaveBeenCalled();
  });
});
