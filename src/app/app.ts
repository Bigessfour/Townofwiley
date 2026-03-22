import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { AiChat } from './ai-chat/ai-chat';
import { CmsAdmin } from './cms-admin/cms-admin';
import { CmsContentStore } from './cms-content';
import { getChatbotRuntimeConfig } from './chatbot-config';
import { WeatherPanel } from './weather-panel/weather-panel';

interface NavLink {
  label: string;
  href: string;
}

interface TopTask {
  title: string;
  description: string;
  href: string;
  note: string;
}

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
  title: string;
  date: string;
  category: string;
  detail: string;
  location: string;
  recurrence: string;
  agendaNote?: string;
  actions: CalendarAction[];
}

interface CalendarEventSeed {
  title: string;
  dateLabel: string;
  category: string;
  detail: string;
  location: string;
  recurrence: string;
  agendaNote?: string;
  startLocal: string;
  endLocal: string;
  recurrenceRule?: string;
  extraActions?: CalendarAction[];
  slug: string;
}

interface ServiceCard {
  title: string;
  availability: string;
  description: string;
  href: string;
  cta: string;
}

interface TransparencyItem {
  title: string;
  detail: string;
}

interface AccessibilityItem {
  title: string;
  detail: string;
}

interface LeadershipGroup {
  title: string;
  detail: string;
  members: string[];
}

interface SearchItem {
  title: string;
  summary: string;
  category: string;
  href: string;
  keywords: string[];
}

interface CommunityFact {
  label: string;
  value: string;
  detail: string;
}

