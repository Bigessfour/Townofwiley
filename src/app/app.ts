import { Component, signal } from '@angular/core';

interface QuickLink {
  title: string;
  description: string;
}

interface Notice {
  title: string;
  detail: string;
}

interface ContactItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('Town of Wiley');
  protected readonly currentYear = new Date().getFullYear();
  protected readonly quickLinks: QuickLink[] = [
    {
      title: 'Utility payments',
      description: 'Online payment access and billing details will appear here.'
    },
    {
      title: 'Agendas and minutes',
      description: 'Board meeting packets and archives will be published here.'
    },
    {
      title: 'Forms and permits',
      description: 'Resident forms, permit packets, and clerk resources are planned here.'
    }
  ];

  protected readonly notices: Notice[] = [
    {
      title: 'Website launch in progress',
      detail: 'This page is live so the official URL can be tested while the full site is being prepared.'
    },
    {
      title: 'Public notices area coming next',
      detail: 'Announcements, hearing notices, meeting dates, and service updates will be posted on this homepage.'
    }
  ];

  protected readonly contacts: ContactItem[] = [
    {
      label: 'Town Hall',
      value: 'Official office phone and address to be added'
    },
    {
      label: 'After-hours utility issues',
      value: 'Emergency contact information to be added'
    },
    {
      label: 'Records and clerk services',
      value: 'Submission instructions to be added'
    }
  ];
}
