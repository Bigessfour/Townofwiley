import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface ContactUpdateRecord {
  id: string;
  timestamp: string;
  fullName: string;
  serviceAddress: string;
  poBox?: string;
  phone?: string;
  email?: string;
  notes?: string;
  source: string;
  locale: string;
}

@Injectable({ providedIn: 'root' })
export class ContactUpdateReviewService {
  private readonly http = inject(HttpClient);

  // Proxied through the Angular dev server or CloudFront to the Lambda Function URL.
  // Configure the actual Lambda Function URL in runtime-config.js or environment proxy.
  private readonly reviewEndpoint = '/api/contact-updates-review';

  async getAllUpdates(): Promise<ContactUpdateRecord[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ContactUpdateRecord[]>(this.reviewEndpoint),
      );
      return response ?? [];
    } catch (err) {
      console.error('Failed to load contact updates', err);
      return [];
    }
  }

  downloadAsCSV(updates: ContactUpdateRecord[]): void {
    if (!updates.length) return;

    const headers = [
      'Date',
      'Full Name',
      'Service Address',
      'PO Box',
      'Phone',
      'Email',
      'Notes',
      'Source',
      'Language',
    ];

    // Escape a field for RFC-4180 CSV: wrap in double-quotes, escape internal quotes by doubling.
    const escapeField = (value: string): string =>
      `"${value.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

    const rows = updates.map((update) => [
      new Date(update.timestamp).toLocaleString(),
      update.fullName ?? '',
      update.serviceAddress ?? '',
      update.poBox ?? '',
      update.phone ?? '',
      update.email ?? '',
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
    link.download = `wiley-contact-updates-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
