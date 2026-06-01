import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { StaffAuthService } from '../auth/staff-auth.service';
import { SiteLanguageService } from '../site-language';
import { HELLO_FROM_ADMIN_COPY } from './hello-from-copy';
import { HelloFromService, type HelloFromVisitorLog } from './hello-from.service';

@Component({
  selector: 'app-hello-from-admin-page',
  imports: [DatePipe, RouterLink, ButtonModule, CardModule, MessageModule, TableModule, TagModule],
  templateUrl: './hello-from-admin-page.html',
  styleUrl: './hello-from-admin-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    ngSkipHydration: '',
  },
})
export class HelloFromAdminPage implements OnInit {
  private readonly helloFrom = inject(HelloFromService);
  private readonly staffAuth = inject(StaffAuthService);
  private readonly siteLanguage = inject(SiteLanguageService);

  protected readonly copy = computed(() => {
    const lang = this.siteLanguage.currentLanguage() === 'es' ? 'es' : 'en';
    return HELLO_FROM_ADMIN_COPY[lang];
  });

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly logs = signal<HelloFromVisitorLog[]>([]);
  protected readonly isStaff = this.staffAuth.isStaff;

  ngOnInit(): void {
    void this.staffAuth.refreshSession().then(() => this.reload());
  }

  protected kindLabel(row: HelloFromVisitorLog): string {
    return row.kind === 'message' ? this.copy().kindMessage : this.copy().kindVisit;
  }

  protected locationLabel(row: HelloFromVisitorLog): string {
    const parts = [row.placeLabel, row.city, row.region, row.countryName || row.countryCode].filter(
      (part) => Boolean(part?.trim()),
    );
    return parts.join(', ') || '—';
  }

  protected messagePreview(row: HelloFromVisitorLog): string {
    if (row.kind === 'message' && row.message) {
      return row.message.length > 80 ? `${row.message.slice(0, 80)}…` : row.message;
    }
    return '—';
  }

  protected mapHref(row: HelloFromVisitorLog): string {
    return this.helloFrom.openOsmMap(row.lat ?? 0, row.lng ?? 0);
  }

  protected async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    const result = await this.helloFrom.loadVisitorLogsForStaff();
    if (result.ok) {
      this.logs.set(result.data);
    } else {
      this.logs.set([]);
      this.loadError.set(result.error);
    }
    this.loading.set(false);
  }

  protected downloadCsv(): void {
    const rows = this.logs();
    if (!rows.length) {
      return;
    }
    const headers = [
      'timestamp',
      'kind',
      'countryCode',
      'countryName',
      'region',
      'city',
      'placeLabel',
      'message',
      'displayName',
      'pagePath',
      'geoSource',
      'ipHash',
      'locale',
    ];
    const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
    const lines = [
      headers.join(','),
      ...rows.map((row) =>
        [
          row.timestamp,
          row.kind,
          row.countryCode,
          row.countryName,
          row.region,
          row.city,
          row.placeLabel,
          row.message,
          row.displayName,
          row.pagePath,
          row.geoSource,
          row.ipHash,
          row.locale,
        ]
          .map((cell) => escape(String(cell ?? '')))
          .join(','),
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hello-from-visitor-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
