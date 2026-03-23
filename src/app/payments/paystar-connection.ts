import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SiteLanguage } from '../site-language';
import { RuntimePaystarConfig, getPaystarRuntimeConfig } from './paystar-config';

export interface PaystarLaunchRequest {
  residentName: string;
  serviceAddress: string;
  preferredContact: string;
  accountQuestion: string;
  locale: SiteLanguage;
  source: 'resident-services';
}

export interface PaystarLaunchResponse {
  provider: 'paystar';
  mode: 'hosted' | 'api';
  launchUrl: string;
  referenceId?: string;
}

@Injectable({ providedIn: 'root' })
export class PaystarConnectionService {
  private readonly http = inject(HttpClient);

  getRuntimeConfig(): RuntimePaystarConfig {
    return getPaystarRuntimeConfig();
  }

  async createLaunchRequest(request: PaystarLaunchRequest): Promise<PaystarLaunchResponse> {
    const runtimeConfig = this.getRuntimeConfig();

    if (runtimeConfig.mode === 'hosted' && runtimeConfig.portalUrl) {
      return {
        provider: 'paystar',
        mode: 'hosted',
        launchUrl: runtimeConfig.portalUrl,
      };
    }

    if (runtimeConfig.mode !== 'api' || !runtimeConfig.apiEndpoint) {
      throw new Error('Paystar is not configured in this environment.');
    }

    return firstValueFrom(
      this.http.post<PaystarLaunchResponse>(runtimeConfig.apiEndpoint, request),
    );
  }
}
