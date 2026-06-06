import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TagModule } from 'primeng/tag';
import {
  CLERK_CMS_TASKS,
  clerkTaskPreviewUrl,
  type ClerkCmsTask,
  type ClerkCmsTaskId,
} from './cms-clerk-tasks';

@Component({
  selector: 'app-cms-clerk-task-hub',
  standalone: true,
  imports: [TagModule],
  templateUrl: './cms-clerk-task-hub.component.html',
  styleUrl: './cms-clerk-task-hub.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsClerkTaskHubComponent {
  readonly region = input.required<string>();
  readonly appId = input.required<string>();
  readonly branch = input('main');
  readonly fallbackEditorUrl = input.required<string>();
  readonly modelCounts = input.required<Record<string, number>>();

  readonly showSteps = output<ClerkCmsTaskId>();

  protected readonly tasks = CLERK_CMS_TASKS;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected editorUrl(_task: ClerkCmsTask): string {
    // Use the fallbackEditorUrl provided (hardcoded to current AppSync in parent).
    // Legacy Amplify app links (d331voxr1fhoir) + Gen1 AppSync (j7b2...) are legacy; editing via Gen 2 AppSync (x7poeh...).
    // The passed appId/region/branch are legacy and ignored for editor links.
    return this.fallbackEditorUrl();
  }

  protected previewUrl(task: ClerkCmsTask): string {
    return clerkTaskPreviewUrl(task.previewPath);
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

  protected onShowSteps(taskId: ClerkCmsTaskId): void {
    this.showSteps.emit(taskId);
  }
}
