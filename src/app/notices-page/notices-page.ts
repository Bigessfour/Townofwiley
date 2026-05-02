import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { APP_COPY } from '../app';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';

@Component({
  selector: 'app-notices-page',
  imports: [CardModule, ProgressSpinnerModule],
  templateUrl: './notices-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoticesPage {
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);

  protected readonly copy = computed(
    () => APP_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );
  protected readonly cmsLoading = this.cmsStore.isLoading;
  protected readonly notices = this.cmsStore.notices;
}
