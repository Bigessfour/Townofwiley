import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { getClerkSetupRuntimeConfig } from './clerk-setup-config';
import {
  ContactUpdateRecord,
  ContactUpdateReviewService,
} from './contact-update-review.service';

interface ClerkSetupTask {
  action: string;
  model: string;
}

interface ClerkSetupDetail {
  label: string;
  value: string;
}

interface ClerkSetupDocumentSection {
  label: string;
  sectionId: string;
  detail: string;
}

@Component({
  selector: 'app-clerk-setup',
  templateUrl: './clerk-setup.html',
  styleUrl: './clerk-setup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TabsModule, TableModule, ButtonModule, CardModule, TagModule, SkeletonModule],
})
export class ClerkSetup {
  private readonly contactUpdateReview = inject(ContactUpdateReviewService);
  private readonly clerkSetupConfig = getClerkSetupRuntimeConfig();

  protected readonly activeTab = signal<string>(this.resolveInitialTab());
  protected readonly contactUpdatesLoading = signal(true);
  protected readonly contactUpdates = signal<ContactUpdateRecord[]>([]);
  protected readonly setupCardPt = {
    body: { class: 'setup-card-body' },
    title: { class: 'setup-card-title' },
    subtitle: { class: 'setup-card-subtitle' },
    footer: { class: 'setup-card-footer' },
  };

  constructor() {
    void this.loadContactUpdates();
  }

  private resolveInitialTab(): string {
    if (typeof window === 'undefined') {
      return 'setup';
    }

    const fragment = window.location.hash.replace(/^#/, '');

    if (fragment === 'documents' || fragment === 'updates' || fragment === 'setup') {
      return fragment;
    }

    return 'setup';
  }

  private async loadContactUpdates(): Promise<void> {
    this.contactUpdatesLoading.set(true);

    try {
      const updates = await this.contactUpdateReview.getAllUpdates();
      this.contactUpdates.set(updates);
    } finally {
      this.contactUpdatesLoading.set(false);
    }
  }

  protected downloadCSV(): void {
    this.contactUpdateReview.downloadAsCSV(this.contactUpdates());
  }

  protected readonly clerkName = this.clerkSetupConfig.clerkName;
  protected readonly setupType = 'One-time IAM setup';
  protected readonly setupSummary =
    'Use this page once to confirm IAM access, the correct Town account, and the Studio links. Daily text and record edits happen in Amplify Studio Data Manager, and document publishing now routes staff into the supported Studio PublicDocument workflow instead of the retired in-page uploader.';
  protected readonly awsAccountId = this.clerkSetupConfig.awsAccountId;
  protected readonly amplifyAppId = this.clerkSetupConfig.amplifyAppId;
  protected readonly awsRegion = this.clerkSetupConfig.awsRegion;
  protected readonly awsConsoleUrl = this.clerkSetupConfig.awsConsoleUrl;
  protected readonly studioUrl = this.clerkSetupConfig.studioUrl;
  protected readonly cmsAdminUrl = '/admin';
  protected readonly setupDetails: ClerkSetupDetail[] = [
    { label: 'AWS account', value: this.awsAccountId },
    { label: 'Region', value: this.awsRegion },
    { label: 'Amplify app', value: this.amplifyAppId },
    { label: 'Studio path', value: 'Manage > Content > Amplify Studio Data Manager' },
  ];
  protected readonly dailyChecklist = [
    'Use the correct IAM user for the Town account.',
    'Open Amplify Studio Data Manager for text and record changes.',
    'Use the Document Publishing tab on this page to follow the supported Studio PublicDocument workflow.',
    'Open the correct model.',
    'Make the change and save the record.',
    'Refresh the public website and confirm the update.',
  ];
  protected readonly taskMap: ClerkSetupTask[] = [
    { action: 'Homepage title, welcome text, and hero photo', model: 'SiteSettings' },
    { action: 'Emergency banner shown at the top of the homepage', model: 'AlertBanner' },
    { action: 'Public notices, closures, and general announcements', model: 'Announcement' },
    { action: 'Meetings, hearings, and calendar events', model: 'Event' },
    { action: 'Staff contact cards for names, phones, and emails', model: 'OfficialContact' },
    { action: 'Business directory entries, logos, and websites', model: 'Business' },
    { action: 'Public documents, forms, and downloads', model: 'PublicDocument in Studio' },
    { action: 'Outside news links shared on the site', model: 'ExternalNewsLink' },
    { action: 'Town email forwarding rules for behind-the-scenes delivery', model: 'EmailAlias' },
  ];
  protected readonly documentPublishingSteps = [
    'Open CMS Admin, then continue into Amplify Studio for the supported PublicDocument workflow.',
    'Create or update the PublicDocument entry there instead of using the retired in-page uploader.',
    'Route the file to the correct resident-facing section using the exact sectionId shown below.',
    'Save the Studio change, then refresh the public Documents page or related resident page to verify it appears.',
  ];
  protected readonly documentSections: ClerkSetupDocumentSection[] = [
    {
      label: 'Meeting Documents',
      sectionId: 'meeting-documents',
      detail: 'Agenda packets, approved minutes, and other recurring meeting records.',
    },
    {
      label: 'Financial Documents',
      sectionId: 'financial-documents',
      detail: 'Budget summaries, annual reports, audits, and finance downloads.',
    },
    {
      label: 'Code & Zoning References',
      sectionId: 'code-references',
      detail: 'Ordinances, zoning references, permit guidance, and code lookups.',
    },
    {
      label: 'Records & Requests',
      sectionId: 'records-requests',
      detail: 'Records request forms, clerk follow-up files, and public records guidance.',
    },
  ];
  protected readonly documentPublishingChecks = [
    'If the supported Studio flow is unavailable or says access is denied, fix AWS permissions first instead of retrying the retired upload widget.',
    'Keep PublicDocument edits in Studio so the file metadata and database record stay in the same supported CMS process.',
    'Use the Events model for meetings and hearing dates so posted events keep driving the live calendar.',
  ];
  protected readonly doNotUse = [
    'Do not use the root AWS account for daily editing.',
    'Do not use the public homepage to edit content.',
    'Do not use the /admin page as if it were the editor.',
    'Do not edit local code files to change daily website content.',
  ];
  protected readonly publishCheck = [
    'Confirm you are in the Town of Wiley AWS account and region.',
    'Read the updated page like a resident would.',
    'Check spelling, dates, times, phone numbers, and email links.',
    'Turn off emergency banners when they are no longer needed.',
  ];
}
