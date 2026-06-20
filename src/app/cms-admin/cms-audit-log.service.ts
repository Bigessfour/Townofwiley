import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StaffAuthService } from '../auth/staff-auth.service';

export interface CmsAuditLogEntry {
  timestamp?: string;
  modelName?: string;
  recordId?: string;
  operation?: string;
  summary?: string;
  changedFields?: string;
  staffEmail?: string;
}

interface CmsAuditLogResponse {
  items?: CmsAuditLogEntry[];
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class CmsAuditLogService {
  private readonly http = inject(HttpClient);
  private readonly staffAuth = inject(StaffAuthService);

  async listRecent(limit = 25): Promise<CmsAuditLogEntry[]> {
    const endpoint = this.readAuditEndpoint();
    const token = this.staffAuth.accessToken();
    if (!endpoint || !token) {
      return [];
    }

    const url = `${endpoint.replace(/\/$/, '')}/recent?limit=${limit}`;
    const response = await firstValueFrom(
      this.http.get<CmsAuditLogResponse>(url, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    return response.items ?? [];
  }

  private readAuditEndpoint(): string {
    if (typeof window === 'undefined') {
      return '';
    }
    const runtime = window as Window & {
      __TOW_RUNTIME_CONFIG__?: { cms?: { auditLog?: { apiEndpoint?: string } } };
    };
    return runtime.__TOW_RUNTIME_CONFIG__?.cms?.auditLog?.apiEndpoint?.trim() ?? '';
  }
}
