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
import { StaffAuthService } from '../auth/staff-auth.service';
import { CmsAlertBannerAdminService } from '../cms-alert-banner-admin.service';
import { CmsAnnouncementAdminService } from '../cms-announcement-admin.service';
import { CmsEventAdminService } from '../cms-event-admin.service';
import { CmsGenericModelAdminService } from '../cms-generic-model-admin.service';
import { CmsSiteSettingsAdminService } from '../cms-site-settings-admin.service';
import {
  clerkTaskFormFields,
  clerkTaskHasDynamicForm,
  defaultDynamicFormValues,
  type ClerkFormFieldDefinition,
} from './cms-clerk-task-form-fields';
import {
  CLERK_VERIFY_STEPS,
  clerkTaskById,
  clerkTaskHasInAppEditor,
  type ClerkCmsTaskId,
} from './cms-clerk-tasks';

@Component({
  selector: 'app-cms-clerk-task-guide',
  standalone: true,
  templateUrl: './cms-clerk-task-guide.component.html',
  styleUrl: './cms-clerk-task-guide.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsClerkTaskGuideComponent implements OnInit {
  readonly taskId = input<ClerkCmsTaskId | null>(null);

  private readonly staffAuth = inject(StaffAuthService);
  protected readonly isSignedIn = this.staffAuth.isStaff;

  private readonly eventService = inject(CmsEventAdminService);
  private readonly announcementService = inject(CmsAnnouncementAdminService);
  private readonly alertBannerService = inject(CmsAlertBannerAdminService);
  private readonly siteSettingsService = inject(CmsSiteSettingsAdminService);
  private readonly genericModelService = inject(CmsGenericModelAdminService);

  protected readonly task = computed(() => {
    const id = this.taskId();
    return id ? clerkTaskById(id) : undefined;
  });

  protected readonly showStaffSignInNote = computed(() => {
    const id = this.taskId();
    return (
      id != null &&
      (clerkTaskHasInAppEditor(id) || clerkTaskHasDynamicForm(id)) &&
      !this.staffAuth.isStaff()
    );
  });

  protected readonly dynamicFormFields = computed(() => {
    const id = this.taskId();
    return id ? clerkTaskFormFields(id) : [];
  });

  protected readonly showDynamicForm = computed(() => {
    const id = this.taskId();
    return id != null && clerkTaskHasDynamicForm(id) && !clerkTaskHasInAppEditor(id);
  });

  protected readonly dynamicForm = signal<Record<string, string | boolean>>({});
  protected readonly dynamicSubmitting = signal(false);
  protected readonly dynamicSubmitResult = signal<string | null>(null);
  protected readonly dynamicSubmitError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const fields = this.dynamicFormFields();
      this.dynamicForm.set(defaultDynamicFormValues(fields));
      this.dynamicSubmitResult.set(null);
      this.dynamicSubmitError.set(null);
    });
  }

  ngOnInit(): void {
    void this.staffAuth.refreshSession();
  }

  protected readonly verifySteps = CLERK_VERIFY_STEPS;

  // Simple form state for Add Meeting (Event)
  protected readonly eventForm = signal({
    title: '',
    start: '',
    location: '',
    description: '',
    active: true,
  });
  protected readonly eventSubmitting = signal(false);
  protected readonly eventResult = signal<string | null>(null);
  protected readonly eventError = signal<string | null>(null);

  protected updateEventForm(field: string, value: string | boolean) {
    this.eventForm.update((f) => ({ ...f, [field]: value }));
  }

  protected async submitEvent() {
    const form = this.eventForm();
    if (!form.title || !form.start) {
      this.eventError.set('Title and Start time are required.');
      return;
    }
    this.eventSubmitting.set(true);
    this.eventError.set(null);
    this.eventResult.set(null);
    try {
      const id = await this.eventService.createEvent({
        title: form.title,
        start: form.start,
        location: form.location || undefined,
        description: form.description || undefined,
        active: form.active,
      });
      this.eventResult.set(`Event created with ID: ${id}. Check /meetings after hard-refresh.`);
      // Reset form
      this.eventForm.set({ title: '', start: '', location: '', description: '', active: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message?: unknown }).message)
            : '';
      this.eventError.set(msg || 'Failed to create event. Check staff login and try again.');
    } finally {
      this.eventSubmitting.set(false);
    }
  }

  protected isAddMeetingTask(): boolean {
    return this.taskId() === 'add-meeting';
  }

  // Simple form state for Post Notice (Announcement)
  protected readonly announcementForm = signal({
    title: '',
    detail: '',
    date: '',
    announcementKind: '',
    attachmentKey: '',
    active: true,
  });
  protected readonly announcementSubmitting = signal(false);
  protected readonly announcementResult = signal<string | null>(null);
  protected readonly announcementError = signal<string | null>(null);

  protected updateAnnouncementForm(field: string, value: string | boolean) {
    this.announcementForm.update((f) => ({ ...f, [field]: value }));
  }

  protected async submitAnnouncement() {
    const form = this.announcementForm();
    if (!form.title || !form.detail) {
      this.announcementError.set('Title and Detail are required.');
      return;
    }
    this.announcementSubmitting.set(true);
    this.announcementError.set(null);
    this.announcementResult.set(null);
    try {
      const id = await this.announcementService.createAnnouncement({
        title: form.title,
        detail: form.detail,
        date: form.date || undefined,
        announcementKind: form.announcementKind || undefined,
        attachmentKey: form.attachmentKey || undefined,
        active: form.active,
      });
      this.announcementResult.set(
        `Notice created with ID: ${id}. Check /news or /notices after hard-refresh.`,
      );
      // Reset form
      this.announcementForm.set({
        title: '',
        detail: '',
        date: '',
        announcementKind: '',
        attachmentKey: '',
        active: true,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message?: unknown }).message)
            : '';
      this.announcementError.set(
        msg || 'Failed to create notice. Check staff login and try again.',
      );
    } finally {
      this.announcementSubmitting.set(false);
    }
  }

  protected isPostNoticeTask(): boolean {
    return this.taskId() === 'post-notice';
  }

  // Simple form state for Emergency Banner (AlertBanner) - new in-app support for full CMS
  protected readonly bannerForm = signal({
    enabled: true,
    label: '',
    title: '',
    detail: '',
    linkLabel: '',
    linkHref: '',
  });
  protected readonly bannerSubmitting = signal(false);
  protected readonly bannerResult = signal<string | null>(null);
  protected readonly bannerError = signal<string | null>(null);

  protected updateBannerForm(field: string, value: string | boolean) {
    this.bannerForm.update((f) => ({ ...f, [field]: value }));
  }

  protected async submitBanner() {
    const form = this.bannerForm();
    if (!form.title || !form.detail || !form.label) {
      this.bannerError.set('Label, Title and Detail are required for banner.');
      return;
    }
    this.bannerSubmitting.set(true);
    this.bannerError.set(null);
    this.bannerResult.set(null);
    try {
      const id = await this.alertBannerService.createAlertBanner({
        enabled: form.enabled,
        label: form.label,
        title: form.title,
        detail: form.detail,
        linkLabel: form.linkLabel || undefined,
        linkHref: form.linkHref || undefined,
      });
      this.bannerResult.set(
        `Banner created with ID: ${id}. Check homepage top strip after hard-refresh.`,
      );
      this.bannerForm.set({
        enabled: true,
        label: '',
        title: '',
        detail: '',
        linkLabel: '',
        linkHref: '',
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message?: unknown }).message)
            : '';
      this.bannerError.set(msg || 'Failed to create banner. Check staff login and try again.');
    } finally {
      this.bannerSubmitting.set(false);
    }
  }

  protected isEmergencyBannerTask(): boolean {
    return this.taskId() === 'emergency-banner';
  }

  // Simple form state for Homepage / SiteSettings (create example; typically edit existing row)
  protected readonly settingsForm = signal({
    townName: 'Town of Wiley',
    officeHours: '',
    address: '',
    phone: '',
    email: '',
    pageTitle: '',
    heroEyebrow: '',
    heroStatus: '',
    heroTitle: '',
    heroMessage: '',
    heroSubtext: '',
    heroImageUrl: '',
    welcomeLabel: '',
    welcomeHeading: '',
    welcomeBody: '',
    welcomeCaption: '',
  });
  protected readonly settingsSubmitting = signal(false);
  protected readonly settingsResult = signal<string | null>(null);
  protected readonly settingsError = signal<string | null>(null);

  protected updateSettingsForm(field: string, value: string) {
    this.settingsForm.update((f) => ({ ...f, [field]: value }));
  }

  protected async submitSettings() {
    const form = this.settingsForm();
    if (!form.townName) {
      this.settingsError.set('Town name is required.');
      return;
    }
    this.settingsSubmitting.set(true);
    this.settingsError.set(null);
    this.settingsResult.set(null);
    try {
      const id = await this.siteSettingsService.createSiteSettings({
        townName: form.townName,
        officeHours: form.officeHours || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        pageTitle: form.pageTitle || undefined,
        heroEyebrow: form.heroEyebrow || undefined,
        heroStatus: form.heroStatus || undefined,
        heroTitle: form.heroTitle || undefined,
        heroMessage: form.heroMessage || undefined,
        heroSubtext: form.heroSubtext || undefined,
        welcomeLabel: form.welcomeLabel || undefined,
        welcomeHeading: form.welcomeHeading || undefined,
        welcomeBody: form.welcomeBody || undefined,
        welcomeCaption: form.welcomeCaption || undefined,
        heroImageUrl: form.heroImageUrl || undefined,
      });
      this.settingsResult.set(
        `SiteSettings created with ID: ${id}. Hard-refresh / to verify hero/welcome.`,
      );
      this.settingsForm.set({
        townName: 'Town of Wiley',
        officeHours: '',
        address: '',
        phone: '',
        email: '',
        pageTitle: '',
        heroEyebrow: '',
        heroStatus: '',
        heroTitle: '',
        heroMessage: '',
        heroSubtext: '',
        heroImageUrl: '',
        welcomeLabel: '',
        welcomeHeading: '',
        welcomeBody: '',
        welcomeCaption: '',
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message?: unknown }).message)
            : '';
      this.settingsError.set(
        msg || 'Failed to create settings. Ask IT to update existing rows or check staff login.',
      );
    } finally {
      this.settingsSubmitting.set(false);
    }
  }

  protected isHomepageTask(): boolean {
    return this.taskId() === 'homepage';
  }

  protected updateDynamicForm(field: string, value: string | boolean): void {
    this.dynamicForm.update((current) => ({ ...current, [field]: value }));
  }

  protected dynamicFieldValue(field: ClerkFormFieldDefinition): string | boolean {
    const value = this.dynamicForm()[field.name];
    if (field.type === 'checkbox') {
      return value === true;
    }
    return typeof value === 'string' ? value : '';
  }

  protected async submitDynamicForm(): Promise<void> {
    const task = this.task();
    if (!task) {
      return;
    }

    const fields = this.dynamicFormFields();
    const raw = this.dynamicForm();
    const input: Record<string, unknown> = {};

    for (const field of fields) {
      const value = raw[field.name];
      if (field.type === 'checkbox') {
        input[field.name] = value === true;
        continue;
      }
      const text = typeof value === 'string' ? value.trim() : '';
      if (!text) {
        if (field.required) {
          this.dynamicSubmitError.set(`${field.label} is required.`);
          return;
        }
        continue;
      }
      if (field.type === 'number') {
        const parsed = Number(text);
        if (Number.isNaN(parsed)) {
          this.dynamicSubmitError.set(`${field.label} must be a number.`);
          return;
        }
        input[field.name] = parsed;
      } else if (field.name === 'keywords') {
        input[field.name] = text
          .split(',')
          .map((keyword) => keyword.trim())
          .filter(Boolean);
      } else {
        input[field.name] = text;
      }
    }

    this.dynamicSubmitting.set(true);
    this.dynamicSubmitError.set(null);
    this.dynamicSubmitResult.set(null);
    try {
      const id = await this.genericModelService.createModel(task.model, input);
      this.dynamicSubmitResult.set(
        `${task.model} saved with ID ${id}. Open See on website and hard-refresh ${task.previewPath}.`,
      );
      this.dynamicForm.set(defaultDynamicFormValues(fields));
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message?: unknown }).message)
            : '';
      this.dynamicSubmitError.set(
        msg || `Could not save ${task.model}. Sign in at /admin/login and try again.`,
      );
    } finally {
      this.dynamicSubmitting.set(false);
    }
  }
}
