import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { StaffAuthService } from '../auth/staff-auth.service';
import { CmsGenericModelAdminService } from '../cms-generic-model-admin.service';
import { LocalizedCmsContentStore } from '../site-cms-content';

const EMAIL_ALIAS_MODEL = 'EmailAlias';

export interface EmailAliasRow {
  id: string;
  aliasAddress: string;
  destinationAddress: string;
  active: boolean;
  displayName?: string;
  roleLabel?: string;
  notes?: string;
}

@Component({
  selector: 'app-cms-email-alias-admin',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    MessageModule,
    TagModule,
  ],
  templateUrl: './cms-email-alias-admin.component.html',
  styleUrl: './cms-email-alias-admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsEmailAliasAdminComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly genericModel = inject(CmsGenericModelAdminService);
  private readonly staffAuth = inject(StaffAuthService);
  private readonly messages = inject(MessageService);
  private readonly cmsStore = inject(LocalizedCmsContentStore);

  protected readonly aliases = signal<EmailAliasRow[]>([]);
  protected readonly aliasesLoading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);

  protected readonly isSignedIn = this.staffAuth.isStaff;

  protected readonly dialogHeader = computed(() =>
    this.editingId() ? 'Edit forwarding rule' : 'Add forwarding rule',
  );

  protected readonly aliasForm = this.fb.nonNullable.group({
    aliasAddress: ['', [Validators.required, Validators.email]],
    destinationAddress: ['', [Validators.required, Validators.email]],
    active: [true],
    displayName: [''],
    roleLabel: [''],
    notes: [''],
  });

  ngOnInit(): void {
    void this.staffAuth.refreshSession();
    void this.loadAliases();
  }

  protected onDialogVisibleChange(visible: boolean): void {
    this.dialogOpen.set(visible);
    if (!visible) {
      this.editingId.set(null);
    }
  }

  protected openCreateDialog(): void {
    this.editingId.set(null);
    this.aliasForm.reset({
      aliasAddress: '',
      destinationAddress: '',
      active: true,
      displayName: '',
      roleLabel: '',
      notes: '',
    });
    this.dialogOpen.set(true);
  }

  protected openEditDialog(row: EmailAliasRow): void {
    this.editingId.set(row.id);
    this.aliasForm.reset({
      aliasAddress: row.aliasAddress,
      destinationAddress: row.destinationAddress,
      active: row.active,
      displayName: row.displayName ?? '',
      roleLabel: row.roleLabel ?? '',
      notes: row.notes ?? '',
    });
    this.dialogOpen.set(true);
  }

  protected async saveAlias(): Promise<void> {
    if (this.aliasForm.invalid) {
      this.aliasForm.markAllAsTouched();
      return;
    }

    await this.staffAuth.refreshSession();
    if (!this.staffAuth.isStaff()) {
      this.toastError('Sign in at /admin/login before saving forwarding rules.');
      return;
    }

    const raw = this.aliasForm.getRawValue();
    const input: Record<string, unknown> = {
      aliasAddress: raw.aliasAddress.trim(),
      destinationAddress: raw.destinationAddress.trim(),
      active: raw.active,
    };
    if (raw.displayName.trim()) {
      input['displayName'] = raw.displayName.trim();
    }
    if (raw.roleLabel.trim()) {
      input['roleLabel'] = raw.roleLabel.trim();
    }
    if (raw.notes.trim()) {
      input['notes'] = raw.notes.trim();
    }

    this.saving.set(true);
    try {
      const editingId = this.editingId();
      if (editingId) {
        await this.genericModel.updateRecord(EMAIL_ALIAS_MODEL, { ...input, id: editingId });
      } else {
        await this.genericModel.createRecord(EMAIL_ALIAS_MODEL, input);
      }

      await this.refreshAdminSnapshotAfterMutation();

      this.messages.add({
        severity: 'success',
        summary: 'Forwarding rule saved',
        detail: 'Email forwarding updated in the content database.',
        life: 5_000,
      });
      this.dialogOpen.set(false);
      this.editingId.set(null);
      await this.loadAliases();
    } catch (err: unknown) {
      this.toastError(err instanceof Error ? err.message : 'Could not save forwarding rule.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteAlias(row: EmailAliasRow): Promise<void> {
    const confirmed = window.confirm(
      `Permanently delete forwarding for ${row.aliasAddress}?\n\nMail to this Town address will stop forwarding until a new rule is added.`,
    );
    if (!confirmed) {
      return;
    }

    await this.staffAuth.refreshSession();
    if (!this.staffAuth.isStaff()) {
      this.toastError('Sign in at /admin/login before deleting forwarding rules.');
      return;
    }

    this.deletingId.set(row.id);
    try {
      await this.genericModel.deleteRecord(EMAIL_ALIAS_MODEL, row.id);
      await this.refreshAdminSnapshotAfterMutation();

      this.messages.add({
        severity: 'success',
        summary: 'Forwarding rule deleted',
        detail: `${row.aliasAddress} no longer forwards mail.`,
        life: 5_000,
      });
      await this.loadAliases();
    } catch (err: unknown) {
      this.toastError(err instanceof Error ? err.message : 'Could not delete forwarding rule.');
    } finally {
      this.deletingId.set(null);
    }
  }

  protected fieldInvalid(name: 'aliasAddress' | 'destinationAddress'): boolean {
    const control = this.aliasForm.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  private async loadAliases(): Promise<void> {
    this.aliasesLoading.set(true);
    this.loadError.set(null);

    try {
      await this.staffAuth.refreshSession();
      if (!this.staffAuth.isStaff()) {
        this.aliases.set([]);
        return;
      }

      const records = await this.genericModel.listRecords(EMAIL_ALIAS_MODEL, 100);
      this.aliases.set(records.map((record) => this.mapRecord(record)));
    } catch (err: unknown) {
      this.aliases.set([]);
      const message = err instanceof Error ? err.message : 'Could not load email forwarding rules.';
      this.loadError.set(message);
    } finally {
      this.aliasesLoading.set(false);
    }
  }

  private mapRecord(record: Record<string, unknown>): EmailAliasRow {
    return {
      id: String(record['id'] ?? ''),
      aliasAddress: String(record['aliasAddress'] ?? ''),
      destinationAddress: String(record['destinationAddress'] ?? ''),
      active: record['active'] === true,
      displayName: typeof record['displayName'] === 'string' ? record['displayName'] : undefined,
      roleLabel: typeof record['roleLabel'] === 'string' ? record['roleLabel'] : undefined,
      notes: typeof record['notes'] === 'string' ? record['notes'] : undefined,
    };
  }

  private async refreshAdminSnapshotAfterMutation(): Promise<void> {
    try {
      await this.cmsStore.forceLiveRefresh();
      if (this.cmsStore.hasLoadFailed() || this.cmsStore.loadError()) {
        this.messages.add({
          severity: 'warn',
          summary: 'Refresh incomplete',
          detail:
            this.cmsStore.loadError() ??
            'Changes saved. Click Force Refresh Live CMS Content at the top of /admin.',
          life: 8_000,
        });
      }
    } catch {
      this.messages.add({
        severity: 'warn',
        summary: 'Refresh incomplete',
        detail: 'Changes saved. Click Force Refresh Live CMS Content at the top of /admin.',
        life: 8_000,
      });
    }
  }

  private toastError(detail: string): void {
    this.messages.add({
      severity: 'error',
      summary: 'Email forwarding error',
      detail,
      life: 8_000,
    });
  }
}
