import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { APP_COPY, type AppCopy, type MeetingItem } from '../app-copy';
import {
  getCmsNoticeCardLink,
  getCmsNoticeExternalCtaLabel,
  getCmsNoticeExternalLinkSuffix,
  type CmsNoticeExternalKind,
} from '../cms-notice-link';
import { getAppRouteLink } from '../internal-route-link';
import { applyAppCopySiteCopyOverrides } from '../site-copy-overrides';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import { ThisWeekInWileyComponent } from '../this-week-in-wiley/this-week-in-wiley.component';
import { LocalizedWeatherPanel } from '../weather-panel/localized-weather-panel';
import { buildHomepageMeetings } from './build-homepage-meetings';

@Component({
  selector: 'app-homepage-landing',
  imports: [
    RouterLink,
    CardModule,
    DividerModule,
    SkeletonModule,
    TagModule,
    TimelineModule,
    ThisWeekInWileyComponent,
    LocalizedWeatherPanel,
  ],
  templateUrl: './homepage-landing.component.html',
  styleUrl: './homepage-landing.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'homepage-landing' },
})
export class HomepageLandingComponent {
  private static readonly HOMEPAGE_NOTICES_PREVIEW = 3;

  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);

  protected readonly siteLanguage = this.siteLanguageService.currentLanguage;
  protected readonly cmsContentLoading = this.cmsStore.isLoading;
  protected readonly notices = this.cmsStore.notices;
  protected readonly liveCalendarEvents = this.cmsStore.events;
  protected readonly cmsNoticeCardLink = getCmsNoticeCardLink;

  protected readonly taskCardPt = {
    content: { class: 'task-card-content' },
  };

  protected readonly appCopy = computed((): AppCopy => {
    const lang = this.siteLanguage();
    const base = APP_COPY[lang];
    return applyAppCopySiteCopyOverrides(base, (key) => this.cmsStore.getSiteCopy(key), lang);
  });

  protected readonly topTasks = computed(() => this.appCopy().topTasks);
  protected readonly topTasksKicker = computed(() => this.appCopy().topTasksKicker);
  protected readonly topTasksHeading = computed(() => this.appCopy().topTasksHeading);

  protected readonly homepageNotices = computed(() =>
    this.notices().slice(0, HomepageLandingComponent.HOMEPAGE_NOTICES_PREVIEW),
  );

  protected readonly meetings = computed<MeetingItem[]>(() => {
    const copy = this.appCopy();
    const locale = this.siteLanguage() === 'es' ? 'es-US' : 'en-US';

    return buildHomepageMeetings(
      this.liveCalendarEvents(),
      copy.meetings,
      copy,
      locale,
      this.cmsStore.linkedAgendaDocumentByEventId(),
      this.notices().length > HomepageLandingComponent.HOMEPAGE_NOTICES_PREVIEW,
    );
  });

  protected resolveAppLink(href: string | null | undefined, defaultPath = '/') {
    return getAppRouteLink(href, defaultPath);
  }

  protected noticeExternalCta(kind: CmsNoticeExternalKind): string {
    return getCmsNoticeExternalCtaLabel(kind, this.siteLanguageService.currentLanguage() || 'en');
  }

  protected externalLinkNewTabHint(): string {
    return getCmsNoticeExternalLinkSuffix(this.siteLanguageService.currentLanguage() || 'en');
  }
}
