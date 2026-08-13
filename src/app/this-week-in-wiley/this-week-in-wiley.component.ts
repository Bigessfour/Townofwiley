import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CommunityCalendarService } from '../community-calendar/community-calendar.service';
import { COMMUNITY_CATEGORY_ICONS } from '../community-calendar/community-calendar.types';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import { selectThisWeekOrUpcoming, type ThisWeekEventItem } from './this-week-events';

const COPY = {
  en: {
    kicker: 'Calendar',
    thisWeekHeading: 'This week in Wiley',
    comingUpHeading: 'Coming up in Wiley',
    empty:
      'No upcoming events are posted yet. Check the town calendar for meetings and community gatherings.',
    viewCalendar: 'Open the calendar',
    communityBadge: 'Community',
    officialBadge: 'Town meeting',
  },
  es: {
    kicker: 'Calendario',
    thisWeekHeading: 'Esta semana en Wiley',
    comingUpHeading: 'Próximamente en Wiley',
    empty:
      'Todavía no hay eventos próximos. Consulte el calendario del pueblo para reuniones y eventos comunitarios.',
    viewCalendar: 'Abrir el calendario',
    communityBadge: 'Comunidad',
    officialBadge: 'Reunión del pueblo',
  },
} as const;

@Component({
  selector: 'app-this-week-in-wiley',
  imports: [ButtonModule, RouterLink],
  templateUrl: './this-week-in-wiley.component.html',
  styleUrl: './this-week-in-wiley.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThisWeekInWileyComponent implements OnInit {
  private readonly communityCalendar = inject(CommunityCalendarService);
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguage = inject(SiteLanguageService);

  protected readonly categoryIcons = COMMUNITY_CATEGORY_ICONS;
  private readonly communityItems = signal<ThisWeekEventItem[]>([]);

  protected readonly copy = computed(
    () => COPY[this.siteLanguage.currentLanguage() === 'es' ? 'es' : 'en'],
  );

  protected readonly selection = computed(() => {
    const official: ThisWeekEventItem[] = this.cmsStore.events().map((event) => ({
      id: `official-${event.id}`,
      title: event.title,
      startDateTime: event.start,
      endDateTime: event.end,
      location: event.location,
      source: 'official' as const,
      href: `/meetings#event-${event.id}`,
    }));
    return selectThisWeekOrUpcoming([...official, ...this.communityItems()]);
  });

  protected readonly heading = computed(() => {
    const c = this.copy();
    return this.selection().mode === 'thisWeek' ? c.thisWeekHeading : c.comingUpHeading;
  });

  protected formatWhen(iso: string): string {
    const locale = this.siteLanguage.currentLanguage() === 'es' ? 'es-US' : 'en-US';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  ngOnInit(): void {
    this.communityCalendar.listEvents().subscribe({
      next: (events) => {
        this.communityItems.set(
          events.map((event) => ({
            id: `community-${event.eventId}`,
            title: event.title,
            startDateTime: event.startDateTime,
            endDateTime: event.endDateTime,
            location: event.location,
            source: 'community' as const,
            href: '/meetings#community',
          })),
        );
      },
      error: () => this.communityItems.set([]),
    });
  }
}
