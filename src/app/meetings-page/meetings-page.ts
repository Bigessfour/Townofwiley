import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Ripple } from 'primeng/ripple';
import { TableModule } from 'primeng/table';
import { APP_COPY } from '../app';
import { DOCUMENT_HUB_LINKS } from '../document-hub/document-links';
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
    ProgressSpinnerModule,
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

  protected readonly meetingDocumentsHref = DOCUMENT_HUB_LINKS.meetings;
  protected readonly cmsLoading = this.cmsStore.isLoading;

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
        documentsHubButtonLabel: this.copy().meetingsDocumentsHubButtonLabel,
      },
      this.siteLanguageService.currentLanguage() === 'es' ? 'es-US' : 'en-US',
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
      },
      this.siteLanguageService.currentLanguage() === 'es' ? 'es-US' : 'en-US',
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

  protected isMeetingDocumentsLink(href: string): boolean {
    return href === DOCUMENT_HUB_LINKS.meetings;
  }

  protected calendarActionTrackKey(action: CalendarAction, index: number): string {
    return `${action.label}-${index}`;
  }
}
