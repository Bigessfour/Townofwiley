import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CLERK_VERIFY_STEPS, clerkTaskById, type ClerkCmsTaskId } from './cms-clerk-tasks';
import { CmsEventAdminService } from '../cms-event-admin.service';
import { CmsAnnouncementAdminService } from '../cms-announcement-admin.service';
import { CmsAlertBannerAdminService } from '../cms-alert-banner-admin.service';
import { CmsSiteSettingsAdminService } from '../cms-site-settings-admin.service';
import { CmsGenericModelAdminService } from '../cms-generic-model-admin.service';

@Component({
  selector: 'app-cms-clerk-task-guide',
  standalone: true,
  templateUrl: './cms-clerk-task-guide.component.html',
  styleUrl: './cms-clerk-task-guide.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsClerkTaskGuideComponent {
  readonly taskId = input<ClerkCmsTaskId | null>(null);

  private readonly eventService = inject(CmsEventAdminService);
  private readonly announcementService = inject(CmsAnnouncementAdminService);
  private readonly alertBannerService = inject(CmsAlertBannerAdminService);
  private readonly siteSettingsService = inject(CmsSiteSettingsAdminService);
  private readonly genericModelService = inject(CmsGenericModelAdminService);

  protected readonly task = computed(() => {
    const id = this.taskId();
    return id ? clerkTaskById(id) : undefined;
  });

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
    heroTitle: '',
    heroMessage: '',
    welcomeHeading: '',
    welcomeBody: '',
    heroImageUrl: '',
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
        heroTitle: form.heroTitle || undefined,
        heroMessage: form.heroMessage || undefined,
        welcomeHeading: form.welcomeHeading || undefined,
        welcomeBody: form.welcomeBody || undefined,
        heroImageUrl: form.heroImageUrl || undefined,
      });
      this.settingsResult.set(
        `SiteSettings created with ID: ${id}. Hard-refresh / to verify hero/welcome.`,
      );
      this.settingsForm.set({
        townName: 'Town of Wiley',
        heroTitle: '',
        heroMessage: '',
        welcomeHeading: '',
        welcomeBody: '',
        heroImageUrl: '',
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message?: unknown }).message)
            : '';
      this.settingsError.set(
        msg || 'Failed to create settings. Use AppSync edit for existing row or check login.',
      );
    } finally {
      this.settingsSubmitting.set(false);
    }
  }

  protected isHomepageTask(): boolean {
    return this.taskId() === 'homepage';
  }

  // Demo of generic CRUD helper (lists count for any model from inventory; create via generic)
  protected readonly genericResult = signal<string | null>(null);
  protected async demoGenericCreate(model: string) {
    this.genericResult.set(null);
    try {
      // Minimal input for demo - real use would pull from dynamic form
      const id = await this.genericModelService.createModel(model, {
        title: `Demo ${model} via generic`,
        active: true,
        detail: 'Created from /admin generic editor foundation.',
      });
      this.genericResult.set(
        `Generic create for ${model} OK, id=${id}. Extend form per cms-model-inventory.ts for full CRUD table.`,
      );
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message?: unknown }).message)
            : '';
      this.genericResult.set(
        `Generic create demo for ${model} note: ${msg || 'see console (may require full input fields or existing row)'}`,
      );
    }
  }
}
