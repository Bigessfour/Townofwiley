import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CLERK_COVERAGE_ROWS, type ClerkCoverageMethod } from './cms-clerk-coverage';
import type { ClerkCmsTaskId } from './cms-clerk-tasks';

@Component({
  selector: 'app-cms-clerk-coverage-sheet',
  standalone: true,
  imports: [ButtonModule, TagModule],
  templateUrl: './cms-clerk-coverage-sheet.component.html',
  styleUrl: './cms-clerk-coverage-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsClerkCoverageSheetComponent {
  readonly openTask = output<ClerkCmsTaskId>();
  readonly openDocuments = output<void>();

  protected readonly rows = CLERK_COVERAGE_ROWS;

  protected methodLabel(method: ClerkCoverageMethod): string {
    switch (method) {
      case 'admin-task':
        return 'Admin task';
      case 'documents-section':
        return 'Upload section';
      case 'site-copy-task':
        return 'SiteCopy labels';
      case 'it-only':
        return 'Town IT only';
    }
  }

  protected methodSeverity(
    method: ClerkCoverageMethod,
  ): 'success' | 'info' | 'warn' | 'secondary' | 'danger' {
    switch (method) {
      case 'admin-task':
        return 'success';
      case 'documents-section':
        return 'info';
      case 'site-copy-task':
        return 'secondary';
      case 'it-only':
        return 'warn';
    }
  }

  protected onOpenRow(row: (typeof CLERK_COVERAGE_ROWS)[number]): void {
    if (row.method === 'it-only' || !row.taskId) {
      return;
    }
    if (row.method === 'documents-section') {
      this.openDocuments.emit();
      return;
    }
    this.openTask.emit(row.taskId);
  }

  protected canOpenRow(row: (typeof CLERK_COVERAGE_ROWS)[number]): boolean {
    return row.method !== 'it-only' && Boolean(row.taskId);
  }
}