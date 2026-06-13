import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { APP_COPY } from '../app';
import {
  cmsNoticeFragmentId,
  getCmsNoticeLinkAriaLabel,
  getCmsNoticeRouteLink,
} from '../cms-notice-link';
import { CmsNotice, LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';

@Component({
  selector: 'app-notices-page',
  imports: [NgOptimizedImage, RouterLink, CardModule, SkeletonModule],
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
  protected readonly cmsNoticeRouteLink = getCmsNoticeRouteLink;
  protected readonly cmsNoticeFragmentId = cmsNoticeFragmentId;
  protected noticeLinkAriaLabel(notice: CmsNotice): string {
    return getCmsNoticeLinkAriaLabel(notice, this.siteLanguageService.currentLanguage() || 'en');
  }
}
