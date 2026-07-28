import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, throwError } from 'rxjs';
import { StaffAuthService } from '../auth/staff-auth.service';
import { readCommunityCalendarRuntimeConfig } from './community-calendar-runtime-config';
import type {
  AdminCommunityEvent,
  CommunityEventCategory,
  CommunityEventStatus,
  CommunityEventSubmission,
} from './community-calendar.types';

interface AdminListResponse {
  events?: AdminCommunityEvent[];
  error?: string;
}

interface AdminMutationResponse {
  ok?: boolean;
  event?: AdminCommunityEvent;
  eventId?: string;
  error?: string;
}

export type AdminCommunityEventWrite = CommunityEventSubmission & {
  status?: CommunityEventStatus;
};

@Injectable({ providedIn: 'root' })
export class CommunityCalendarAdminService {
  private readonly http = inject(HttpClient);
  private readonly staffAuth = inject(StaffAuthService);

  apiEndpoint(): string {
    return readCommunityCalendarRuntimeConfig().apiEndpoint.replace(/\/$/, '');
  }

  isConfigured(): boolean {
    return Boolean(this.apiEndpoint()) && Boolean(this.staffAuth.apiBearerToken()?.trim());
  }

  listEvents(status: CommunityEventStatus | '' = ''): Observable<AdminCommunityEvent[]> {
    const base = this.apiEndpoint();
    const token = this.staffAuth.apiBearerToken();
    if (!base || !token) {
      return of([]);
    }
    const url = status
      ? `${base}/admin/events?status=${encodeURIComponent(status)}`
      : `${base}/admin/events`;
    return this.http
      .get<AdminListResponse>(url, { headers: this.authHeaders(token) })
      .pipe(map((body) => body.events ?? []));
  }

  createEvent(payload: AdminCommunityEventWrite): Observable<AdminCommunityEvent> {
    return this.mutate('POST', '/admin/events', payload);
  }

  updateEvent(
    eventId: string,
    payload: AdminCommunityEventWrite,
  ): Observable<AdminCommunityEvent> {
    return this.mutate('PUT', `/admin/events/${encodeURIComponent(eventId)}`, payload);
  }

  deleteEvent(eventId: string): Observable<string> {
    const base = this.apiEndpoint();
    const token = this.staffAuth.apiBearerToken();
    if (!base || !token) {
      return throwError(() => new Error('Community calendar admin is not configured.'));
    }
    return this.http
      .delete<AdminMutationResponse>(`${base}/admin/events/${encodeURIComponent(eventId)}`, {
        headers: this.authHeaders(token),
      })
      .pipe(map((body) => body.eventId ?? eventId));
  }

  approveEvent(eventId: string): Observable<AdminCommunityEvent> {
    return this.mutate('POST', `/admin/events/${encodeURIComponent(eventId)}/approve`, {});
  }

  rejectEvent(eventId: string): Observable<AdminCommunityEvent> {
    return this.mutate('POST', `/admin/events/${encodeURIComponent(eventId)}/reject`, {});
  }

  private mutate(
    method: 'POST' | 'PUT',
    path: string,
    body: unknown,
  ): Observable<AdminCommunityEvent> {
    const base = this.apiEndpoint();
    const token = this.staffAuth.apiBearerToken();
    if (!base || !token) {
      return throwError(() => new Error('Community calendar admin is not configured.'));
    }
    const url = `${base}${path}`;
    const options = { headers: this.authHeaders(token) };
    const request$ =
      method === 'POST'
        ? this.http.post<AdminMutationResponse>(url, body, options)
        : this.http.put<AdminMutationResponse>(url, body, options);
    return request$.pipe(
      map((response) => {
        if (!response.event) {
          throw new Error(response.error || 'Admin request failed.');
        }
        return response.event;
      }),
    );
  }

  private authHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}

export type { CommunityEventCategory };
