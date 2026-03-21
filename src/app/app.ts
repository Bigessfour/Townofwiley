import { Component, computed, signal } from '@angular/core';

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

interface Notice {
  title: string;
  date: string;
  detail: string;
}

interface MeetingItem {
  title: string;
  schedule: string;
  format: string;
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

interface ContactItem {
  label: string;
  value: string;
  detail: string;
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
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('Town of Wiley');
  protected readonly searchQuery = signal('');
  protected readonly currentYear = new Date().getFullYear();

  protected readonly communityFacts: CommunityFact[] = [
    {
      label: 'Town profile',
      value: 'Wiley is a small statutory town in Prowers County',
      detail: 'With a 2020 population of about 437 residents, the homepage should stay direct, practical, and easy to scan on phones.'
    },
    {
      label: 'Location',
      value: 'Eastern Colorado plains, ZIP code 81092',
      detail: 'The site should prioritize weather-sensitive notices, utility updates, road information, and core local services over large-city portal complexity.'
    },
    {
      label: 'Regional access',
      value: 'Near US 287 and centered on local civic life',
      detail: 'Residents need fast access to meetings, Town Hall contacts, school and community event notices, and everyday service tasks.'
    }
  ];

  protected readonly navLinks: NavLink[] = [
    {
      label: 'Top Tasks',
      href: '#top-tasks'
    },
    {
      label: 'Notices',
      href: '#alerts'
    },
    {
      label: 'Services',
      href: '#services'
    },
    {
      label: 'Records',
      href: '#records'
    },
    {
      label: 'Accessibility',
      href: '#accessibility'
    },
    {
      label: 'Contact',
      href: '#contact'
    }
  ];

  protected readonly topTasks: TopTask[] = [
    {
      title: 'Pay utility bill',
      description: 'Surface water and utility payments immediately so residents are not forced to navigate a deep department structure.',
      href: '#services',
      note: 'Payment links should warn that they open a separate secure payment provider.'
    },
    {
      title: 'Report a street or utility issue',
      description: 'Give residents a direct path for outages, potholes, drainage concerns, and streetlight issues without relying on phone tag.',
      href: '#services',
      note: 'Residents should be able to submit requests and track status without calling Town Hall.'
    },
    {
      title: 'Find a meeting or agenda',
      description: 'Put board meetings, notices, agendas, and minutes directly on the homepage for a town where civic information should stay one click away.',
      href: '#alerts',
      note: 'Open meetings information should stay one click away from the homepage.'
    },
    {
      title: 'Request records, permits, or clerk help',
      description: 'Group routine clerk and permit needs under plain-language labels so residents do not have to guess which office handles the task.',
      href: '#records',
      note: 'Use forms, clear instructions, and document standards that support WCAG 2.1 AA.'
    }
  ];

  protected readonly notices: Notice[] = [
    {
      title: 'Homepage rebuild focused on Wiley essentials',
      date: 'March 2026',
      detail: 'The new design is being scoped around small-town essentials: payments, meetings, service issues, office contacts, and clear emergency or weather-sensitive notices.'
    },
    {
      title: 'Digital self-service rollout planned in phases',
      date: 'Spring 2026',
      detail: 'Payments, service requests, permits, meeting archives, and records access are being organized around resident tasks instead of department structure.'
    },
    {
      title: 'Public notice placement reserved for high-visibility alerts',
      date: 'Operational',
      detail: 'Emergency information, special meeting notices, utility interruptions, and weather-related updates should remain visible without forcing residents to search.'
    }
  ];

  protected readonly meetings: MeetingItem[] = [
    {
      title: 'Town Board Regular Meeting',
      schedule: 'Second Tuesday of each month, 6:00 PM',
      format: 'Agenda packet, minutes, livestream link, and ADA-accessible documents should publish here.'
    },
    {
      title: 'Planning and zoning review',
      schedule: 'First Thursday of each month, 5:30 PM',
      format: 'Use this slot for hearing notices, staff reports, application deadlines, and map links.'
    },
    {
      title: 'Community calendar and school-centered events',
      schedule: 'Resident events, closures, and deadlines',
      format: 'Calendar filters should separate meetings, alerts, school events, recreation, and facility reservations.'
    }
  ];

  protected readonly serviceCards: ServiceCard[] = [
    {
      title: 'Online payments',
      availability: 'Priority service',
      description: 'Start with utility and routine fee payments, then expand to permits or court-related payments only when the workflows are stable.',
      href: '#contact',
      cta: 'Add payment portal and disclosure copy'
    },
    {
      title: 'Street, utility, and property issue reporting',
      availability: 'Self-service',
      description: 'Focus on a few high-value request types first: utility concerns, potholes, signage, nuisance issues, and public works follow-up.',
      href: '#contact',
      cta: 'Define request categories and status messages'
    },
    {
      title: 'Permits and licenses',
      availability: 'Business-ready',
      description: 'Provide application steps, document uploads, fee details, and status tracking without making residents or contractors drive in repeatedly.',
      href: '#records',
      cta: 'Map required forms and department routing'
    },
    {
      title: 'Weather, utility, and emergency alerts',
      availability: 'Multi-channel',
      description: 'Pair website notices with SMS, email, and app notifications so wind, snow, outages, and service disruptions reach residents quickly.',
      href: '#alerts',
      cta: 'Establish alert topics and subscriber controls'
    },
    {
      title: 'Language access for critical services',
      availability: 'Inclusive access',
      description: 'Start with critical notices, payment help, clerk services, and emergency updates so language access improves the most-used pages first.',
      href: '#accessibility',
      cta: 'Prioritize high-impact pages for translation'
    },
    {
      title: 'Search and document discovery',
      availability: 'Plain-language findability',
      description: 'Help residents find agendas, forms, ordinances, and services using task-based queries rather than internal government terminology.',
      href: '#search-panel',
      cta: 'Expand search index and document metadata'
    }
  ];

