import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { StaffAuthService } from '../auth/staff-auth.service';
import { CmsAuditLogEntry, CmsAuditLogService } from './cms-audit-log.service';
import {
  clerkPlainOperationLabel,
  clerkTaskTitleForModel,
} from './cms-clerk-coverage';

@Component({
  selector: 'app-cms-recent-changes',
  standalone: true,
  imports: [ButtonModule, TagModule],
  templateUrl: './cms-recent-changes.component.html',
  styleUrl: './cms-recent-changes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsRecentChangesComponent {
  private readonly auditLog = inject(CmsAuditLogService);
  private readonly staffAuth = inject(StaffAuthService);

  readonly limit = input(15);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly entries = signal<CmsAuditLogEntry[]>([]);
  protected readonly refreshLoading = signal(false);
  protected readonly auditUnavailable = signal(false);

  constructor() {
    void this.loadEntries();
  }

  protected operationLabel(operation: string | undefined): string {
    return clerkPlainOperationLabel(operation);
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

  protected taskTitle(modelName: string | undefined): string {
    return clerkTaskTitleForModel(modelName) ?? modelName ?? 'Content';
  }

  protected formatChangedFields(raw: string | undefined): string | null {
    if (!raw?.trim()) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return null;
      }
      const labels = parsed
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((field) => field.replace(/([A-Z])/g, ' $1').trim());
      if (labels.length === 0) {
        return null;
      }
      return labels.join(', ');
    } catch {
      return null;
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

  protected async refresh(): Promise<void> {
    if (this.refreshLoading()) {
      return;
    }
    this.refreshLoading.set(true);
    try {
      await this.loadEntries();
    } finally {
      this.refreshLoading.set(false);
    }
  }

  private async loadEntries(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.auditUnavailable.set(false);
    try {
      if (this.staffAuth.playwrightStaffBypassActive()) {
        this.entries.set([]);
        return;
      }
      if (!this.staffAuth.isStaff()) {
        this.auditUnavailable.set(true);
        this.entries.set([]);
        return;
      }
      if (!this.auditLog.isConfigured()) {
        this.auditUnavailable.set(true);
        this.entries.set([]);
        return;
      }
      const items = await this.auditLog.listRecent(this.limit());
      this.entries.set(items);
      if (items.length === 0 && this.auditLog.isConfigured()) {
        this.auditUnavailable.set(false);
      }
    } catch {
      this.error.set(
        'Could not load recent changes. Try Refresh list, or Technical details → Refresh from database.',
      );
      this.entries.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
