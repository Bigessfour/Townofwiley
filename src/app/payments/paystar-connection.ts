import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LoggingService } from '../logging.service';
import { SiteLanguage } from '../site-language';
import { RuntimePaystarConfig, getPaystarRuntimeConfig } from './paystar-config';

export interface PaystarLaunchRequest {
  residentName: string;
  serviceAddress: string;
  accountNumber?: string;   // RMS utility account number
  amount?: number;          // bill amount in dollars; Lambda converts to cents
  preferredContact: string;
  accountQuestion?: string;
  locale: SiteLanguage;
  source: 'resident-services';
  dueDate?: string;         // YYYY-MM-DD
  invoiceNumber?: string;
  billSummary?: string;
}

export interface PaystarLaunchResponse {
  provider: 'paystar';
  mode: 'hosted' | 'api';
  launchUrl: string;
  referenceId?: string;
  expiresAt?: string;
}

@Injectable({ providedIn: 'root' })
export class PaystarConnectionService {
  private readonly http = inject(HttpClient);
  private readonly logging = inject(LoggingService);

  getRuntimeConfig(): RuntimePaystarConfig {
    return getPaystarRuntimeConfig();
  }

  async createLaunchRequest(request: PaystarLaunchRequest): Promise<PaystarLaunchResponse> {
    const runtimeConfig = this.getRuntimeConfig();

    if (runtimeConfig.mode === 'none') {
      throw new Error('Online payments are not configured yet. Please contact Town Hall.');
    }

    if (runtimeConfig.mode === 'hosted' && runtimeConfig.portalUrl) {
      this.logging.log('info', 'Paystar hosted portal launch', { source: request.source });
      return {
        provider: 'paystar',
        mode: 'hosted',
        launchUrl: runtimeConfig.portalUrl,
      };
    }

    if (runtimeConfig.mode !== 'api' || !runtimeConfig.apiEndpoint) {
      throw new Error('Online payment is not available right now.');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<PaystarLaunchResponse>(runtimeConfig.apiEndpoint, {
          ...request,
          amountInCents: request.amount !== undefined ? Math.round(request.amount * 100) : undefined,
        }),
      );
      this.logging.log('info', 'Paystar session created', { referenceId: response.referenceId });
      return response;
    } catch (err: unknown) {
      this.logging.log('error', 'Paystar launch failed', { error: String(err) });
      const message = (err as { error?: { message?: string } })?.error?.message;
      throw new Error(
        message ?? 'Unable to connect to Paystar right now. Please try again or call Town Hall.',
        { cause: err }
      );
    }
  }
}