  protected readonly transparencyItems: TransparencyItem[] = [
    {
      title: 'FOIA and public records',
      detail: 'Publish records request instructions, fee worksheets, downloadable forms, and response timelines in one clearly labeled location.'
    },
    {
      title: 'Agendas, minutes, and budgets',
      detail: 'Keep meeting packets, approved minutes, budget summaries, and annual reports searchable and downloadable in accessible formats.'
    },
    {
      title: 'Ordinances and code information',
      detail: 'Give residents a straightforward way to locate municipal code, zoning references, and enforcement guidance.'
    },
    {
      title: 'Project and service status updates',
      detail: 'Use status pages or compact dashboards to show road work, closures, utility projects, and request backlogs without forcing phone calls.'
    }
  ];

  protected readonly accessibilityItems: AccessibilityItem[] = [
    {
      title: 'Keyboard and screen-reader support',
      detail: 'Maintain logical heading order, skip links, focus states, descriptive labels, and consistent navigation on every page.'
    },
    {
      title: 'Readable contrast and resize behavior',
      detail: 'Keep text contrast at WCAG 2.1 AA levels and ensure content still works when text is enlarged or the page is zoomed.'
    },
    {
      title: 'Accessible documents and media',
      detail: 'Require searchable PDFs, captioned video, transcripts, alt text, and document publishing workflows that do not create inaccessible archives.'
    },
    {
      title: 'Ongoing compliance operations',
      detail: 'Publish an accessibility statement, provide a barrier-report form, and schedule recurring audits instead of treating accessibility as a one-time project.'
    }
  ];

  protected readonly contacts: ContactItem[] = [
    {
      label: 'Town Hall and clerk services',
      value: 'Address, office hours, and primary phone number',
      detail: 'In a small town, the homepage should keep core contact details visible instead of hiding them on a separate department page.'
    },
    {
      label: 'Report an accessibility barrier',
      value: 'Dedicated email form and phone route',
      detail: 'Publish a direct way for residents to request alternate formats or report inaccessible features.'
    },
    {
      label: 'Emergency and public works contact',
      value: 'Service outage and urgent issue intake',
      detail: 'Reserve space for after-hours utility issues, road hazards, snow or weather-related service changes, and time-sensitive closures.'
    },
    {
      label: 'Clerk, records, and permits',
      value: 'Forms, submissions, and records help',
      detail: 'Group routine clerk services so residents are not forced to guess which office handles each task.'
    }
  ];

  private readonly searchIndex: SearchItem[] = [
    {
      title: 'Pay utility bill',
      summary: 'Find the secure online payment entry point and disclosure copy for third-party billing.',
      category: 'Payments',
      href: '#services',
      keywords: ['pay bill', 'water bill', 'utility bill', 'payment', 'fees', 'online payment']
    },
    {
      title: 'Report a pothole, outage, or street issue',
      summary: 'Start a resident request and track the response status.',
      category: 'Service request',
      href: '#services',
      keywords: ['report issue', 'pothole', 'outage', 'street', 'streetlight', '311', 'public works']
    },
    {
      title: 'Find the next town meeting',
      summary: 'Jump to current notices, schedules, and agenda publishing expectations.',
      category: 'Meetings',
      href: '#alerts',
      keywords: ['meeting', 'agenda', 'minutes', 'board meeting', 'public notice']
    },
    {
      title: 'Request public records',
      summary: 'Locate FOIA forms, records guidance, and response expectations.',
      category: 'Transparency',
      href: '#records',
      keywords: ['foia', 'records', 'public records', 'documents', 'minutes', 'budget']
    },
    {
      title: 'Check accessibility and language support',
      summary: 'Read the accessibility commitments, translation priorities, and alternate format pathways.',
      category: 'Accessibility',
      href: '#accessibility',
      keywords: ['accessibility', 'ada', 'wcag', 'translation', 'language access', 'screen reader']
    },
    {
      title: 'Contact Town Hall',
      summary: 'Find office hours, department contacts, and issue escalation points.',
      category: 'Contact',
      href: '#contact',
      keywords: ['contact', 'office hours', 'phone', 'town hall', 'clerk', 'permits', 'wiley']
    }
  ];

  protected readonly searchResults = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();

    if (!query) {
      return this.searchIndex.slice(0, 4);
    }

    const terms = query.split(/\s+/).filter(Boolean);

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
}
