import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { readAdminRuntimeConfig } from '../admin-runtime-config';
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
    if (this.staffAuth.playwrightStaffBypassActive()) {
      return [];
    }

    const endpoint = this.readAuditEndpoint();
    const token = this.staffAuth.accessToken();
    if (!endpoint || !token) {
      return [];
    }

    const url = `${endpoint.replace(/\/$/, '')}/recent?limit=${limit}`;
    try {
      const response = await firstValueFrom(
        this.http.get<CmsAuditLogResponse>(url, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      return response.items ?? [];
    } catch {
      return [];
    }
  }

  private readAuditEndpoint(): string {
    if (typeof window === 'undefined') {
      return '';
    }
    const legacyPublic = (
      window as Window & {
        __TOW_RUNTIME_CONFIG__?: { cms?: { auditLog?: { apiEndpoint?: string } } };
      }
    ).__TOW_RUNTIME_CONFIG__?.cms?.auditLog?.apiEndpoint;
    const adminEndpoint = readAdminRuntimeConfig()?.cms?.auditLog?.apiEndpoint;
    return (adminEndpoint ?? legacyPublic)?.trim() ?? '';
  }
}
