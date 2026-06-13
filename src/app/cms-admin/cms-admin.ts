import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { StaffAuthService } from '../auth/staff-auth.service';
import { getClerkSetupRuntimeConfig } from '../clerk-setup/clerk-setup-config';
import {
  ContactUpdateRecord,
  ContactUpdateReviewService,
} from '../clerk-setup/contact-update-review.service';
import { CmsConnectionTestResult, LocalizedCmsContentStore } from '../site-cms-content';
import {
  DOCUMENT_PUBLISHING_CHECKS,
  DOCUMENT_PUBLISHING_STEPS,
  DOCUMENT_SECTIONS,
} from './cms-admin-constants';
import { IT_ADMIN_COPY } from './cms-admin-it-copy';
import { CmsClerkTaskGuideComponent } from './cms-clerk-task-guide.component';
import { CmsClerkTaskHubComponent } from './cms-clerk-task-hub.component';
import type { ClerkCmsTaskId } from './cms-clerk-tasks';
import { CmsClerkUploadPanelComponent } from './cms-clerk-upload-panel.component';
import { CmsContentSnapshotComponent } from './cms-content-snapshot.component';
import { CmsMeetingDocumentUploadComponent } from './cms-meeting-document-upload.component';
import { CmsSiteStatusComponent } from './cms-site-status.component';

/** AppSync console reference for IT staff. */
export const APPSYNC_CONSOLE_DOCS_URL =
  'https://docs.aws.amazon.com/appsync/latest/devguide/welcome.html';

interface CmsAdminRuntimeConfig {
  cms?: {
    appSync?: {
      region?: string;
      apiEndpoint?: string;
      apiKey?: string;
    };
  };
}

interface CmsAdminSetupDetail {
  key: string;
  label: string;
  value: string;
  copyValue: string;
}

@Component({
  selector: 'app-cms-admin',
  templateUrl: './cms-admin.html',
  styleUrl: './cms-admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    ngSkipHydration: '',
  },
  imports: [
    DatePipe,
    TableModule,
    ButtonModule,
    CardModule,
    TagModule,
    MessageModule,
    CmsSiteStatusComponent,
    CmsClerkTaskHubComponent,
    CmsClerkTaskGuideComponent,
    CmsClerkUploadPanelComponent,
    CmsContentSnapshotComponent,
    CmsMeetingDocumentUploadComponent,
  ],
})
export class CmsAdmin {
  protected readonly it = IT_ADMIN_COPY;
  protected readonly documentPublishingSteps = DOCUMENT_PUBLISHING_STEPS;
  protected readonly documentSections = DOCUMENT_SECTIONS;
  protected readonly documentPublishingChecks = DOCUMENT_PUBLISHING_CHECKS;

  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly contactUpdateReview = inject(ContactUpdateReviewService);
  private readonly staffAuth = inject(StaffAuthService);
  protected readonly clerkSetupConfig = getClerkSetupRuntimeConfig();