@Component({
  selector: 'app-root',
  imports: [NgOptimizedImage, AiChat, WeatherPanel, CmsAdmin],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly cmsStore = inject(CmsContentStore);
  private readonly chatbotConfig = getChatbotRuntimeConfig();
  private readonly mainContent = viewChild<ElementRef<HTMLElement>>('mainContent');

  protected readonly searchQuery = signal('');
  protected readonly currentYear = new Date().getFullYear();
  protected readonly isAdminMode =
    typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/admin';
  protected readonly isProgrammaticChatEnabled =
    this.chatbotConfig.mode === 'api' && Boolean(this.chatbotConfig.apiEndpoint);
  protected readonly heroContent = this.cmsStore.hero;
  protected readonly alertBanner = this.cmsStore.alertBanner;
  protected readonly pageTitle = computed(() => this.heroContent().title);
  protected readonly notices = this.cmsStore.notices;
  protected readonly contacts = this.cmsStore.contacts;

  protected focusMainContent(): void {
    queueMicrotask(() => {
      this.mainContent()?.nativeElement.focus();
    });
  }

  protected readonly communityFacts: CommunityFact[] = [
    {
      label: 'Town profile',
      value: 'Wiley is a small statutory town in Prowers County',
      detail:
        'With a 2020 population of about 437 residents, the homepage should stay direct, practical, and easy to scan on phones.',
    },
    {
      label: 'Location',
      value: 'Eastern Colorado plains, ZIP code 81092',
      detail:
        'The site should prioritize weather-sensitive notices, utility updates, road information, and core local services over large-city portal complexity.',
    },
    {
      label: 'Regional access',
      value: 'Near US 287 and centered on local civic life',
      detail:
        'Residents need fast access to meetings, Town Hall contacts, school and community event notices, and everyday service tasks.',
    },
  ];

  protected readonly navLinks: NavLink[] = [
    {
      label: 'Top Tasks',
      href: '#top-tasks',
    },
    {
      label: 'Weather',
      href: '#weather',
    },
    {
      label: 'Notices',
      href: '#alerts',
    },
    {
      label: 'Calendar',
      href: '#calendar',
    },
    {
      label: 'Services',
      href: '#services',
    },
    {
      label: 'Records',
      href: '#records',
    },
    {
      label: 'Accessibility',
      href: '#accessibility',
    },
    {
      label: 'Contact',
      href: '#contact',
    },
  ];

  protected readonly topTasks: TopTask[] = [
    {
      title: 'Pay utility bill',
      description:
        'Surface water and utility payments immediately so residents are not forced to navigate a deep department structure.',
      href: '#services',
      note: 'Payment links should warn that they open a separate secure payment provider.',
    },
    {
      title: 'Report a street or utility issue',
      description:
        'Give residents a direct path for outages, potholes, drainage concerns, and streetlight issues without relying on phone tag.',
      href: '#services',
      note: 'Residents should be able to submit requests and track status without calling Town Hall.',
    },
    {
      title: 'Find a meeting or agenda',
      description:
        'Put board meetings, notices, agendas, and minutes directly on the homepage for a town where civic information should stay one click away.',
      href: '#alerts',
      note: 'Open meetings information should stay one click away from the homepage.',
    },
    {
      title: 'Request records, permits, or clerk help',
      description:
        'Group routine clerk and permit needs under plain-language labels so residents do not have to guess which office handles the task.',
      href: '#records',
      note: 'Use forms, clear instructions, and document standards that support WCAG 2.1 AA.',
    },
  ];

  protected readonly meetings: MeetingItem[] = [
    {
      title: 'City Council Regular Meeting',
      schedule: 'Every 2nd Monday of each month, starts promptly at 6:00 PM',
      format:
        'Agenda packets, approved minutes, livestream or recording links, and ADA-accessible documents should all publish through this meeting record.',
      location: 'Wiley Town Hall, 304 Main Street',
      agendaNote:
        'Residents should call Town Hall at (719) 829-4974 or email Deb Dillon at deb.dillon@townofwiley.gov if they wish time on the agenda.',
      cta: 'Add the recurring council meeting to your calendar',
      href: '#calendar',
    },
    {
      title: 'Planning and zoning review',
      schedule: 'First Thursday of each month, 5:30 PM',
      format:
        'Use this slot for hearing notices, staff reports, application deadlines, and map links.',
      location: 'Wiley Town Hall, 304 Main Street',
    },
    {
      title: 'Community calendar and school-centered events',
      schedule: 'Resident events, closures, and deadlines',
      format:
        'Calendar filters should separate meetings, alerts, school events, recreation, and facility reservations.',
      cta: 'Browse the calendar section',
      href: '#calendar',
    },
  ];

  protected readonly calendarItems: CalendarItem[] = [
    this.createCalendarItem({
      title: 'City Council Regular Meeting',
      dateLabel: 'Every 2nd Monday, 6:00 PM',
      category: 'City Council',
      detail:
        'Make this the canonical event record for agendas, minutes, livestream links, accessible attachments, cancellations, and room changes so residents know exactly where to look each month.',
      location: 'Wiley Town Hall, 304 Main Street',
      recurrence: 'Recurring monthly',
      agendaNote:
        'Residents should call Town Hall at (719) 829-4974 or email Deb Dillon at deb.dillon@townofwiley.gov if they wish to be placed on the agenda before the meeting opens.',
      startLocal: '20260413T180000',
      endLocal: '20260413T190000',
      recurrenceRule: 'FREQ=MONTHLY;BYDAY=2MO',
      extraActions: [
        {
          label: 'Call Town Hall',
          href: 'tel:+17198294974',
        },
        {
          label: 'Email the Clerk',
          href: 'mailto:deb.dillon@townofwiley.gov',
        },
      ],
      slug: 'city-council-regular-meeting',
    }),
    this.createCalendarItem({
      title: 'Planning and zoning review',
      dateLabel: 'First Thursday, 5:30 PM',
      category: 'Hearing and land use',
      detail:
        'Attach hearing notices, staff reports, filing deadlines, maps, and application packets directly to the event so the process stays transparent.',
      location: 'Wiley Town Hall, 304 Main Street',
      recurrence: 'Recurring monthly',
      startLocal: '20260402T173000',
      endLocal: '20260402T183000',
      recurrenceRule: 'FREQ=MONTHLY;BYDAY=1TH',
      slug: 'planning-zoning-review',
    }),
    this.createCalendarItem({
      title: 'Community deadlines and service updates',
      dateLabel: 'Seasonal deadlines, closures, and town reminders',
      category: 'Community calendar',
      detail:
        'Use calendar cards for cleanup days, utility interruptions, school-centered events, seasonal deadlines, and weather-sensitive notices instead of burying them in scattered updates.',
      location: 'Town-wide notices and service locations',
      recurrence: 'Operational updates',
      startLocal: '20260425T080000',
      endLocal: '20260425T090000',
      slug: 'community-deadlines-service-updates',
    }),
  ];

  protected readonly serviceCards: ServiceCard[] = [
    {
      title: 'Online payments',
      availability: 'Priority service',
      description:
        'Start with utility and routine fee payments, then expand to permits or court-related payments only when the workflows are stable.',
      href: '#contact',
      cta: 'Add payment portal and disclosure copy',
    },
    {
      title: 'Street, utility, and property issue reporting',
      availability: 'Self-service',
      description:
        'Focus on a few high-value request types first: utility concerns, potholes, signage, nuisance issues, and public works follow-up.',
      href: '#contact',
      cta: 'Define request categories and status messages',
    },
    {
      title: 'Permits and licenses',
      availability: 'Business-ready',
      description:
        'Provide application steps, document uploads, fee details, and status tracking without making residents or contractors drive in repeatedly.',
      href: '#records',
      cta: 'Map required forms and department routing',
    },
    {
      title: 'Weather, utility, and emergency alerts',
      availability: 'Multi-channel',
      description:
        'Pair website notices with SMS, email, and app notifications so wind, snow, outages, and service disruptions reach residents quickly.',
      href: '#alerts',
      cta: 'Establish alert topics and subscriber controls',
    },
    {
      title: 'Language access for critical services',
      availability: 'Inclusive access',
      description:
        'Start with critical notices, payment help, clerk services, and emergency updates so language access improves the most-used pages first.',
      href: '#accessibility',
      cta: 'Prioritize high-impact pages for translation',
    },
    {
      title: 'Search and document discovery',
      availability: 'Plain-language findability',
      description:
        'Help residents find agendas, forms, ordinances, and services using task-based queries rather than internal government terminology.',
      href: '#search-panel',
      cta: 'Expand search index and document metadata',
    },
  ];

  protected readonly transparencyItems: TransparencyItem[] = [
    {
      title: 'FOIA and public records',
      detail:
        'Publish records request instructions, fee worksheets, downloadable forms, and response timelines in one clearly labeled location.',
    },
    {
      title: 'Agendas, minutes, and budgets',
      detail:
        'Keep meeting packets, approved minutes, budget summaries, and annual reports searchable and downloadable in accessible formats.',
    },
    {
      title: 'Ordinances and code information',
      detail:
        'Give residents a straightforward way to locate municipal code, zoning references, and enforcement guidance.',
    },
    {
      title: 'Project and service status updates',
      detail:
        'Use status pages or compact dashboards to show road work, closures, utility projects, and request backlogs without forcing phone calls.',
    },
  ];

  protected readonly accessibilityItems: AccessibilityItem[] = [
    {
      title: 'Keyboard and screen-reader support',
      detail:
        'Maintain logical heading order, skip links, focus states, descriptive labels, and consistent navigation on every page.',
    },
    {
      title: 'Readable contrast and resize behavior',
      detail:
        'Keep text contrast at WCAG 2.1 AA levels and ensure content still works when text is enlarged or the page is zoomed.',
    },
    {
      title: 'Accessible documents and media',
      detail:
        'Require searchable PDFs, captioned video, transcripts, alt text, and document publishing workflows that do not create inaccessible archives.',
    },
    {
      title: 'Ongoing compliance operations',
      detail:
        'Publish an accessibility statement, provide a barrier-report form, and schedule recurring audits instead of treating accessibility as a one-time project.',
    },
  ];

  protected readonly leadershipGroups: LeadershipGroup[] = [
    {
      title: 'Mayor and Council',
      detail:
        'Elected leadership should be visible near meetings and contact paths so residents can quickly identify who represents them.',
      members: [
        'Mayor: Steve McKitrick',
        'Councilman: Julie Esgar',
        'Councilman: Dale Specht',
        'Councilman: Dale Stewart',
        'Councilman: Alan Campbell',
        'Councilman: Sandy Coen',
      ],
    },
    {
      title: 'Town Administration',
      detail:
        'Administrative leaders should stay visible because small-town residents often need direct, role-based contacts rather than department directories.',
      members: ['City Clerk: Deb Dillon', 'Town Superintendent: Scott Whitman'],
    },
  ];

  private readonly searchIndex: SearchItem[] = [
    {
      title: 'Check weather and active alerts',
      summary:
        'See the latest National Weather Service forecast, wind conditions, and any active alerts for Wiley.',
      category: 'Weather',
      href: '#weather',
      keywords: [
        'weather',
        'forecast',
        'alerts',
        'warning',
        'watch',
        'advisory',
        'wind',
        'snow',
        'temperature',
        'weather.gov',
        'nws',
      ],
    },
    {
      title: 'Pay utility bill',
      summary:
        'Find the secure online payment entry point and disclosure copy for third-party billing.',
      category: 'Payments',
      href: '#services',
      keywords: ['pay bill', 'water bill', 'utility bill', 'payment', 'fees', 'online payment'],
    },
    {
      title: 'Report a pothole, outage, or street issue',
      summary: 'Start a resident request and track the response status.',
      category: 'Service request',
      href: '#services',
      keywords: [
        'report issue',
        'pothole',
        'outage',
        'street',
        'streetlight',
        '311',
        'public works',
      ],
    },
    {
      title: 'City Council Regular Meeting',
      summary:
        'See the recurring 2nd Monday schedule, agenda guidance, and calendar links for the main council meeting.',
      category: 'Meetings',
      href: '#calendar',
      keywords: [
        'city council',
        'regular meeting',
        '2nd monday',
        'second monday',
        '6:00 pm',
        'agenda',
        'wiley town hall',
      ],
    },
    {
      title: 'Find the next town meeting',
      summary: 'Jump to the City Council schedule, agenda guidance, and the calendar section.',
      category: 'Meetings',
      href: '#alerts',
      keywords: [
        'meeting',
        'agenda',
        'minutes',
        'city council',
        '2nd monday',
        'public notice',
        '304 main street',
      ],
    },
    {
      title: 'Open the town calendar',
      summary:
        'See City Council meetings, hearings, deadlines, and community events in one calendar section with add-to-calendar links.',
      category: 'Calendar',
      href: '#calendar',
      keywords: [
        'calendar',
        'events',
        'schedule',
        'deadlines',
        'hearing',
        'community calendar',
        'google calendar',
        'ics',
        'city council',
      ],
    },
    {
      title: 'Request public records',
      summary: 'Locate FOIA forms, records guidance, and response expectations.',
      category: 'Transparency',
      href: '#records',
      keywords: ['foia', 'records', 'public records', 'documents', 'minutes', 'budget'],
    },
    {
      title: 'Check accessibility and language support',
      summary:
        'Read the accessibility commitments, translation priorities, and alternate format pathways.',
      category: 'Accessibility',
      href: '#accessibility',
      keywords: ['accessibility', 'ada', 'wcag', 'translation', 'language access', 'screen reader'],
    },
    {
      title: 'Contact Town Hall',
      summary:
        'Find office hours, department contacts, official alias emails, and issue escalation points.',
      category: 'Contact',
      href: '#contact',
      keywords: [
        'contact',
        'office hours',
        'phone',
        'town hall',
        'clerk',
        'permits',
        'wiley',
        '719 829 4974',
        'deb.dillon@townofwiley.gov',
        'scott.whitman@townofwiley.gov',
        'stephen.mckitrick@townofwiley.gov',
        'deb dillon',
        'scott whitman',
        'stephen mckitrick',
        'steve mckitrick',
        'julie esgar',
      ],
    },
  ];

  protected readonly searchResults = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();

    if (!query) {
      return this.searchIndex.slice(0, 4);
    }

    const terms: string[] = query.split(/\s+/).filter(Boolean);

    return this.searchIndex.filter((item) => {
      const haystack = [item.title, item.summary, item.category, ...item.keywords]
        .join(' ')
        .toLowerCase();

      return terms.every((term) => haystack.includes(term));
    });
  });

  protected updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  private createCalendarItem(seed: CalendarEventSeed): CalendarItem {
    return {
      title: seed.title,
      date: seed.dateLabel,
      category: seed.category,
      detail: seed.detail,
      location: seed.location,
      recurrence: seed.recurrence,
      agendaNote: seed.agendaNote,
      actions: [
        {
          label: 'Add to Google Calendar',
          href: this.createGoogleCalendarLink(seed),
          external: true,
        },
        {
          label: 'Download ICS',
          href: this.createIcsLink(seed),
          downloadFileName: `${seed.slug}.ics`,
        },
        {
          label: 'Agenda details',
          href: '#contact',
        },
        ...(seed.extraActions ?? []),
      ],
    };
  }

  private createGoogleCalendarLink(seed: CalendarEventSeed): string {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: seed.title,
      dates: `${seed.startLocal}/${seed.endLocal}`,
      details: [seed.detail, seed.agendaNote].filter(Boolean).join(' '),
      location: seed.location,
      ctz: 'America/Denver',
    });

    if (seed.recurrenceRule) {
      params.set('recur', `RRULE:${seed.recurrenceRule}`);
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  private createIcsLink(seed: CalendarEventSeed): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Town of Wiley//Public Calendar//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${seed.slug}@townofwiley.gov`,
      `DTSTAMP:${this.createUtcTimestamp()}`,
      `SUMMARY:${this.escapeIcsText(seed.title)}`,
      `DTSTART;TZID=America/Denver:${seed.startLocal}`,
      `DTEND;TZID=America/Denver:${seed.endLocal}`,
      `LOCATION:${this.escapeIcsText(seed.location)}`,
      `DESCRIPTION:${this.escapeIcsText([seed.detail, seed.agendaNote].filter(Boolean).join(' '))}`,
      seed.recurrenceRule ? `RRULE:${seed.recurrenceRule}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean);

    return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
  }

  private createUtcTimestamp(): string {
    return new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
  }

  private escapeIcsText(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }
}
