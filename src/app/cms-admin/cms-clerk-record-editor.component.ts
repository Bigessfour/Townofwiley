import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { OrderListModule } from 'primeng/orderlist';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { StaffAuthService } from '../auth/staff-auth.service';
import { CmsGenericModelAdminService } from '../cms-generic-model-admin.service';
import {
  CmsSiteSettingsAdminService,
  type SiteSettingsInput,
} from '../cms-site-settings-admin.service';
import { DocumentUploadService } from '../document-upload.service';
import {
  LocalizedCmsContentStore,
  OFFICIAL_CONTACT_ID_CITY_CLERK,
  OFFICIAL_CONTACT_ID_TOWN_INFORMATION,
} from '../site-cms-content';
import {
  applyPostNoticeAttachmentDefaults,
  clerkTaskFormFields,
  defaultDynamicFormValues,
  formValuesToMutationInput,
  recordToFormValues,
  type ClerkFormFieldDefinition,
} from './cms-clerk-task-form-fields';
import { clerkTaskById, type ClerkCmsTaskId } from './cms-clerk-tasks';
import { CMS_SINGLETON_MODELS, cmsRecordSummaryLabel } from './cms-model-admin-fields';
import { cmsOrderedEditorConfig, type CmsOrderedEditorConfig } from './cms-model-inventory';

