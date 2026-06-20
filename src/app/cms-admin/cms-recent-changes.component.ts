import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { CmsAuditLogEntry, CmsAuditLogService } from './cms-audit-log.service';

@Component({
  selector: 'app-cms-recent-changes',
  standalone: true,
  imports: [TagModule],
  templateUrl: './cms-recent-changes.component.html',
  styleUrl: './cms-recent-changes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsRecentChangesComponent {
  private readonly auditLog = inject(CmsAuditLogService);

  readonly limit = input(15);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly entries = signal<CmsAuditLogEntry[]>([]);

  constructor() {
    void this.loadEntries();
  }

  protected operationSeverity(
    operation: string | undefined,
  ): 'success' | 'warn' | 'danger' | 'info' {
    switch ((operation ?? '').toUpperCase()) {
      case 'INSERT':
        return 'success';
      case 'MODIFY':
        return 'info';
      case 'REMOVE':
        return 'danger';
      default:
        return 'info';
    }
  }

  protected formatTimestamp(value: string | undefined): string {
    if (!value) {
      return '';
    }
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return value;
    }
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  }

  private async loadEntries(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const items = await this.auditLog.listRecent(this.limit());
      this.entries.set(items);
    } catch {
      this.error.set(
        'Could not load recent changes. Try Refresh from database, then reload this page.',
      );
      this.entries.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
