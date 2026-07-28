import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit } from '@angular/core';
import { StaffAuthService } from '../auth/staff-auth.service';
import { CmsCommunityCalendarAdminComponent } from './cms-community-calendar-admin.component';
import { CmsClerkRecordEditorComponent } from './cms-clerk-record-editor.component';
import { CmsEmailAliasAdminComponent } from './cms-email-alias-admin.component';
import { clerkTaskHasForm } from './cms-clerk-task-form-fields';
import {
  CLERK_VERIFY_STEPS,
  clerkTaskById,
  clerkTaskUsesDedicatedEditor,
  clerkTaskUsesDocumentsWorkflow,
  type ClerkCmsTaskId,
} from './cms-clerk-tasks';
import { SITE_COPY_KEY_CATALOG } from '../site-copy-overrides';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-cms-clerk-task-guide',
  imports: [
    ButtonModule,
    CmsClerkRecordEditorComponent,
    CmsCommunityCalendarAdminComponent,
    CmsEmailAliasAdminComponent,
    MessageModule,
  ],
  templateUrl: './cms-clerk-task-guide.component.html',
  styleUrl: './cms-clerk-task-guide.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsClerkTaskGuideComponent implements OnInit {
  readonly taskId = input<ClerkCmsTaskId | null>(null);
  readonly helpExpanded = input(false);

  private readonly staffAuth = inject(StaffAuthService);
  protected readonly isSignedIn = this.staffAuth.isStaff;

  protected readonly task = computed(() => {
    const id = this.taskId();
    return id ? clerkTaskById(id) : undefined;
  });

  protected readonly showStaffSignInNote = computed(() => {
    const id = this.taskId();
    if (id == null || this.staffAuth.isStaff()) {
      return false;
    }
    return (
      clerkTaskHasForm(id) ||
      clerkTaskUsesDedicatedEditor(id) ||
      clerkTaskUsesDocumentsWorkflow(id)
    );
  });

  protected readonly verifySteps = CLERK_VERIFY_STEPS;
  protected readonly usesDedicatedEditor = clerkTaskUsesDedicatedEditor;
  protected readonly usesDocumentsWorkflow = clerkTaskUsesDocumentsWorkflow;
  protected readonly siteCopyKeys = SITE_COPY_KEY_CATALOG;

  ngOnInit(): void {
    void this.staffAuth.refreshSession();
  }
}