@Component({
  selector: 'app-cms-clerk-record-editor',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    OrderListModule,
    SelectModule,
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
  private readonly messages = inject(MessageService);
  private readonly documentUploads = inject(DocumentUploadService);
  private readonly cdr = inject(ChangeDetectorRef);

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
  protected readonly orderedList = signal<Record<string, unknown>[]>([]);
  protected readonly reordering = signal(false);
  protected readonly fileUploadingField = signal<string | null>(null);
  protected readonly fileUploadError = signal<string | null>(null);

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

  protected readonly orderedConfig = computed((): CmsOrderedEditorConfig | undefined => {
    const active = this.task();
    return active ? cmsOrderedEditorConfig(active.model) : undefined;
  });

  protected readonly isOrderedEditor = computed(() => Boolean(this.orderedConfig()));

  protected readonly orderedRecords = computed(() => {
    const config = this.orderedConfig();
    if (!config) {
      return [];
    }
    let items = this.records().filter((record) => record['active'] !== false);
    if (config.groupField) {
      const groupValue = this.formValues()[config.groupField];
      const group = typeof groupValue === 'string' ? groupValue.trim() : '';
      if (group) {
        items = items.filter((record) => String(record[config.groupField!] ?? '') === group);
      }
    }
    return [...items].sort(
      (left, right) => Number(left[config.sortField] ?? 0) - Number(right[config.sortField] ?? 0),
    );
  });

  protected readonly orderedPreviewLines = computed(() => {
    const config = this.orderedConfig();
    if (!config) {
      return [];
    }
    return this.orderedRecords()
      .map((record) => this.orderedItemLabel(record))
      .filter(Boolean);
  });

  protected readonly orderedGroupFilterActive = computed(() => {
    const config = this.orderedConfig();
    if (!config?.groupField) {
      return true;
    }
    const groupValue = this.formValues()[config.groupField];
    return typeof groupValue === 'string' && groupValue.trim().length > 0;
  });

  protected readonly showOrderedPanel = computed(
    () => this.isOrderedEditor() && !this.recordsLoading() && !this.loadError(),
  );

  protected readonly formTitle = computed(() => {
    const active = this.task();
    if (!active) {
      return '';
    }
    if (this.isSingleton()) {
      return 'Edit the saved settings';
    }
    return this.editingId() ? 'Edit this saved entry' : 'Add a new entry';
  });

  protected readonly showRecordPicker = computed(() => {
    return (
      Boolean(this.task()) &&
      !this.isSingleton() &&
      !this.isOrderedEditor() &&
      this.records().length > 0
    );
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
      return 'This contact row is required by the website layout and cannot be deleted. Update its label, value, or detail instead.';
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
      this.formValues.set(defaultDynamicFormValues(fieldDefs, { taskId: id ?? undefined }));
      this.fileUploadingField.set(null);
      this.fileUploadError.set(null);
      if (id) {
        void this.loadRecords(id);
      } else {
        this.records.set([]);
      }
    });

    effect(() => {
      this.orderedList.set(this.orderedRecords());
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
    this.formValues.update((current) => {
      const next = { ...current, [fieldName]: value };
      return this.taskId() === 'post-notice' ? applyPostNoticeAttachmentDefaults(next) : next;
    });
  }

  protected numberToFieldValue(value: number | null): string {
    return value == null ? '' : String(value);
  }

  protected selectOptions(field: ClerkFormFieldDefinition): { label: string; value: string }[] {
    return (field.options ?? []).map((option) => ({
      label: option.label,
      value: option.value,
    }));
  }

  protected async onFileOrUrlSelected(
    field: ClerkFormFieldDefinition,
    event: Event,
  ): Promise<void> {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) {
      return;
    }

    this.fileUploadError.set(null);
    await this.staffAuth.refreshSession();
    if (!this.staffAuth.isStaff()) {
      this.fileUploadError.set('Sign in at /admin/login before uploading files.');
      inputEl.value = '';
      return;
    }

    const sectionId = field.uploadSectionId ?? 'cms-uploads';
    this.fileUploadingField.set(field.name);
    try {
      const uploaded = await this.documentUploads.uploadDocument(file, sectionId);
      this.updateField(field.name, uploaded.id);
    } catch {
      this.fileUploadError.set('Upload failed. Try again or paste the file code manually.');
    } finally {
      this.fileUploadingField.set(null);
      inputEl.value = '';
      this.cdr.markForCheck();
    }
  }

  protected startNewRecord(): void {
    this.editingId.set(null);
    this.submitResult.set(null);
    this.submitError.set(null);
    this.formValues.set(
      defaultDynamicFormValues(this.fields(), { taskId: this.taskId() ?? undefined }),
    );
    this.fileUploadError.set(null);
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

  protected orderedItemLabel(record: Record<string, unknown>): string {
    const config = this.orderedConfig();
    if (!config) {
      return this.recordLabel(record);
    }
    const preview = String(record[config.previewField] ?? '').trim();
    const prefix = config.prefixField ? String(record[config.prefixField] ?? '').trim() : '';
    if (prefix && preview) {
      return `${prefix}: ${preview}`;
    }
    return preview || prefix || this.recordLabel(record);
  }

  protected async onOrderedListReorder(event: {
    value?: Record<string, unknown>[];
  }): Promise<void> {
    const active = this.task();
    const config = this.orderedConfig();
    const reordered = event.value ?? [];
    if (!active || !config || reordered.length === 0) {
      return;
    }

    await this.staffAuth.refreshSession();
    if (!this.staffAuth.isStaff()) {
      this.submitError.set('Sign in at /admin/login before saving changes.');
      return;
    }

    const previous = new Map(
      this.orderedRecords().map((record) => [
        String(record['id'] ?? ''),
        Number(record[config.sortField] ?? 0),
      ]),
    );
    const updates = reordered
      .map((record, index) => ({
        id: String(record['id'] ?? ''),
        displayOrder: index,
      }))
      .filter(
        (update) =>
          update.id && previous.has(update.id) && previous.get(update.id) !== update.displayOrder,
      );

    if (updates.length === 0) {
      this.orderedList.set(reordered);
      return;
    }

    this.reordering.set(true);
    this.submitError.set(null);
    try {
      await this.genericModel.reorderRecords(active.model, updates);
      this.orderedList.set(reordered);
      await this.cmsStore.forceLiveRefresh();
      await this.loadRecords(active.id);
      this.showSavedToast('List order');
    } catch (err: unknown) {
      this.orderedList.set(this.orderedRecords());
      const msg = err instanceof Error ? err.message : '';
      this.submitError.set(msg || 'Could not save the new order. Try again.');
    } finally {
      this.reordering.set(false);
    }
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
      const input = formValuesToMutationInput(this.fields(), this.formValues(), this.editingId());
      let savedId: string;

      if (active.model === 'SiteSettings') {
        savedId = await this.siteSettings.saveSiteSettings(input as unknown as SiteSettingsInput);
      } else if (this.editingId()) {
        savedId = await this.genericModel.updateModel(active.model, input);
      } else {
        savedId = await this.genericModel.createModel(active.model, input);
      }

      this.submitResult.set(
        `${active.model} saved (ID ${savedId}). Use the button below to verify on the live site (public cache refreshed).`,
      );
      const savedLabel = this.editingId()
        ? this.recordLabel({ id: savedId, ...this.formValues() })
        : this.recordLabel({ id: savedId, ...input });
      this.showSavedToast(savedLabel);
      await this.cmsStore.forceLiveRefresh();
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
    const hideCheckbox = this.fields().find((field) => field.type === 'checkbox');
    const hideHint = hideCheckbox
      ? ` To hide it without deleting, turn off the "${hideCheckbox.label}" box and save instead.`
      : '';
    const confirmed = window.confirm(
      `Permanently delete this ${active.model} record?\n\n${label}\n\nThis cannot be undone.${hideHint}`,
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
      this.showSavedToast(this.recordLabel({ id, ...this.formValues() }));
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

  private showSavedToast(itemLabel: string): void {
    this.messages.add({
      severity: 'success',
      summary: `✅ ${itemLabel} saved successfully and visible on website`,
      life: 5_000,
    });
  }

  protected async verifyOnLiveSite(): Promise<void> {
    const active = this.task();
    if (!active?.previewPath) {
      return;
    }
    // Use documented forceLiveRefresh to bypass public cache (as done on save and in hub "Refresh from database").
    await this.cmsStore.forceLiveRefresh();
    const url = `https://townofwiley.gov${active.previewPath}`;
    window.open(url, '_blank');
  }
}
