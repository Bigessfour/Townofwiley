import { ChangeDetectionStrategy, Component } from '@angular/core';

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
})
export class ClerkSetup {
  protected readonly clerkName = 'Deb Dillon';
  protected readonly setupType = 'One-time IAM setup';
  protected readonly setupSummary =
    'Use this page once to confirm IAM access, the correct Town account, and the Studio links. After that, daily edits happen in Amplify Studio Data Manager.';
  protected readonly awsAccountId = '570912405222';
  protected readonly amplifyAppId = 'd331voxr1fhoir';
  protected readonly awsRegion = 'us-east-2';
  protected readonly studioUrl =
    'https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/home';
  protected readonly dataManagerUrl =
    'https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/data';
  protected readonly awsConsoleUrl = 'https://us-east-2.console.aws.amazon.com/';
  protected readonly setupDetails: ClerkSetupDetail[] = [
    { label: 'AWS account', value: this.awsAccountId },
    { label: 'Region', value: this.awsRegion },
    { label: 'Amplify app', value: this.amplifyAppId },
    { label: 'Studio path', value: 'Manage > Content > Amplify Studio Data Manager' },
  ];
  protected readonly dailyChecklist = [
    'Use the correct IAM user for the Town account.',
    'Open Amplify Studio Data Manager.',
    'Open the correct model.',
    'Make the change and save the record.',
    'Refresh the public website and confirm the update.',
  ];
  protected readonly taskMap: ClerkSetupTask[] = [
    { action: 'Homepage title or welcome text', model: 'SiteSettings' },
    { action: 'Emergency banner at the top of the page', model: 'AlertBanner' },
    { action: 'Notice cards and announcements', model: 'Announcement' },
    { action: 'Meetings and calendar items', model: 'Event' },
    { action: 'Public phone numbers, emails, and contact cards', model: 'OfficialContact' },
    { action: 'Private Town email forwarding rules', model: 'EmailAlias' },
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
