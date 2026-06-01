import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MessageModule } from 'primeng/message';
import { LocalizedCmsContentStore } from '../site-cms-content';

export type ClerkSiteStatusLevel = 'ok' | 'warning' | 'error' | 'loading';

@Component({
  selector: 'app-cms-site-status',
  standalone: true,
  imports: [MessageModule],
  templateUrl: './cms-site-status.component.html',
  styleUrl: './cms-site-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsSiteStatusComponent {
  private readonly cmsStore = inject(LocalizedCmsContentStore);

  protected readonly level = computed((): ClerkSiteStatusLevel => {
    if (this.cmsStore.isLoading()) {
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
        return 'The website may be showing older backup text. New saves in the editor might not appear until IT fixes the connection. Call Town Hall at (719) 829-4974.';
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
}
