import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
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
import type { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { Ripple } from 'primeng/ripple';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { APP_COPY } from '../app';
import { CommunityCalendarPanel } from '../community-calendar/community-calendar.page';
import { COMMUNITY_CALENDAR_COPY } from '../community-calendar/community-calendar.copy';
import type { CommunityEvent } from '../community-calendar/community-calendar.types';
import { DocumentUploadService } from '../document-upload.service';
import {
  openAgendaPdfInNewTab,
  resolveAgendaUrlsByEventId,
  showAgendaUnavailableToast,
} from '../meeting-agenda-actions';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import { MeetingDocumentsArchiveComponent } from './meeting-documents-archive.component';
import {
  buildCalendarItems,
  buildMeetingItems,
  type CalendarAction,
  type CalendarItem,
  type MeetingItem,
} from './meetings-page.helpers';

export type MeetingsSourceFilter = 'all' | 'official' | 'community';

interface SelectedCalendarEvent {
  id: string;
  source: 'official' | 'community';
  title: string;
  whenLabel: string;
  detail: string;
  location: string;
  agendaNote?: string;
  officialItem?: CalendarItem;
  communityItem?: CommunityEvent;
}

@Component({
  selector: 'app-meetings-page',
  imports: [
    ButtonModule,
    CardModule,
    CommunityCalendarPanel,
    FormsModule,
    FullCalendarModule,
    MeetingDocumentsArchiveComponent,
    SelectButtonModule,
    SkeletonModule,
    Ripple,
    RouterLink,
    TableModule,
  ],
  templateUrl: './meetings-page.html',
  styleUrl: './meetings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeetingsPage implements AfterViewInit {
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly documentUploadService = inject(DocumentUploadService);
  private readonly messages = inject(MessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly cmsLoading = this.cmsStore.isLoading;
  protected readonly resolvedAgendaUrls = signal<Record<string, string>>({});
  protected readonly sourceFilter = signal<MeetingsSourceFilter>('all');
  protected readonly communityEvents = signal<CommunityEvent[]>([]);
  protected readonly selectedCalendarEvent = signal<SelectedCalendarEvent | null>(null);

  protected readonly copy = computed(
    () => APP_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );
  protected readonly communityCopy = computed(
    () => COMMUNITY_CALENDAR_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );
  protected readonly isBrowser = computed(() => isPlatformBrowser(this.platformId));

  protected readonly sourceFilterOptions = computed(() => {
    const c = this.communityCopy();
    return [
      { label: c.sourceFilterAll, value: 'all' as const },
      { label: c.sourceFilterOfficial, value: 'official' as const },
      { label: c.sourceFilterCommunity, value: 'community' as const },
    ];
  });

  protected readonly showOfficial = computed(() => {
    const filter = this.sourceFilter();
    return filter === 'all' || filter === 'official';
  });

  protected readonly showCommunity = computed(() => {
    const filter = this.sourceFilter();
    return filter === 'all' || filter === 'community';
  });

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

  protected readonly nextMeeting = computed(() => this.meetings()[0] ?? null);

  protected readonly calendarOptions = computed<CalendarOptions>(() => {
    const filter = this.sourceFilter();
    const selectedId = this.selectedCalendarEvent()?.id ?? null;
    const events: EventInput[] = [];

    if (filter === 'all' || filter === 'official') {
      for (const item of this.calendarItems()) {
        const id = `official-${item.id}`;
        events.push({
          id,
          title: item.title,
          start: item.startDate,
          end: item.endDate,
          allDay: false,
          // Solid hex for FullCalendar inline styles (vars/color-mix are unreliable there).
          display: 'block',
          backgroundColor: '#e0e6e9',
          borderColor: '#1f4e5f',
          textColor: '#12313c',
          classNames: [
            'fc-event--official',
            ...(selectedId === id ? ['fc-event--selected'] : []),
          ],
          extendedProps: { source: 'official', officialItemId: item.id },
        });
      }
    }

    if (filter === 'all' || filter === 'community') {
      for (const item of this.communityEvents()) {
        const id = `community-${item.eventId}`;
        events.push({
          id,
          title: item.title,
          start: item.startDateTime,
          end: item.endDateTime,
          allDay: false,
          display: 'block',
          backgroundColor: '#f0e5c2',
          borderColor: '#a8841a',
          textColor: '#1f2a2e',
          classNames: [
            'fc-event--community',
            ...(selectedId === id ? ['fc-event--selected'] : []),
          ],
          extendedProps: { source: 'community', communityEventId: item.eventId },
        });
      }
    }

    return {
      plugins: [dayGridPlugin],
      initialView: 'dayGridMonth',
      buttonIcons: false as const,
      height: 'auto',
      // Prefer solid month chips over list-item/dot style (dot + dark title washout).
      eventDisplay: 'block',
      events,
      eventClick: (info) => this.onCalendarEventClick(info),
    };
  });

  constructor() {
    effect(() => {
      const linked = this.cmsStore.linkedAgendaDocumentByEventId();
      void this.refreshResolvedAgendaUrls(linked);
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const hash = window.location.hash.replace(/^#/, '');
    if (hash === 'community') {
      queueMicrotask(() => {
        document.getElementById('community')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  protected onCommunityEvents(events: CommunityEvent[]): void {
    this.communityEvents.set(events);
    const selected = this.selectedCalendarEvent();
    if (selected?.source === 'community') {
      const stillPresent = events.some((event) => event.eventId === selected.communityItem?.eventId);
      if (!stillPresent) {
        this.selectedCalendarEvent.set(null);
      }
    }
  }

  protected onSourceFilter(value: MeetingsSourceFilter | null): void {
    if (value) {
      this.sourceFilter.set(value);
      this.selectedCalendarEvent.set(null);
    }
  }

  protected clearCalendarSelection(): void {
    this.selectedCalendarEvent.set(null);
  }

  protected onCalendarEventClick(info: EventClickArg): void {
    info.jsEvent.preventDefault();
    const source = info.event.extendedProps['source'];
    if (source === 'official') {
      const officialId = String(info.event.extendedProps['officialItemId'] || '');
      const item = this.calendarItems().find((row) => row.id === officialId);
      if (!item) {
        return;
      }
      this.selectedCalendarEvent.set({
        id: `official-${item.id}`,
        source: 'official',
        title: item.title,
        whenLabel: item.date,
        detail: item.detail,
        location: item.location,
        agendaNote: item.agendaNote,
        officialItem: item,
      });
      this.cdr.markForCheck();
      return;
    }

    if (source === 'community') {
      const communityId = String(info.event.extendedProps['communityEventId'] || '');
      const item = this.communityEvents().find((row) => row.eventId === communityId);
      if (!item) {
        return;
      }
      const locale = this.siteLanguageService.currentLanguage() === 'es' ? 'es-US' : 'en-US';
      const start = new Date(item.startDateTime);
      const end = item.endDateTime ? new Date(item.endDateTime) : null;
      const whenLabel = end
        ? `${start.toLocaleString(locale)} – ${end.toLocaleTimeString(locale, {
            hour: 'numeric',
            minute: '2-digit',
          })}`
        : start.toLocaleString(locale);
      this.selectedCalendarEvent.set({
        id: `community-${item.eventId}`,
        source: 'community',
        title: item.title,
        whenLabel,
        detail: item.description,
        location: item.location,
        communityItem: item,
      });
      this.cdr.markForCheck();
    }
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
