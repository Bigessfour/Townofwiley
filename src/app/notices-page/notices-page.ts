import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { APP_COPY, type AppCopy } from '../app';
import {
  cmsNoticeFragmentId,
  getCmsNoticeCardLink,
  getCmsNoticeExternalCtaLabel,
  getCmsNoticeLinkAriaLabel,
  type CmsNoticeExternalKind,
} from '../cms-notice-link';
import { classifyCmsNoticeImageUrl, hideBrokenNoticeThumbnail } from '../cms-notice-media';
import { CmsNotice, LocalizedCmsContentStore } from '../site-cms-content';
import { applyAppCopySiteCopyOverrides } from '../site-copy-overrides';
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

  protected readonly copy = computed((): AppCopy => {
    const lang = this.siteLanguageService.currentLanguage() || 'en';
    const base = APP_COPY[lang];
    return applyAppCopySiteCopyOverrides(base, (key) => this.cmsStore.getSiteCopy(key), lang);
  });
  protected readonly cmsLoading = this.cmsStore.isLoading;
  protected readonly notices = this.cmsStore.notices;
  protected readonly cmsNoticeCardLink = getCmsNoticeCardLink;
  protected readonly classifyNoticeImage = classifyCmsNoticeImageUrl;
  protected readonly hideBrokenThumbnail = hideBrokenNoticeThumbnail;
  protected readonly cmsNoticeFragmentId = cmsNoticeFragmentId;

  protected noticeLinkAriaLabel(notice: CmsNotice): string {
    return getCmsNoticeLinkAriaLabel(notice, this.siteLanguageService.currentLanguage() || 'en');
  }

  protected noticeExternalCta(kind: CmsNoticeExternalKind): string {
    return getCmsNoticeExternalCtaLabel(kind, this.siteLanguageService.currentLanguage() || 'en');
  }
}
