import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { AccessibilitySupport } from '../accessibility-support/accessibility-support';
import { APP_COPY } from '../app';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';

@Component({
  selector: 'app-accessibility-page',
  imports: [CardModule, AccessibilitySupport],
  templateUrl: './accessibility-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessibilityPage {
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);

  protected readonly copy = computed(() => APP_COPY[this.siteLanguageService.currentLanguage() || 'en']);
  protected readonly contacts = this.cmsStore.contacts;
  protected readonly accessibilityItems = computed(() => this.copy().accessibilityItems);
}
