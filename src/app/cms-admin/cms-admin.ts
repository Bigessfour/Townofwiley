import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { StaffAuthService } from '../auth/staff-auth.service';
import { getClerkSetupRuntimeConfig } from '../clerk-setup/clerk-setup-config';
import { CmsConnectionTestResult, LocalizedCmsContentStore } from '../site-cms-content';
import {
  DOCUMENT_PUBLISHING_CHECKS,
  DOCUMENT_PUBLISHING_STEPS,
  DOCUMENT_SECTIONS,
} from './cms-admin-constants';
import { IT_ADMIN_COPY } from './cms-admin-it-copy';
import { CmsClerkCoverageSheetComponent } from './cms-clerk-coverage-sheet.component';
import { CmsClerkTaskGuideComponent } from './cms-clerk-task-guide.component';
import { CmsClerkTaskHubComponent } from './cms-clerk-task-hub.component';
import type { ClerkCmsTaskId } from './cms-clerk-tasks';
import { clerkTaskUsesDocumentsWorkflow } from './cms-clerk-tasks';
import { CmsClerkUploadPanelComponent } from './cms-clerk-upload-panel.component';
import { CmsContentSnapshotComponent } from './cms-content-snapshot.component';
import { CmsMeetingDocumentUploadComponent } from './cms-meeting-document-upload.component';
import { CmsRecentChangesComponent } from './cms-recent-changes.component';
import { CmsSiteStatusComponent } from './cms-site-status.component';

/** Amplify Gen 2 Console Data manager (Angular). */
export const AMPLIFY_DATA_MANAGER_DOCS_URL =
  'https://docs.amplify.aws/angular/build-a-backend/data/manage-with-amplify-console/';

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
    ButtonModule,
    CardModule,
    TagModule,
    MessageModule,
    CmsSiteStatusComponent,
    CmsClerkTaskHubComponent,
    CmsClerkCoverageSheetComponent,
    CmsClerkTaskGuideComponent,
    CmsClerkUploadPanelComponent,
    CmsContentSnapshotComponent,
    CmsMeetingDocumentUploadComponent,
    CmsRecentChangesComponent,
  ],
})
export class CmsAdmin {
  private readonly router = inject(Router);
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly staffAuth = inject(StaffAuthService);
  protected readonly clerkSetupConfig = getClerkSetupRuntimeConfig();

  protected readonly it = IT_ADMIN_COPY;
  protected readonly documentPublishingSteps = DOCUMENT_PUBLISHING_STEPS;
  protected readonly documentSections = DOCUMENT_SECTIONS;
  protected readonly documentPublishingChecks = DOCUMENT_PUBLISHING_CHECKS;

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
  protected readonly taskGuideHelpOpen = signal(false);
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
  // Prefer runtime studioUrl (Gen 1 AppSync Queries). Fall back to the production Queries URL so
  // Advanced (IT) never links at the deleted Amplify Hosting app (d331voxr1fhoir).
  protected readonly dataManagerUrl =
    this.clerkSetupConfig.studioUrl ||
    'https://us-east-2.console.aws.amazon.com/appsync/home?region=us-east-2#/j7b2x3sh7rcezekekkxxiak7hi/v1/queries';

  protected readonly setupDetails = computed<CmsAdminSetupDetail[]>(() => [
    {
      key: 'data-manager',
      label: 'Content editor URL (AppSync Queries — IT)',
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
      label: 'Amplify app id (legacy hosting d331 deleted; for reference)',
      value: this.amplifyAppId,
      copyValue: this.amplifyAppId,
    },
    {
      key: 'cloudfront',
      label: 'CloudFront distribution id',
      value: this.clerkSetupConfig.cfDistributionId,
      copyValue: this.clerkSetupConfig.cfDistributionId,
    },
    {
      key: 's3-bucket',
      label: 'Static site bucket',
      value: this.clerkSetupConfig.s3Bucket,
      copyValue: this.clerkSetupConfig.s3Bucket,
    },
  ]);

  constructor() {
    afterNextRender(() => {
      const fragment = this.router.parseUrl(this.router.url).fragment;
      if (fragment === 'updates') {
        void this.router.navigate(['/admin'], { fragment: 'start', replaceUrl: true });
      }
    });
  }

  protected async signOutStaff(): Promise<void> {
    await this.staffAuth.signOutStaff();
    if (typeof window !== 'undefined') {
      window.location.assign('/admin/login');
    }
  }

  protected onEditContent(taskId: ClerkCmsTaskId): void {
    this.selectedTaskId.set(taskId);
    this.taskGuideHelpOpen.set(false);
    this.scrollAdminToTask(taskId, 'editor');
  }

  protected onShowTaskSteps(taskId: ClerkCmsTaskId): void {
    this.selectedTaskId.set(taskId);
    this.taskGuideHelpOpen.set(true);
    this.scrollAdminToTask(
      taskId,
      clerkTaskUsesDocumentsWorkflow(taskId) ? 'documents' : 'help',
    );
  }

  protected onOpenDocumentsSection(): void {
    this.selectedTaskId.set('upload-meeting-documents');
    this.taskGuideHelpOpen.set(false);
    this.scrollAdminToTask('upload-meeting-documents', 'documents');
  }

  private scrollAdminToTask(
    taskId: ClerkCmsTaskId,
    target: 'editor' | 'help' | 'documents',
  ): void {
    if (typeof document === 'undefined') {
      return;
    }
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        const elementId =
          target === 'documents'
            ? 'documents'
            : target === 'help'
              ? 'cms-task-guide'
              : clerkTaskUsesDocumentsWorkflow(taskId)
                ? 'documents'
                : 'cms-task-form';
        document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
}
