import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { getContactUpdateRuntimeConfig } from '../contact-update/contact-update-config';
import { sanitizePlainText } from '../input-sanitization';
import { LoggingService } from '../logging.service';
import type { SiteLanguage } from '../site-language';
import type {
  BillPayIntakeSource,
  BillPayRequest,
  BillPaySubmitResult,
  PreferredBillPayContact,
} from './pay-bill-request';

const MAILTO_FALLBACK_RECIPIENT = 'deb.dillon@townofwiley.gov';

export interface BillPaySubmitPayload {
  fullName: string;
  serviceAddress: string;
  accountNumber: string;
  email: string;
  phone: string;
  preferredContactMethod: PreferredBillPayContact;
  notes: string;
  consentToContact: boolean;
  locale: SiteLanguage;
  source?: BillPayIntakeSource;
}

/**
 * Billing assistance / portal-access intake.
 * POSTs to the same Lambda + DynamoDB table as optional contact updates
 * (`contactUpdate.apiEndpoint` / TownOfWileyContactUpdates).
 */
@Injectable({ providedIn: 'root' })
export class BillPayService {
  private readonly http = inject(HttpClient);
  private readonly logging = inject(LoggingService);

  /**
   * POST sanitized payload to the shared resident intake endpoint.
   * If no endpoint is configured, returns a mailto href for the clerk inbox.
   */
  async submitRequest(payload: BillPaySubmitPayload): Promise<BillPaySubmitResult> {
    const request = this.sanitizePayload(payload);
    const mailtoHref = this.buildMailtoHref(request);
    const { apiEndpoint } = getContactUpdateRuntimeConfig();
    const endpoint = this.resolveEndpoint(apiEndpoint);

    if (!endpoint) {
      return { outcome: 'mailto', href: mailtoHref };
    }

    try {
      await firstValueFrom(this.http.post(endpoint, request));
      this.logging.log('info', 'Resident billing intake submitted', {
        source: request.source,
      });
      return { outcome: 'api-success' };
    } catch (err: unknown) {
      this.logging.log('warn', 'Resident billing intake API failed, using mailto fallback', {
        error: String(err),
      });
      return { outcome: 'api-failure-mailto', href: mailtoHref };
    }
  }

  private sanitizePayload(payload: BillPaySubmitPayload): BillPayRequest {
    return {
      fullName: sanitizePlainText(payload.fullName, 160),
      serviceAddress: sanitizePlainText(payload.serviceAddress, 240),
      accountNumber: sanitizePlainText(payload.accountNumber, 32).replace(/[^a-zA-Z0-9-]/g, ''),
      email: sanitizePlainText(payload.email, 254),
      phone: sanitizePlainText(payload.phone, 40),
      preferredContactMethod: payload.preferredContactMethod,
      notes: sanitizePlainText(payload.notes, 2000),
      consentToContact: payload.consentToContact === true,
      locale: payload.locale,
      source: payload.source ?? 'pay-bill-page',
    };
  }

  private resolveEndpoint(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) {
      return '';
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (typeof window !== 'undefined' && trimmed.startsWith('/')) {
      return `${window.location.origin}${trimmed}`;
    }
    return trimmed;
  }

  private buildMailtoHref(request: BillPayRequest): string {
    const subject = encodeURIComponent(
      request.locale === 'es'
        ? 'Servicios públicos — solicitud de ayuda con facturación'
        : 'Utility billing — billing assistance request',
    );
    const lines = [
      `Name / Nombre: ${request.fullName}`,
      `Service address / Dirección: ${request.serviceAddress}`,
      `Account # / Cuenta: ${request.accountNumber || '—'}`,
      `Email: ${request.email}`,
      `Phone / Teléfono: ${request.phone}`,
      `Preferred contact / Contacto preferido: ${request.preferredContactMethod}`,
      `Notes / Notas: ${request.notes || '—'}`,
      `Consent on file / Consentimiento: ${request.consentToContact ? 'yes / sí' : 'no'}`,
      `Locale: ${request.locale}`,
      `Source: ${request.source}`,
    ];
    const body = encodeURIComponent(lines.join('\n'));
    return `mailto:${MAILTO_FALLBACK_RECIPIENT}?subject=${subject}&body=${body}`;
  }
}
