import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Ripple } from 'primeng/ripple';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { APP_COPY } from '../app';
import { DOCUMENT_HUB_LINKS } from '../document-hub/document-links';
import { DocumentUploadService } from '../document-upload.service';
import {
  openAgendaPdfInNewTab,
  resolveAgendaUrlsByEventId,
  showAgendaUnavailableToast,
} from '../meeting-agenda-actions';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import {
  buildCalendarItems,
  buildMeetingItems,
  type CalendarAction,
  type CalendarItem,
  type MeetingItem,
} from './meetings-page.helpers';

@Component({
  selector: 'app-meetings-page',
  imports: [
    ButtonModule,
    CardModule,
    FullCalendarModule,
    SkeletonModule,
    Ripple,
    RouterLink,
    TableModule,
  ],
  templateUrl: './meetings-page.html',
  styleUrl: './meetings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeetingsPage {
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly documentUploadService = inject(DocumentUploadService);
  private readonly messages = inject(MessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly meetingDocumentsHref = DOCUMENT_HUB_LINKS.meetings;
  protected readonly cmsLoading = this.cmsStore.isLoading;
  protected readonly resolvedAgendaUrls = signal<Record<string, string>>({});

  protected readonly copy = computed(
    () => APP_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );
  protected readonly isBrowser = computed(() => isPlatformBrowser(this.platformId));
  private readonly liveCalendarEvents = this.cmsStore.events;
  protected readonly meetings = computed<MeetingItem[]>(() => {
    return buildMeetingItems(
      this.liveCalendarEvents(),
      this.copy().meetings,
      {
        calendarCopy: this.copy().calendarCopy,
        calendarEventFallbackLocation: this.copy().calendarEventFallbackLocation,
        agendaPdfButtonLabel: this.copy().meetingsAgendaPdfButtonLabel,
        meetingsAgendaLinkedButtonLabel: this.copy().meetingsAgendaLinkedButtonLabel,
        documentsHubButtonLabel: this.copy().meetingsDocumentsHubButtonLabel,
      },
      this.siteLanguageService.currentLanguage() === 'es' ? 'es-US' : 'en-US',
      this.cmsStore.linkedAgendaDocumentByEventId(),
    );
  });
  protected readonly calendarItems = computed<CalendarItem[]>(() => {
    return buildCalendarItems(
      this.liveCalendarEvents(),
      this.copy().calendarSeeds,
      {
        calendarPublishedEventCategory: this.copy().calendarPublishedEventCategory,
        calendarEventFallbackDetail: this.copy().calendarEventFallbackDetail,
        calendarEventFallbackLocation: this.copy().calendarEventFallbackLocation,
        calendarScheduledEventLabel: this.copy().calendarScheduledEventLabel,
        calendarGoogleActionLabel: this.copy().calendarGoogleActionLabel,
        calendarDownloadActionLabel: this.copy().calendarDownloadActionLabel,
        calendarAgendaActionLabel: this.copy().calendarAgendaActionLabel,
        calendarAgendaLinkedActionLabel: this.copy().calendarAgendaLinkedActionLabel,
      },
      this.siteLanguageService.currentLanguage() === 'es' ? 'es-US' : 'en-US',
      this.cmsStore.linkedAgendaDocumentByEventId(),
    );
  });
  protected readonly calendarOptions = computed(() => ({
    plugins: [dayGridPlugin],
    initialView: 'dayGridMonth',
    buttonIcons: false as const,
    events: this.calendarItems().map((item) => ({
      title: item.title,
      start: item.startDate,
      end: item.endDate,
      allDay: false,
    })),
  }));

  constructor() {
    effect(() => {
      const linked = this.cmsStore.linkedAgendaDocumentByEventId();
      void this.refreshResolvedAgendaUrls(linked);
    });
  }

  protected calendarActionTrackKey(action: CalendarAction, index: number): string {
    return `${action.label}-${index}`;
  }

  protected openMeetingAgenda(meeting: MeetingItem): void {
    if (meeting.eventId && meeting.hasLinkedAgenda) {
      this.openAgendaForEvent(meeting.eventId);
      return;
    }

    if (meeting.agendaPdfHref) {
      if (typeof window !== 'undefined') {
        window.location.assign(meeting.agendaPdfHref);
      }
      return;
    }

    this.showAgendaUnavailableToast();
  }

  protected openCalendarAgenda(item: CalendarItem): void {
    if (item.id && item.hasLinkedAgenda) {
      this.openAgendaForEvent(item.id);
      return;
    }

    this.showAgendaUnavailableToast();
  }

  private openAgendaForEvent(eventId: string): void {
    const url = this.resolvedAgendaUrls()[eventId];
    if (url) {
      openAgendaPdfInNewTab(url);
      return;
    }

    void this.documentUploadService
      .resolveDocumentHref(
        this.cmsStore.linkedAgendaDocumentByEventId()[eventId]?.storageHref ?? '',
      )
      .then((resolved) => {
        openAgendaPdfInNewTab(resolved);
      })
      .catch(() => {
        this.showAgendaUnavailableToast();
      });
  }

  private showAgendaUnavailableToast(): void {
    const copy = this.copy();
    showAgendaUnavailableToast(this.messages, {
      summary: copy.meetingsAgendaUnavailableToastSummary,
      detail: copy.meetingsAgendaUnavailableToastDetail,
    });
  }

  private async refreshResolvedAgendaUrls(
    linked: Record<string, { documentId: string; storageHref: string }>,
  ): Promise<void> {
    if (Object.keys(linked).length === 0) {
      this.resolvedAgendaUrls.set({});
      this.cdr.markForCheck();
      return;
    }

    try {
      const resolved = await resolveAgendaUrlsByEventId(linked, (href) =>
        this.documentUploadService.resolveDocumentHref(href),
      );
      this.resolvedAgendaUrls.set(resolved);
    } catch {
      this.resolvedAgendaUrls.set({});
    } finally {
      this.cdr.markForCheck();
    }
  }
}
