import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CLERK_VERIFY_STEPS, clerkTaskById, type ClerkCmsTaskId } from './cms-clerk-tasks';

@Component({
  selector: 'app-cms-clerk-task-guide',
  standalone: true,
  templateUrl: './cms-clerk-task-guide.component.html',
  styleUrl: './cms-clerk-task-guide.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsClerkTaskGuideComponent {
  readonly taskId = input<ClerkCmsTaskId | null>(null);

  protected readonly task = computed(() => {
    const id = this.taskId();
    return id ? clerkTaskById(id) : undefined;
  });

  protected readonly verifySteps = CLERK_VERIFY_STEPS;
}
