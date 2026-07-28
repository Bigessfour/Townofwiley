import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { StaffAuthService } from '../auth/staff-auth.service';
import { CommunityCalendarAdminService } from '../community-calendar/community-calendar-admin.service';
import { COMMUNITY_CALENDAR_COPY } from '../community-calendar/community-calendar.copy';
import {
  COMMUNITY_EVENT_CATEGORIES,
  type AdminCommunityEvent,
  type CommunityEventCategory,
  type CommunityEventStatus,
} from '../community-calendar/community-calendar.types';

@Component({
  selector: 'app-cms-community-calendar-admin',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    MessageModule,
    TagModule,
  ],
  templateUrl: './cms-community-calendar-admin.component.html',
  styleUrl: './cms-community-calendar-admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsCommunityCalendarAdminComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminApi = inject(CommunityCalendarAdminService);
  private readonly staffAuth = inject(StaffAuthService);
  private readonly messages = inject(MessageService);

  protected readonly events = signal<AdminCommunityEvent[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly statusFilter = signal<CommunityEventStatus | ''>('');

  protected readonly isSignedIn = this.staffAuth.isStaff;
  protected readonly categoryLabels = COMMUNITY_CALENDAR_COPY.en.categoryLabels;

  protected readonly statusOptions = [
    { label: 'All statuses', value: '' as const },
    { label: 'Pending', value: 'pending' as const },
    { label: 'Approved', value: 'approved' as const },
    { label: 'Rejected', value: 'rejected' as const },
  ];

  protected readonly categoryOptions = COMMUNITY_EVENT_CATEGORIES.map((value) => ({
    label: this.categoryLabels[value],
    value,
  }));

  protected readonly dialogHeader = computed(() =>
    this.editingId() ? 'Edit community event' : 'Add community event',
  );

  protected readonly eventForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    location: ['', Validators.required],
    category: ['other' as CommunityEventCategory, Validators.required],
    submitterName: ['', Validators.required],
    submitterPhone: ['', Validators.required],
    submitterEmail: ['', [Validators.required, Validators.email]],
    startDateTime: ['', Validators.required],
    endDateTime: [''],
    organizerName: [''],
    socialLink: [''],
    audience: [''],
    cost: [''],
    accessibilityNotes: [''],
    status: ['pending' as CommunityEventStatus],
  });

  ngOnInit(): void {
    void this.staffAuth.refreshSession().then(() => this.reload());
  }

  protected onStatusFilter(value: CommunityEventStatus | '' | null): void {
    this.statusFilter.set(value ?? '');
    this.reload();
  }

  protected reload(): void {
    if (!this.staffAuth.isStaff()) {
      this.events.set([]);
      return;
    }
    if (!this.adminApi.isConfigured()) {
      this.loadError.set(
        'Community calendar API is not configured, or your session token is missing. Sign in again.',
      );
      this.events.set([]);
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);
    this.adminApi.listEvents(this.statusFilter()).subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: () => {
        this.events.set([]);
        this.loading.set(false);
        this.loadError.set('Could not load community events.');
      },
    });
  }

  protected openCreateDialog(): void {
    this.editingId.set(null);
    this.eventForm.reset({
      title: '',
      description: '',
      location: '',
      category: 'other',
      submitterName: '',
      submitterPhone: '',
      submitterEmail: '',
      startDateTime: '',
      endDateTime: '',
      organizerName: '',
      socialLink: '',
      audience: '',
      cost: '',
      accessibilityNotes: '',
      status: 'pending',
    });
    this.dialogOpen.set(true);
  }

  protected openEditDialog(row: AdminCommunityEvent): void {
    this.editingId.set(row.eventId);
    this.eventForm.reset({
      title: row.title,
      description: row.description,
      location: row.location,
      category: row.category,
      submitterName: row.submitterName ?? '',
      submitterPhone: row.submitterPhone ?? '',
      submitterEmail: row.submitterEmail ?? '',
      startDateTime: toLocalInput(row.startDateTime),
      endDateTime: row.endDateTime ? toLocalInput(row.endDateTime) : '',
      organizerName: row.organizerName ?? '',
      socialLink: row.socialLink ?? '',
      audience: row.audience ?? '',
      cost: row.cost ?? '',
      accessibilityNotes: row.accessibilityNotes ?? '',
      status: row.status,
    });
    this.dialogOpen.set(true);
  }

  protected onDialogVisibleChange(visible: boolean): void {
    this.dialogOpen.set(visible);
    if (!visible) {
      this.editingId.set(null);
    }
  }

  protected saveEvent(): void {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }
    const value = this.eventForm.getRawValue();
    const payload = {
      ...value,
      startDateTime: toIsoFromLocalInput(value.startDateTime),
      endDateTime: value.endDateTime ? toIsoFromLocalInput(value.endDateTime) : undefined,
      language: 'en' as const,
    };
    this.saving.set(true);
    const editingId = this.editingId();
    const request$ = editingId
      ? this.adminApi.updateEvent(editingId, payload)
      : this.adminApi.createEvent(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Saved',
          detail: 'Community event saved.',
          life: 4000,
        });
        this.reload();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Save failed',
          detail: error instanceof Error ? error.message : 'Could not save event.',
          life: 7000,
        });
      },
    });
  }

  protected approve(row: AdminCommunityEvent): void {
    this.adminApi.approveEvent(row.eventId).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary: 'Approved',
          detail: `"${row.title}" is now public.`,
          life: 4000,
        });
        this.reload();
      },
      error: () => {
        this.messages.add({
          severity: 'error',
          summary: 'Approve failed',
          detail: 'Could not approve this event.',
          life: 6000,
        });
      },
    });
  }

  protected reject(row: AdminCommunityEvent): void {
    this.adminApi.rejectEvent(row.eventId).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary: 'Rejected',
          detail: `"${row.title}" was rejected.`,
          life: 4000,
        });
        this.reload();
      },
      error: () => {
        this.messages.add({
          severity: 'error',
          summary: 'Reject failed',
          detail: 'Could not reject this event.',
          life: 6000,
        });
      },
    });
  }

  protected remove(row: AdminCommunityEvent): void {
    if (!confirm(`Delete "${row.title}"? This cannot be undone.`)) {
      return;
    }
    this.adminApi.deleteEvent(row.eventId).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Community event removed.',
          life: 4000,
        });
        this.reload();
      },
      error: () => {
        this.messages.add({
          severity: 'error',
          summary: 'Delete failed',
          detail: 'Could not delete this event.',
          life: 6000,
        });
      },
    });
  }

  protected categoryLabel(category: CommunityEventCategory): string {
    return this.categoryLabels[category];
  }

  protected statusSeverity(
    status: CommunityEventStatus,
  ): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warn';
      case 'rejected':
        return 'danger';
      default:
        return 'secondary';
    }
  }
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoFromLocalInput(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString();
}
