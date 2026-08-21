import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { LocalizedCmsContentStore } from '../site-cms-content';

export type ClerkSiteStatusLevel = 'ok' | 'warning' | 'error' | 'loading';

@Component({
  selector: 'app-cms-site-status',
  standalone: true,
  imports: [DatePipe, ButtonModule, MessageModule, TagModule],
  templateUrl: './cms-site-status.component.html',
  styleUrl: './cms-site-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsSiteStatusComponent {
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly messages = inject(MessageService);

  protected readonly refreshing = signal(false);
  protected readonly lastRefreshedAt = signal<string | null>(null);

  protected readonly level = computed((): ClerkSiteStatusLevel => {
    if (this.cmsStore.isLoading() || this.refreshing()) {
      return 'loading';
    }
    if (this.cmsStore.hasLoadFailed() || this.cmsStore.loadError()) {
      return 'error';
    }
    const source = this.cmsStore.contentSource();
    if (source === 'live' || source === 'cached') {
      return 'ok';
    }
    return 'warning';
  });

  protected readonly message = computed(() => {
    switch (this.level()) {
      case 'loading':
        return 'Checking whether the website is reading your latest saved content…';
      case 'error':
        return 'The website may be showing older backup text. New saves might not appear yet. Call Town Hall at (719) 829-4974.';
      case 'ok':
        return 'The website is connected to your saved content. After you save in the editor, refresh the public page to verify.';
      default:
        return 'The website may be showing default setup text until content is saved in the editor. If you already saved, call Town Hall at (719) 829-4974.';
    }
  });

  protected readonly severity = computed(() => {
    switch (this.level()) {
      case 'ok':
        return 'success' as const;
      case 'error':
        return 'error' as const;
      case 'loading':
        return 'info' as const;
      default:
        return 'warn' as const;
    }
  });

  protected readonly contentSourceLabel = computed(() => {
    switch (this.cmsStore.contentSource()) {
      case 'live':
        return 'Live database';
      case 'cached':
        return 'Saved browser copy';
      case 'loading':
        return 'Loading…';
      default:
        return 'Backup text';
    }
  });

  protected readonly contentSourceSeverity = computed(() => {
    switch (this.cmsStore.contentSource()) {
      case 'live':
        return 'success' as const;
      case 'cached':
        return 'warn' as const;
      case 'loading':
        return 'info' as const;
      default:
        return 'secondary' as const;
    }
  });

  protected async forceRefreshLiveContent(): Promise<void> {
    if (this.refreshing()) {
      return;
    }

    this.refreshing.set(true);
    try {
      await this.cmsStore.forceLiveRefresh();

      if (this.cmsStore.hasLoadFailed() || this.cmsStore.loadError()) {
        this.messages.add({
          severity: 'error',
          summary: 'Refresh failed',
          detail:
            this.cmsStore.loadError() ??
            'Could not reach the content database. Try again or call Town Hall.',
          life: 8_000,
        });
        return;
      }

      this.lastRefreshedAt.set(new Date().toISOString());
      this.messages.add({
        severity: 'success',
        summary: 'Content refreshed',
        detail: 'Latest saved content loaded from the database.',
        life: 5_000,
      });
    } catch {
      this.messages.add({
        severity: 'error',
        summary: 'Refresh failed',
        detail: 'Could not reach the content database. Try again or call Town Hall.',
        life: 8_000,
      });
    } finally {
      this.refreshing.set(false);
    }
  }
}
