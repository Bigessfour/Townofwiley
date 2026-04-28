import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { APP_COPY } from '../app';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';

@Component({
  selector: 'app-contact-page',
  templateUrl: './contact-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactPage {
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);

  protected readonly copy = computed(() => APP_COPY[this.siteLanguageService.currentLanguage() || 'en']);
  protected readonly contacts = this.cmsStore.contacts;
  protected readonly leadershipGroups = computed(() => this.copy().leadershipGroups);
}
