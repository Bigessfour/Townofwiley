import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { StaffAuthService } from '../auth/staff-auth.service';
import { buildClerkTaskHubLiveLink } from './cms-clerk-task-live-link';
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

function taskVisibleForGroups(task: ClerkCmsTask, groups: string[]): boolean {
  if (groups.includes('Staff')) {
    return true;
  }
  const required = task.requiredGroups;
  if (!required?.length) {
    return false;
  }
  return required.some((group) => groups.includes(group));
}

@Component({
  selector: 'app-cms-clerk-task-hub',
  standalone: true,
  imports: [ButtonModule, TagModule],
  templateUrl: './cms-clerk-task-hub.component.html',
  styleUrl: './cms-clerk-task-hub.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsClerkTaskHubComponent {
  private readonly staffAuth = inject(StaffAuthService);

  readonly modelCounts = input.required<Record<string, number>>();

  readonly editContent = output<ClerkCmsTaskId>();
  readonly showSteps = output<ClerkCmsTaskId>();

  protected readonly tasks = computed(() => {
    const groups = this.staffAuth.staffGroups();
    return CLERK_CMS_TASKS.filter((task) => taskVisibleForGroups(task, groups));
  });

  protected previewUrl(task: ClerkCmsTask): string {
    return buildClerkTaskHubLiveLink(task.id) ?? clerkTaskPreviewUrl(task.previewPath);
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
