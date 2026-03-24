import { ChangeDetectionStrategy, Component } from '@angular/core';

interface ClerkSetupTask {
  action: string;
  model: string;
}

@Component({
  selector: 'app-clerk-setup',
  templateUrl: './clerk-setup.html',
  styleUrl: './clerk-setup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClerkSetup {
  protected readonly clerkName = 'Deb Dillon';
  protected readonly studioUrl =
    'https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/home';
  protected readonly dataManagerUrl =
    'https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/data';
  protected readonly dailyChecklist = [
    'Open Data Manager.',
    'Open the correct model.',
    'Make the change.',
    'Save the record.',
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
    'Do not use the public homepage to edit content.',
    'Do not use the /admin page as if it were the editor.',
    'Do not edit local code files to change daily website content.',
  ];
  protected readonly publishCheck = [
    'Read the updated page like a resident would.',
    'Check spelling, dates, times, phone numbers, and email links.',
    'Turn off emergency banners when they are no longer needed.',
  ];
}
