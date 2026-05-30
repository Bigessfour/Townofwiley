import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { getContactUpdateReviewRuntimeConfig } from '../contact-update/contact-update-config';
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

  async getAllUpdates(): Promise<ContactUpdatesLoadResult> {
    const reviewEndpoint = this.resolveReviewEndpoint();
    try {
      const response = await firstValueFrom(this.http.get<ContactUpdateRecord[]>(reviewEndpoint));
      return { ok: true, data: response ?? [] };
    } catch (err) {
      const message = this.describeHttpError(err);
      console.error('Failed to load contact updates', err);
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

  private resolveReviewEndpoint(): string {
    const configured = getContactUpdateReviewRuntimeConfig().reviewProxyEndpoint;
    if (configured) {
      return configured;
    }
    return '/api/contact-updates-review';
  }

  private describeHttpError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 403) {
        return 'Contact updates are not available (access denied). Ask IT to deploy the review proxy.';
      }
      if (err.status === 0) {
        return 'Could not reach the contact updates service. Check your network or try again.';
      }
      return `Could not load contact updates (HTTP ${err.status}).`;
    }
    return 'Could not load contact updates.';
  }
}
