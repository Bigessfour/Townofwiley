import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { APP_COPY, type LeadershipGroup } from '../app';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';

@Component({
  selector: 'app-contact-page',
  imports: [CardModule, SkeletonModule],
  templateUrl: './contact-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactPage {
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);

  protected readonly copy = computed(
    () => APP_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );
  protected readonly cmsLoading = this.cmsStore.isLoading;
  protected readonly contacts = this.cmsStore.contacts;
  protected readonly leadershipGroups = computed<LeadershipGroup[]>(() => {
    const base = this.copy().leadershipGroups;
    const cmsMap = this.cmsStore.leadershipRosterLinesByGroup();

    if (cmsMap.size === 0) {
      return base;
    }

    return base.map((group) => {
      const cmsLines = cmsMap.get(group.groupId);

      if (cmsLines?.length) {
        return { ...group, members: [...cmsLines] };
      }

      return group;
    });
  });
}
