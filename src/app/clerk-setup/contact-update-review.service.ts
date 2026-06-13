import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StaffAuthService } from '../auth/staff-auth.service';
import {
  getContactUpdateReviewRuntimeConfig,
  isContactReviewEndpointConfigured,
} from '../contact-update/contact-update-config';
import { printContactUpdateReport, type ContactUpdateReportLabels } from './contact-update-report';

export interface ContactUpdateRecord {
  id: string;
  timestamp: string;
  fullName: string;
  serviceAddress: string;
  poBox?: string;
  accountNumber?: string;
  phone?: string;
  email?: string;
  preferredContactMethod?: string;
  consentToContact?: boolean;
  notes?: string;
  source: string;
  locale: string;
}

export type ContactUpdatesLoadResult =
  | { ok: true; data: ContactUpdateRecord[] }
  | { ok: false; error: string };

@Injectable({ providedIn: 'root' })
export class ContactUpdateReviewService {
  private readonly http = inject(HttpClient);
  private readonly staffAuth = inject(StaffAuthService);

  async getAllUpdates(): Promise<ContactUpdatesLoadResult> {
    const reviewConfig = getContactUpdateReviewRuntimeConfig();
    const reviewApiEndpoint = reviewConfig.reviewApiEndpoint;
    const requiresStaffJwt = isContactReviewEndpointConfigured(reviewApiEndpoint);

    if (reviewApiEndpoint && !requiresStaffJwt) {
      return {
        ok: false,
        error:
          'Contact updates are not configured on this site yet. Ask IT to set CONTACT_UPDATE_REVIEW_API_URL and redeploy runtime-config.js.',
      };
    }

    const reviewEndpoint = this.resolveReviewEndpoint(reviewConfig);

    try {
      if (requiresStaffJwt) {
        await this.staffAuth.refreshSession();
        if (!this.staffAuth.isStaff()) {
          return {
            ok: false,
            error: this.staffAuth.isAuthenticated()
              ? 'Staff sign-in required. Your account must be in the Staff group to view contact updates.'
              : 'Sign in at /admin/login to view resident contact updates, then open this tab again.',
          };
        }
        const crossOriginBlock = this.describeCrossOriginReviewBlock(reviewEndpoint);
        if (crossOriginBlock) {
          return { ok: false, error: crossOriginBlock };
        }
      }

      const headers = requiresStaffJwt
        ? new HttpHeaders({
            Authorization: `Bearer ${this.staffAuth.accessToken()}`,
          })
        : undefined;
      const response = await firstValueFrom(
        this.http.get<ContactUpdateRecord[]>(reviewEndpoint, { headers }),
      );

      if (!Array.isArray(response)) {
        return {
          ok: false,
          error: requiresStaffJwt
            ? 'Contact updates returned an unexpected format. Sign in at /admin/login and try again.'
            : 'Contact updates returned an unexpected format. Contact IT.',
        };
      }

      return { ok: true, data: response };
    } catch (err) {
      const message = this.describeHttpError(err, requiresStaffJwt);
      if (!(err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403))) {
        console.error('Failed to load contact updates', err);
      }
      return { ok: false, error: message };
    }
  }

  downloadAsCSV(updates: ContactUpdateRecord[]): void {
    if (!updates.length) return;

    const headers = [
      'Date',
      'Full Name',
      'Service Address',
      'PO Box',
      'Account Number',
      'Phone',
      'Email',
      'Preferred Contact',
      'Consent to Contact',
      'Notes',
      'Source',
      'Language',
    ];

    const escapeField = (value: string): string =>
      `"${value.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

    const rows = updates.map((update) => [
      new Date(update.timestamp).toLocaleString(),
      update.fullName ?? '',
      update.serviceAddress ?? '',
      update.poBox ?? '',
      update.accountNumber ?? '',
      update.phone ?? '',
      update.email ?? '',
      update.preferredContactMethod ?? '',
      update.consentToContact === true ? 'yes' : update.consentToContact === false ? 'no' : '',
      update.notes ?? '',
      update.source ?? '',
      update.locale ?? '',
    ]);

    const csvContent = [
      headers.map(escapeField).join(','),
      ...rows.map((row) => row.map(escapeField).join(',')),
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wiley-resident-intake-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  printReport(updates: ContactUpdateRecord[], labels: ContactUpdateReportLabels): void {
    printContactUpdateReport(updates, labels);
  }

  private resolveReviewEndpoint(config: {
    reviewApiEndpoint: string;
    reviewProxyEndpoint: string;
  }): string {
    if (config.reviewApiEndpoint) {
      return config.reviewApiEndpoint;
    }
    if (config.reviewProxyEndpoint) {
      return config.reviewProxyEndpoint;
    }
    return '/api/contact-updates-review';
  }

  private describeCrossOriginReviewBlock(reviewEndpoint: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const pageOrigin = window.location.origin;
    if (!/localhost|127\.0\.0\.1/.test(pageOrigin)) {
      return null;
    }

    try {
      const apiUrl = new URL(reviewEndpoint);
      const isProductionStaffReviewApi =
        apiUrl.hostname.endsWith('.execute-api.us-east-2.amazonaws.com') &&
        apiUrl.pathname.includes('contact-updates');
      if (!isProductionStaffReviewApi || apiUrl.origin === pageOrigin) {
        return null;
      }
    } catch {
      return null;
    }

    return (
      'Resident contact updates cannot be loaded from localhost because the staff review API ' +
      'only allows https://townofwiley.gov. Sign in on production /admin, or ask IT for a local proxy URL.'
    );
  }

  private describeHttpError(err: unknown, requiresStaffJwt: boolean): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401 || err.status === 403) {
        return requiresStaffJwt
          ? 'Contact updates require staff sign-in. Open /admin/login, sign in, then reload this page.'
          : 'Contact updates are not available (access denied). Ask IT to deploy the review proxy.';
      }
      if (err.status === 0) {
        return requiresStaffJwt
          ? 'Could not reach the contact updates service. Ask IT to verify CONTACT_UPDATE_REVIEW_API_URL in runtime-config.js, then try again.'
          : 'Could not reach the contact updates service. Ask IT to deploy the review API proxy or set CONTACT_UPDATE_REVIEW_API_URL.';
      }
      if (err.status === 200) {
        return 'Could not load contact updates (received the site home page instead of data). Sign in at /admin/login or contact IT.';
      }
      return `Could not load contact updates (HTTP ${err.status}).`;
    }
    return 'Could not load contact updates.';
  }
}
