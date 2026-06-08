import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit } from '@angular/core';
import { StaffAuthService } from '../auth/staff-auth.service';
import { CmsClerkRecordEditorComponent } from './cms-clerk-record-editor.component';
import { clerkTaskHasForm } from './cms-clerk-task-form-fields';
import { CLERK_VERIFY_STEPS, clerkTaskById, type ClerkCmsTaskId } from './cms-clerk-tasks';

@Component({
  selector: 'app-cms-clerk-task-guide',
  imports: [CmsClerkRecordEditorComponent],
  templateUrl: './cms-clerk-task-guide.component.html',
  styleUrl: './cms-clerk-task-guide.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsClerkTaskGuideComponent implements OnInit {
  readonly taskId = input<ClerkCmsTaskId | null>(null);

  private readonly staffAuth = inject(StaffAuthService);
  protected readonly isSignedIn = this.staffAuth.isStaff;

  protected readonly task = computed(() => {
    const id = this.taskId();
    return id ? clerkTaskById(id) : undefined;
  });

  protected readonly showStaffSignInNote = computed(() => {
    const id = this.taskId();
    return id != null && clerkTaskHasForm(id) && !this.staffAuth.isStaff();
  });

  protected readonly verifySteps = CLERK_VERIFY_STEPS;

  ngOnInit(): void {
    void this.staffAuth.refreshSession();
  }
}