  private readonly appSyncRuntimeConfig = (() => {
    if (typeof window === 'undefined') {
      return { region: '', apiEndpoint: '', apiKey: '' };
    }

    const runtimeWindow = window as Window & {
      __TOW_RUNTIME_CONFIG__?: CmsAdminRuntimeConfig;
      __TOW_RUNTIME_CONFIG_OVERRIDE__?: CmsAdminRuntimeConfig;
    };
    const appSync = {
      ...(runtimeWindow.__TOW_RUNTIME_CONFIG__?.cms?.appSync ?? {}),
      ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.cms?.appSync ?? {}),
    };

    return {
      region: typeof appSync?.region === 'string' ? appSync.region : '',
      apiEndpoint: typeof appSync?.apiEndpoint === 'string' ? appSync.apiEndpoint : '',
      apiKey: typeof appSync?.apiKey === 'string' ? appSync.apiKey : '',
    };
  })();

  protected readonly selectedTaskId = signal<ClerkCmsTaskId | null>(null);
  protected readonly contactUpdatesLoading = signal(true);
  protected readonly contactUpdatesLoadError = signal<string | null>(null);
  protected readonly contactUpdates = signal<ContactUpdateRecord[]>([]);
  protected readonly connectionTestResult = signal<CmsConnectionTestResult | null>(null);
  protected readonly connectionTestLoading = signal(false);
  protected readonly cacheClearMessage = signal<string | null>(null);
  protected readonly forceRefreshLoading = signal(false);
  protected readonly copiedSetupKey = signal<string | null>(null);
  protected readonly setupCardPt = {
    body: { class: 'setup-card-body' },
    title: { class: 'setup-card-title' },
    subtitle: { class: 'setup-card-subtitle' },
    footer: { class: 'setup-card-footer' },
  };

  protected readonly modelCounts = this.cmsStore.modelCounts;
  protected readonly isStaffSignedIn = this.staffAuth.isStaff;
  protected readonly staffEmail = this.staffAuth.email;
  protected readonly hasAppSyncRuntimeConfig =
    Boolean(this.appSyncRuntimeConfig.apiEndpoint) && Boolean(this.appSyncRuntimeConfig.apiKey);

  protected readonly awsRegion = this.clerkSetupConfig.awsRegion;
  protected readonly amplifyAppId = this.clerkSetupConfig.amplifyAppId;
  protected readonly awsConsoleUrl = this.clerkSetupConfig.awsConsoleUrl;
  protected readonly cfDistributionId = this.clerkSetupConfig.cfDistributionId;
  protected readonly s3Bucket = this.clerkSetupConfig.s3Bucket;
  // Alternative bulk tool (Studio). Guided in-app tasks (below) use direct AppSync GraphQL (Cognito auth).
  protected readonly dataManagerUrl = this.clerkSetupConfig.studioUrl;

  protected readonly setupDetails = computed<CmsAdminSetupDetail[]>(() => [
    {
      key: 'data-manager',
      label: 'Alternative: Studio Data Manager (bulk edits)',
      value: this.dataManagerUrl,
      copyValue: this.dataManagerUrl,
    },
    {
      key: 'region',
      label: 'Region',
      value: this.awsRegion,
      copyValue: this.awsRegion,
    },
    {
      key: 'amplify-app',
      label: 'Amplify app id',
      value: this.amplifyAppId,
      copyValue: this.amplifyAppId,
    },
    {
      key: 'cloudfront',
      label: 'CloudFront distribution id',
      value: this.cfDistributionId,
      copyValue: this.cfDistributionId,
    },
    {
      key: 's3-bucket',
      label: 'Static site bucket',
      value: this.s3Bucket,
      copyValue: this.s3Bucket,
    },
  ]);

  protected readonly contactUpdateReportLabels = {
    title: 'Resident contact report',
    generatedLabel: 'Generated',
    recordCountLabel: 'Records',
    fields: {
      date: 'Date',
      fullName: 'Full name',
      serviceAddress: 'Service address',
      poBox: 'PO Box',
      accountNumber: 'Account number',
      phone: 'Phone',
      email: 'Email',
      preferredContact: 'Preferred contact',
      consent: 'Consent',
      notes: 'Notes',
      source: 'Source',
      language: 'Language',
    },
  };

  constructor() {
    void this.loadContactUpdatesWhenStaffReady();
  }

  private async loadContactUpdatesWhenStaffReady(): Promise<void> {
    await this.staffAuth.refreshSession();
    if (!this.staffAuth.isStaff()) {
      this.contactUpdatesLoading.set(false);
      if (!this.staffAuth.isAuthenticated()) {
        this.contactUpdatesLoadError.set(
          'Sign in at /admin/login to view resident contact updates.',
        );
      } else {
        this.contactUpdatesLoadError.set(
          'Staff sign-in required. Your account must be in the Staff group to view contact updates.',
        );
      }
      return;
    }
    await this.loadContactUpdates();
  }

  protected async signOutStaff(): Promise<void> {
    await this.staffAuth.signOutStaff();
    if (typeof window !== 'undefined') {
      window.location.assign('/admin/login');
    }
  }

  protected onShowTaskSteps(taskId: ClerkCmsTaskId): void {
    this.selectedTaskId.set(taskId);
    if (typeof document === 'undefined') {
      return;
    }
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        document
          .getElementById('cms-task-form')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  protected async testConnection(): Promise<void> {
    this.connectionTestLoading.set(true);
    try {
      this.connectionTestResult.set(await this.cmsStore.testCmsConnection());
    } finally {
      this.connectionTestLoading.set(false);
    }
  }

  protected clearWebsiteCache(): void {
    this.cmsStore.clearPersistedCache();
    this.cacheClearMessage.set(this.it.clearWebsiteCacheSuccess);
    window.setTimeout(() => this.cacheClearMessage.set(null), 4_000);
  }

  protected async refreshFromDatabase(): Promise<void> {
    this.forceRefreshLoading.set(true);
    this.cacheClearMessage.set(null);
    try {
      await this.cmsStore.forceLiveRefresh();
    } finally {
      this.forceRefreshLoading.set(false);
    }
  }

  protected async copySetupValue(detail: CmsAdminSetupDetail): Promise<void> {
    if (!detail.copyValue) {
      return;
    }
    try {
      await navigator.clipboard.writeText(detail.copyValue);
      this.copiedSetupKey.set(detail.key);
      window.setTimeout(() => this.copiedSetupKey.set(null), 1800);
    } catch {
      this.copiedSetupKey.set(null);
    }
  }

  protected retryContactUpdates(): void {
    void this.loadContactUpdates();
  }

  protected downloadCSV(): void {
    this.contactUpdateReview.downloadAsCSV(this.contactUpdates());
  }

  protected printCustomerReport(): void {
    this.contactUpdateReview.printReport(this.contactUpdates(), this.contactUpdateReportLabels);
  }

  private async loadContactUpdates(): Promise<void> {
    this.contactUpdatesLoading.set(true);
    this.contactUpdatesLoadError.set(null);
    try {
      await this.staffAuth.refreshSession();
      const result = await this.contactUpdateReview.getAllUpdates();
      if (result.ok) {
        this.contactUpdates.set(result.data);
      } else {
        this.contactUpdates.set([]);
        this.contactUpdatesLoadError.set(result.error);
      }
    } catch {
      this.contactUpdates.set([]);
      this.contactUpdatesLoadError.set(
        'Could not load messages. Sign in at /admin/login or call Town Hall.',
      );
    } finally {
      this.contactUpdatesLoading.set(false);
    }
  }
}
