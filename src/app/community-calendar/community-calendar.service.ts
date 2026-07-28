import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { readCommunityCalendarRuntimeConfig } from './community-calendar-runtime-config';
import { mergeCommunityEventsWithBundled } from './community-calendar-seed';
import type {
  CommunityEvent,
  CommunityEventCategory,
  CommunityEventSubmission,
} from './community-calendar.types';

interface ListResponse {
  events?: CommunityEvent[];
}

interface SubmitResponse {
  ok?: boolean;
  eventId?: string;
  message?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class CommunityCalendarService {
  private readonly http = inject(HttpClient);

  apiEndpoint(): string {
    return readCommunityCalendarRuntimeConfig().apiEndpoint.replace(/\/$/, '');
  }

  isConfigured(): boolean {
    return Boolean(this.apiEndpoint());
  }

  /**
   * Public upcoming community events (approved + future from API when configured),
   * always merged with bundled town seeds (e.g. community-wide yard sale day).
   */
  listEvents(category: CommunityEventCategory | '' = ''): Observable<CommunityEvent[]> {
    const base = this.apiEndpoint();
    if (!base) {
      return of(this.filterByCategory(mergeCommunityEventsWithBundled([]), category));
    }
    const url = category
      ? `${base}/events?category=${encodeURIComponent(category)}`
      : `${base}/events`;
    return this.http.get<ListResponse>(url).pipe(
      map((body) =>
        this.filterByCategory(mergeCommunityEventsWithBundled(body.events ?? []), category),
      ),
      catchError(() => of(this.filterByCategory(mergeCommunityEventsWithBundled([]), category))),
    );
  }

  submitEvent(payload: CommunityEventSubmission): Observable<SubmitResponse> {
    const base = this.apiEndpoint();
    if (!base) {
      throw new Error('Community calendar endpoint is not configured.');
    }
    return this.http.post<SubmitResponse>(`${base}/events`, payload);
  }

  private filterByCategory(
    events: CommunityEvent[],
    category: CommunityEventCategory | '',
  ): CommunityEvent[] {
    if (!category) {
      return events;
    }
    return events.filter((event) => event.category === category);
  }
}
