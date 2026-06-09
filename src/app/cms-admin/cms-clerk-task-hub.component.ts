import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TagModule } from 'primeng/tag';
import {
  CLERK_CMS_TASKS,
  clerkTaskPreviewUrl,
  type ClerkCmsTask,
  type ClerkCmsTaskId,
} from './cms-clerk-tasks';

function taskIconClass(task: ClerkCmsTask): string | null {
  return task.icon ?? null;
}

function taskShowsPublicPreview(task: ClerkCmsTask): boolean {
  return task.showPublicPreview !== false;
}

@Component({
  selector: 'app-cms-clerk-task-hub',
  standalone: true,
  imports: [TagModule],
  templateUrl: './cms-clerk-task-hub.component.html',
  styleUrl: './cms-clerk-task-hub.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsClerkTaskHubComponent {
  readonly modelCounts = input.required<Record<string, number>>();

  readonly editContent = output<ClerkCmsTaskId>();
  readonly showSteps = output<ClerkCmsTaskId>();

  protected readonly tasks = CLERK_CMS_TASKS;

  protected previewUrl(task: ClerkCmsTask): string {
    return clerkTaskPreviewUrl(task.previewPath);
  }

  protected taskIcon(task: ClerkCmsTask): string | null {
    return taskIconClass(task);
  }

  protected showsPublicPreview(task: ClerkCmsTask): boolean {
    return taskShowsPublicPreview(task);
  }

  protected countLabel(task: ClerkCmsTask): string | null {
    const counts = this.modelCounts();
    const key = task.model as keyof typeof counts;
    if (!(key in counts)) {
      return null;
    }
    const n = counts[key];
    if (n === 0 && task.emptyStateMessage) {
      return 'None saved yet';
    }
    if (n > 0) {
      return `${n} saved`;
    }
    return null;
  }

  protected onEditContent(taskId: ClerkCmsTaskId): void {
    this.editContent.emit(taskId);
  }

  protected onShowSteps(taskId: ClerkCmsTaskId): void {
    this.showSteps.emit(taskId);
  }
}
