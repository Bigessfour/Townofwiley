import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LoggingService } from '../logging.service';
import { SiteLanguage } from '../site-language';
import { getContactUpdateRuntimeConfig } from './contact-update-config';

export interface ContactUpdateRequest {
  fullName: string;
  serviceAddress: string;
  poBox: string;
  phone: string;
  email: string;
  notes: string;
  locale: SiteLanguage;
  source: 'payment-panel';
}

/** Discriminated union so callers know exactly what happened. */
export type ContactUpdateResult =
  | { outcome: 'api-success' }
  | { outcome: 'mailto'; href: string }
  | { outcome: 'api-failure-mailto'; href: string };

@Injectable({ providedIn: 'root' })
export class ContactUpdateService {
  private readonly http = inject(HttpClient);
  private readonly logging = inject(LoggingService);

  /**
   * Tries to POST to the configured Lambda endpoint.
   * - If no endpoint is configured, falls back to the mailto href immediately.
   * - If the POST fails, logs a warning and falls back to the mailto href.
   */
  async submitUpdate(
    request: ContactUpdateRequest,
    mailtoFallback: string,
  ): Promise<ContactUpdateResult> {
    const { apiEndpoint } = getContactUpdateRuntimeConfig();

    if (!apiEndpoint) {
      return { outcome: 'mailto', href: mailtoFallback };
    }

    try {
      await firstValueFrom(this.http.post(apiEndpoint, request));
      this.logging.log('info', 'Contact update submitted', { source: request.source });
      return { outcome: 'api-success' };
    } catch (err: unknown) {
      this.logging.log('warn', 'Contact update Lambda failed, using mailto fallback', {
        error: String(err),
      });
      return { outcome: 'api-failure-mailto', href: mailtoFallback };
    }
  }
}
