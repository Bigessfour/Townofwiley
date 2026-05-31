import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StaffAuthService } from '../auth/staff-auth.service';
import { sanitizePlainText } from '../input-sanitization';
import type { SiteLanguage } from '../site-language';
import { getGuestbookRuntimeConfig } from './hello-from-config';

export interface HelloFromMessage {
  id: string;
  timestamp: string;
  message: string;
  displayName: string;
  placeLabel: string;
  countryCode: string;
  lat: number;
  lng: number;
  locale: string;
}

export interface HelloFromVisitorLog {
  id: string;
  timestamp: string;
  kind: 'visit' | 'message' | string;
  message: string;
  displayName: string;
  placeLabel: string;
  countryCode: string;
  countryName: string;
  region: string;
  city: string;
  lat: number;
  lng: number;
  geoSource: string;
  pagePath: string;
  source: string;
  locale: string;
  ipHash: string;
  userAgent: string;
  status: string;
}

export interface HelloFromSubmitInput {
  message: string;
  displayName: string;
  placeLabel: string;
  countryCode: string;
  lat: number;
  lng: number;
  locale: SiteLanguage;
  publicConsent: boolean;
}

export type HelloFromMessagesResult =
  | { ok: true; data: HelloFromMessage[] }
  | { ok: false; error: string };

export type HelloFromLogsResult =
  | { ok: true; data: HelloFromVisitorLog[] }
  | { ok: false; error: string };

@Injectable({ providedIn: 'root' })
export class HelloFromService {
  private readonly http = inject(HttpClient);
  private readonly staffAuth = inject(StaffAuthService);

  private apiBase(): string {
    return getGuestbookRuntimeConfig().apiEndpoint;
  }

  async recordPageVisit(pagePath: string, locale: SiteLanguage): Promise<void> {
    const base = this.apiBase();
    if (!base) {
      return;
    }
    try {
      await firstValueFrom(
        this.http.post(`${base}/visit`, {
          pagePath: sanitizePlainText(pagePath, 120),
          source: 'hello-from',
          locale,
        }),
      );
    } catch {
      // Passive logging — do not block the page.
    }
  }

  async loadPublishedMessages(): Promise<HelloFromMessagesResult> {
    const base = this.apiBase();
    if (!base) {
      return { ok: true, data: [] };
    }
    try {
      const response = await firstValueFrom(this.http.get<HelloFromMessage[]>(`${base}/messages`));
      if (!Array.isArray(response)) {
        return { ok: false, error: 'Unexpected response from guestbook service.' };
      }
      return { ok: true, data: response };
    } catch (err) {
      return { ok: false, error: this.describeError(err) };
    }
  }

  async submitMessage(
    input: HelloFromSubmitInput,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const base = this.apiBase();
    if (!base) {
      return {
        ok: false,
        error:
          'Guestbook is not configured yet. Please try again after the Town publishes this feature.',
      };
    }

    const payload = {
      message: sanitizePlainText(input.message, 200),
      displayName: sanitizePlainText(input.displayName, 80),
      placeLabel: sanitizePlainText(input.placeLabel, 120),
      countryCode: sanitizePlainText(input.countryCode, 8).toUpperCase(),
      lat: input.lat,
      lng: input.lng,
      locale: input.locale,
      publicConsent: input.publicConsent,
    };

    try {
      await firstValueFrom(this.http.post(`${base}/message`, payload));
      return { ok: true };
    } catch (err) {
      if (err instanceof HttpErrorResponse && typeof err.error?.error === 'string') {
        return { ok: false, error: err.error.error };
      }
      return { ok: false, error: this.describeError(err) };
    }
  }

  async loadVisitorLogsForStaff(): Promise<HelloFromLogsResult> {
    const base = this.apiBase();
    if (!base) {
      return {
        ok: false,
        error: 'Guestbook API is not configured. Ask IT to set GUESTBOOK_API_ENDPOINT.',
      };
    }

    await this.staffAuth.refreshSession();
    const token = this.staffAuth.accessToken();
    if (!token) {
      return {
        ok: false,
        error: 'Sign in at /admin/login to view visitor logs.',
      };
    }

    try {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      const response = await firstValueFrom(
        this.http.get<HelloFromVisitorLog[]>(`${base}/admin/logs`, { headers }),
      );
      if (!Array.isArray(response)) {
        return { ok: false, error: 'Unexpected visitor log format.' };
      }
      return { ok: true, data: response };
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        return {
          ok: false,
          error: 'Staff sign-in required. Open /admin/login, then return here.',
        };
      }
      return { ok: false, error: this.describeError(err) };
    }
  }

  openOsmMap(lat: number, lng: number): string {
    if (!lat && !lng) {
      return 'https://www.openstreetmap.org/';
    }
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=4/${lat}/${lng}`;
  }

  private describeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'Could not reach the guestbook service.';
      }
      return `Guestbook request failed (HTTP ${err.status}).`;
    }
    return 'Guestbook request failed.';
  }
}
