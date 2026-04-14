import { throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PaystarConnectionService, PaystarLaunchRequest } from './paystar-connection';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { LoggingService } from '../logging.service';
import testProviders from '../../test-providers';

describe('PaystarConnectionService error-to-mailbox flow', () => {
  const setup = () => {
    TestBed.configureTestingModule({
      providers: [
        ...testProviders,
        PaystarConnectionService,
        { provide: LoggingService, useValue: { log: vi.fn() } }
      ]
    });

    const service = TestBed.inject(PaystarConnectionService);
    const http = TestBed.inject(HttpClient);
    const logging = TestBed.inject(LoggingService);
    
    return { service, http, logging };
  };

  it('throws descriptive error on API failure', async () => {
    const { service, http, logging } = setup();
    vi.spyOn(service, 'getRuntimeConfig').mockReturnValue({ provider: 'paystar', portalUrl: '', mode: 'api', apiEndpoint: '/api/v1/paystar' });

    vi.spyOn(http, 'post').mockReturnValue(throwError(() => ({ 
      error: { message: 'Account not found' } 
    })));

    const request: PaystarLaunchRequest = {
      residentName: 'Wiley Resident',
      serviceAddress: '100 Broadway',
      preferredContact: '719-555-0199',
      locale: 'en',
      source: 'resident-services'
    };

    await expect(service.createLaunchRequest(request)).rejects.toThrow('Account not found');
    expect(logging.log).toHaveBeenCalledWith('error', expect.anything(), expect.anything());
  });

  it('throws default error message when API fails without detail', async () => {
    const { service, http } = setup();
    vi.spyOn(service, 'getRuntimeConfig').mockReturnValue({ provider: 'paystar', portalUrl: '', mode: 'api', apiEndpoint: '/api/v1/paystar' });

    vi.spyOn(http, 'post').mockReturnValue(throwError(() => new Error('Unknown')));

    await expect(service.createLaunchRequest({} as unknown as PaystarLaunchRequest)).rejects.toThrow('Unable to connect to Paystar');
  });
});
