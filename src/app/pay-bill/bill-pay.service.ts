import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { sanitizePlainText } from '../input-sanitization';
import { LoggingService } from '../logging.service';
import type { SiteLanguage } from '../site-language';
import { getBillPayRuntimeConfig } from './bill-pay-config';
import type {
  BillPayRequest,
  BillPaySubmitResult,
  BillPayIntakeSource,
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
 * Bill pay “early access” intake.
 *
 * Future production shape (not implemented in this repo):
 * - **API Gateway** HTTP API routes `POST /api/v1/bill-pay-requests` (and optionally OPTIONS for CORS).
 * - **Lambda** validates payload, writes idempotently to **DynamoDB** table `BillPayRequests`
 *   (PK `requestId`, GSIs for status / createdAt as needed), emits audit log.
 * - **SES** sends confirmation to resident + staff routing rules; Lambda returns 201 with `requestId`.
 * - Wire `window.__TOW_RUNTIME_CONFIG__.billPay.apiEndpoint` to the invoke URL (or custom domain).
 * - Keep secrets (SES templates, Dynamo ARNs) in Lambda environment / SSM — never in Angular bundles.
 */
@Injectable({ providedIn: 'root' })
export class BillPayService {
  private readonly http = inject(HttpClient);
  private readonly logging = inject(LoggingService);

  /**
   * POST sanitized payload to configured endpoint (typically `/api/v1/bill-pay-requests` on the site origin
   * or a full API Gateway URL). If no endpoint is configured, returns a mailto href for the clerk inbox.
   * On HTTP failure, logs and returns the same mailto fallback as `ContactUpdateService`.
   */
  async submitRequest(payload: BillPaySubmitPayload): Promise<BillPaySubmitResult> {
    const request = this.sanitizePayload(payload);
    const mailtoHref = this.buildMailtoHref(request);
    const { apiEndpoint } = getBillPayRuntimeConfig();
    const endpoint = this.resolveEndpoint(apiEndpoint);

    if (!endpoint) {
      return { outcome: 'mailto', href: mailtoHref };
    }

    try {
      await firstValueFrom(this.http.post(endpoint, request));
      this.logging.log('info', 'Bill pay early-access request submitted', {
        source: request.source,
      });
      return { outcome: 'api-success' };
    } catch (err: unknown) {
      this.logging.log('warn', 'Bill pay request API failed, using mailto fallback', {
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
        ? 'Servicios públicos — acceso anticipado a pago en línea'
        : 'Utility billing — early access to online pay',
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
    ];
    const body = encodeURIComponent(lines.join('\n'));
    return `mailto:${MAILTO_FALLBACK_RECIPIENT}?subject=${subject}&body=${body}`;
  }
}
