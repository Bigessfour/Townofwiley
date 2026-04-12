import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
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

@Component({
  selector: 'app-clerk-setup',
  templateUrl: './clerk-setup.html',
  styleUrl: './clerk-setup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TabsModule, TableModule, ButtonModule, CardModule, TagModule],
})
export class ClerkSetup {
  private readonly contactUpdateReview = inject(ContactUpdateReviewService);

  protected readonly activeTab = signal<string>('setup');
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

  private async loadContactUpdates(): Promise<void> {
    const updates = await this.contactUpdateReview.getAllUpdates();
    this.contactUpdates.set(updates);
  }

  protected downloadCSV(): void {
    this.contactUpdateReview.downloadAsCSV(this.contactUpdates());
  }

  protected readonly clerkName = 'Deb Dillon';
  protected readonly setupType = 'One-time IAM setup';
  protected readonly setupSummary =
    'Use this page once to confirm IAM access, the correct Town account, and the Studio links. After that, daily edits for every CMS model happen in Amplify Studio Data Manager.';
  protected readonly awsAccountId = '570912405222';
  protected readonly amplifyAppId = 'd331voxr1fhoir';
  protected readonly awsRegion = 'us-east-2';
  protected readonly studioUrl =
    'https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/home';
  protected readonly cmsEditUrl =
    'https://us-east-2.admin.amplifyapp.com/admin/login?appId=d331voxr1fhoir&code=9936b78d-30f3-4383-9ce5-fee3804ac0a6&sessionId=bdf7662f-07eb-40ef-8c2f-73f9752f0a60&backendEnvironmentName=main';
  protected readonly awsConsoleUrl = 'https://us-east-2.console.aws.amazon.com/';
  protected readonly setupDetails: ClerkSetupDetail[] = [
    { label: 'AWS account', value: this.awsAccountId },
    { label: 'Region', value: this.awsRegion },
    { label: 'Amplify app', value: this.amplifyAppId },
    { label: 'Studio path', value: 'Manage > Content > Amplify Studio Data Manager' },
  ];
  protected readonly dailyChecklist = [
    'Use the correct IAM user for the Town account.',
    'Open Amplify Studio Data Manager for all CMS items.',
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
    { action: 'Public documents, forms, and downloads', model: 'PublicDocument' },
    { action: 'Outside news links shared on the site', model: 'ExternalNewsLink' },
    { action: 'Town email forwarding rules for behind-the-scenes delivery', model: 'EmailAlias' },
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
