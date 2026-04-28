import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import { CardModule } from 'primeng/card';
import { APP_COPY } from '../app';
import { LocalizedCmsContentStore, type CmsCalendarEvent } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';

interface MeetingItem {
  title: string;
  schedule: string;
  format: string;
  location?: string;
  agendaNote?: string;
  cta?: string;
  href?: string;
}

interface CalendarAction {
  label: string;
  href: string;
  downloadFileName?: string;
  external?: boolean;
}

interface CalendarItem {
  id: string;
  title: string;
  date: string;
  category: string;
  detail: string;
  location: string;
  recurrence: string;
  agendaNote?: string;
  actions: CalendarAction[];
  startDate: Date;
  endDate: Date;
}

@Component({
  selector: 'app-meetings-page',
  imports: [CardModule, FullCalendarModule, RouterLink],
  templateUrl: './meetings-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeetingsPage {
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly copy = computed(() => APP_COPY[this.siteLanguageService.currentLanguage() || 'en']);
  protected readonly isBrowser = computed(() => isPlatformBrowser(this.platformId));
  private readonly liveCalendarEvents = this.cmsStore.events;
  protected readonly meetings = computed<MeetingItem[]>(() => {
    const liveEvents = this.liveCalendarEvents();
    return liveEvents.length > 0 ? liveEvents.map((event) => this.createMeetingItemFromEvent(event)) : this.copy().meetings;
  });
  protected readonly calendarItems = computed<CalendarItem[]>(() => {
    const liveEvents = this.liveCalendarEvents();
    if (liveEvents.length > 0) {
      return liveEvents.map((event) => this.createCalendarItemFromEvent(event));
    }
    return this.copy().calendarSeeds.map((seed, index) => ({
      id: `seed-${seed.slug}-${index}`,
      title: seed.title,
      date: seed.dateLabel,
      category: seed.category,
      detail: seed.detail,
      location: seed.location,
      recurrence: seed.recurrence,
      agendaNote: seed.agendaNote,
      actions: seed.extraActions ?? [],
      startDate: this.parseCalendarSeedDate(seed.startLocal),
      endDate: this.parseCalendarSeedDate(seed.endLocal),
    }));
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

  private createMeetingItemFromEvent(event: CmsCalendarEvent): MeetingItem {
    const start = new Date(event.start);
    const end = this.resolveCalendarEventEnd(event);
    return {
      title: event.title,
      schedule: this.formatCalendarEventDate(start, end),
      format: event.description || this.copy().calendarCopy,
      location: event.location || this.copy().calendarEventFallbackLocation,
    };
  }

  private createCalendarItemFromEvent(event: CmsCalendarEvent): CalendarItem {
    const start = new Date(event.start);
    const end = this.resolveCalendarEventEnd(event);
    return {
      id: event.id,
      title: event.title,
      date: this.formatCalendarEventDate(start, end),
      category: this.copy().calendarPublishedEventCategory,
      detail: event.description || this.copy().calendarEventFallbackDetail,
      location: event.location || this.copy().calendarEventFallbackLocation,
      recurrence: this.copy().calendarScheduledEventLabel,
      actions: [],
      startDate: start,
      endDate: end,
    };
  }

  private resolveCalendarEventEnd(event: CmsCalendarEvent): Date {
    if (event.end) {
      const explicitEnd = new Date(event.end);

      if (!Number.isNaN(explicitEnd.getTime())) {
        return explicitEnd;
      }
    }

    const defaultEnd = new Date(event.start);
    defaultEnd.setHours(defaultEnd.getHours() + 1);

    return defaultEnd;
  }

  private parseCalendarSeedDate(value: string): Date {
    const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(value);

    if (!match) {
      return new Date(0);
    }

    const [, year, month, day, hour, minute, second] = match;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
  }

  private formatCalendarEventDate(start: Date, end: Date): string {
    const locale = this.siteLanguageService.currentLanguage() === 'es' ? 'es-US' : 'en-US';
    const formatter = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    const startLabel = formatter.format(start);
    const endLabel = formatter.format(end);
    return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
  }
}
