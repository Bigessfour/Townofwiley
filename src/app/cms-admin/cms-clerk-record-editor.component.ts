import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { StaffAuthService } from '../auth/staff-auth.service';
import { CmsGenericModelAdminService } from '../cms-generic-model-admin.service';
import {
  LocalizedCmsContentStore,
  OFFICIAL_CONTACT_ID_CITY_CLERK,
  OFFICIAL_CONTACT_ID_TOWN_INFORMATION,
} from '../site-cms-content';
import {
  CmsSiteSettingsAdminService,
  type SiteSettingsInput,
} from '../cms-site-settings-admin.service';
import {
  CMS_SINGLETON_MODELS,
  cmsRecordSummaryLabel,
} from './cms-model-admin-fields';
import {
  clerkTaskFormFields,
  defaultDynamicFormValues,
  formValuesToMutationInput,
  recordToFormValues,
  type ClerkFormFieldDefinition,
} from './cms-clerk-task-form-fields';
import { clerkTaskById, type ClerkCmsTaskId } from './cms-clerk-tasks';

@Component({
  selector: 'app-cms-clerk-record-editor',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    TableModule,
    TextareaModule,
  ],
  templateUrl: './cms-clerk-record-editor.component.html',
  styleUrl: './cms-clerk-record-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsClerkRecordEditorComponent implements OnInit {
  readonly taskId = input<ClerkCmsTaskId | null>(null);

  private readonly staffAuth = inject(StaffAuthService);
  private readonly genericModel = inject(CmsGenericModelAdminService);
  private readonly siteSettings = inject(CmsSiteSettingsAdminService);
  private readonly cmsStore = inject(LocalizedCmsContentStore);

  protected readonly isSignedIn = this.staffAuth.isStaff;
  protected readonly recordsLoading = signal(false);
  protected readonly records = signal<Record<string, unknown>[]>([]);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formValues = signal<Record<string, string | boolean>>({});
  protected readonly submitting = signal(false);
  protected readonly deleting = signal(false);
  protected readonly submitResult = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);
  protected readonly loadError = signal<string | null>(null);

  protected readonly task = computed(() => {
    const id = this.taskId();
    return id ? clerkTaskById(id) : undefined;
  });

  protected readonly fields = computed(() => {
    const id = this.taskId();
    return id ? clerkTaskFormFields(id) : [];
  });

  protected readonly isSingleton = computed(() => {
    const active = this.task();
    return active ? CMS_SINGLETON_MODELS.has(active.model) : false;
  });

  protected readonly formTitle = computed(() => {
    const active = this.task();
    if (!active) {
      return '';
    }
    return this.editingId() ? `Edit ${active.title}` : `Add ${active.title}`;
  });

  protected readonly showRecordPicker = computed(() => {
    return Boolean(this.task()) && !this.isSingleton() && this.records().length > 0;
  });

  protected readonly canDeleteRecord = computed(() => {
    const active = this.task();
    const id = this.editingId();
    if (!active || !id || this.isSingleton()) {
      return false;
    }
    return !this.isProtectedDeleteTarget(active.model, id);
  });

  protected readonly deleteBlockedReason = computed(() => {
    const active = this.task();
    const id = this.editingId();
    if (!active || !id) {
      return null;
    }
    if (this.isProtectedDeleteTarget(active.model, id)) {
      return 'This contact row is required by the website layout and cannot be deleted. Edit it instead, or set active to off if you need to hide it.';
    }
    return null;
  });

  constructor() {
    effect(() => {
      const id = this.taskId();
      this.editingId.set(null);
      this.submitResult.set(null);
      this.submitError.set(null);
      this.loadError.set(null);
      const fieldDefs = id ? clerkTaskFormFields(id) : [];
      this.formValues.set(defaultDynamicFormValues(fieldDefs));
      if (id) {
        void this.loadRecords(id);
      } else {
        this.records.set([]);
      }
    });
  }

  ngOnInit(): void {
    void this.staffAuth.refreshSession();
  }

  protected fieldInputId(fieldName: string): string {
    const task = this.taskId() ?? 'task';
    return `cms-field-${task}-${fieldName}`;
  }

  protected fieldValue(field: ClerkFormFieldDefinition): string | boolean {
    const value = this.formValues()[field.name];
    if (field.type === 'checkbox') {
      return value === true;
    }
    return typeof value === 'string' ? value : '';
  }

  protected nativeDateInputType(field: ClerkFormFieldDefinition): 'date' | 'datetime-local' {
    return field.type === 'datetime' ? 'datetime-local' : 'date';
  }

  protected updateField(fieldName: string, value: string | boolean): void {
    this.formValues.update((current) => ({ ...current, [fieldName]: value }));
  }

  protected numberToFieldValue(value: number | null): string {
    return value == null ? '' : String(value);
  }

  protected startNewRecord(): void {
    this.editingId.set(null);
    this.submitResult.set(null);
    this.submitError.set(null);
    this.formValues.set(defaultDynamicFormValues(this.fields()));
  }

  protected editRecord(record: Record<string, unknown>): void {
    const id = record['id'];
    if (typeof id !== 'string') {
      return;
    }
    this.editingId.set(id);
    this.submitResult.set(null);
    this.submitError.set(null);
    this.formValues.set(recordToFormValues(this.fields(), record));
  }

  protected recordLabel(record: Record<string, unknown>): string {
    const active = this.task();
    if (!active) {
      return 'Record';
    }
    return cmsRecordSummaryLabel(active.model, record);
  }

  protected async submitForm(): Promise<void> {
    const active = this.task();
    if (!active) {
      return;
    }

    await this.staffAuth.refreshSession();
    if (!this.staffAuth.isStaff()) {
      this.submitError.set('Sign in at /admin/login before saving changes.');
      return;
    }

    this.submitting.set(true);
    this.submitResult.set(null);
    this.submitError.set(null);

    try {
      const input = formValuesToMutationInput(
        this.fields(),
        this.formValues(),
        this.editingId(),
      );
      let savedId: string;

      if (active.model === 'SiteSettings') {
        savedId = await this.siteSettings.saveSiteSettings(input as unknown as SiteSettingsInput);
      } else if (this.editingId()) {
        savedId = await this.genericModel.updateModel(active.model, input);
      } else {
        savedId = await this.genericModel.createModel(active.model, input);
      }

      this.submitResult.set(
        `${active.model} saved (ID ${savedId}). Open See on website and hard-refresh ${active.previewPath}.`,
      );
      await this.loadRecords(active.id);
      if (!this.isSingleton()) {
        this.startNewRecord();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message?: unknown }).message)
            : '';
      this.submitError.set(msg || `Could not save ${active.model}. Try signing in again.`);
    } finally {
      this.submitting.set(false);
    }
  }

  protected async deleteCurrentRecord(): Promise<void> {
    const active = this.task();
    const id = this.editingId();
    if (!active || !id || active.model === 'SiteSettings') {
      return;
    }

    if (this.isProtectedDeleteTarget(active.model, id)) {
      this.submitError.set(this.deleteBlockedReason() ?? 'This record cannot be deleted.');
      return;
    }

    await this.staffAuth.refreshSession();
    if (!this.staffAuth.isStaff()) {
      this.submitError.set('Sign in at /admin/login before deleting content.');
      return;
    }

    const label = this.recordLabel({ id, ...this.formValues() });
    const confirmed = window.confirm(
      `Permanently delete this ${active.model} record?\n\n${label}\n\nThis cannot be undone. Consider setting active to off instead.`,
    );
    if (!confirmed) {
      return;
    }

    this.deleting.set(true);
    this.submitResult.set(null);
    this.submitError.set(null);

    try {
      const deletedId = await this.genericModel.deleteRecord(active.model, id);
      this.submitResult.set(
        `${active.model} deleted (ID ${deletedId}). Hard-refresh ${active.previewPath} to verify.`,
      );
      await this.cmsStore.forceLiveRefresh();
      await this.loadRecords(active.id);
      this.startNewRecord();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      this.submitError.set(msg || `Could not delete ${active.model}. Try signing in again.`);
    } finally {
      this.deleting.set(false);
    }
  }

  private isProtectedDeleteTarget(model: string, id: string): boolean {
    if (model !== 'OfficialContact') {
      return false;
    }
    return id === OFFICIAL_CONTACT_ID_TOWN_INFORMATION || id === OFFICIAL_CONTACT_ID_CITY_CLERK;
  }

  private async loadRecords(taskId: ClerkCmsTaskId): Promise<void> {
    const active = clerkTaskById(taskId);
    if (!active) {
      return;
    }

    this.recordsLoading.set(true);
    this.loadError.set(null);
    try {
      const items =
        active.model === 'SiteSettings'
          ? await this.siteSettings.listSiteSettings(1)
          : await this.genericModel.listRecords(active.model, 50);
      this.records.set(items);

      if (CMS_SINGLETON_MODELS.has(active.model) && items[0]) {
        this.editRecord(items[0]);
      }
    } catch (err: unknown) {
      this.records.set([]);
      const msg = err instanceof Error ? err.message : '';
      this.loadError.set(
        msg || `Could not load saved ${active.model} rows. Sign in at /admin/login and try again.`,
      );
    } finally {
      this.recordsLoading.set(false);
    }
  }
}