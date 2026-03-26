import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SiteCmsContent } from '../site-cms-content';

interface ExternalLink {
  title: string;
  url: string;
  date: string;
  source: string;
}

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CardModule, ButtonModule],
  templateUrl: './news.html',
  styleUrl: './news.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class News {
  private readonly cms = inject(SiteCmsContent);

  protected readonly newsItems = this.cms.notices;

  protected readonly externalLinks = signal<ExternalLink[]>([
    {
      title: 'Wiley CO News Update',
      url: 'https://www.lamarledger.com/',
      date: '2026-03-15',
      source: 'Lamar Ledger',
    },
    {
      title: 'Prowers County Community Event',
      url: 'https://www.example-news.com/prowers',
      date: '2026-03-10',
      source: 'Regional News',
    },
  ]);

  protected readonly recentExternal = computed(() => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return this.externalLinks().filter(item => new Date(item.date) > oneMonthAgo);
  });

  protected readonly title = 'Town News and Announcements';
}
