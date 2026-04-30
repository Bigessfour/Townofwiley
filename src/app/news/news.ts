import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguage, SiteLanguageService } from '../site-language';

interface ExternalLink {
  title: string;
  url: string;
  source: string;
}

interface NewsCopy {
  pageKicker: string;
  pageTitle: string;
  pageCopy: string;
  featuredKicker: string;
  officialKicker: string;
  officialHeading: string;
  officialCopy: string;
  regionalKicker: string;
  regionalHeading: string;
  regionalCopy: string;
  readArticleLabel: string;
}

const NEWS_COPY: Record<SiteLanguage, NewsCopy> = {
  en: {
    pageKicker: 'News & Notices',
    pageTitle: 'Town News and Announcements',
    pageCopy:
      'Review the latest Wiley notices first, then browse outside coverage that mentions Wiley or the surrounding county.',
    featuredKicker: 'Featured town notice',
    officialKicker: 'Official Town Notices',
    officialHeading: 'Current Wiley Updates',
    officialCopy: 'Direct notices and announcements from the Town of Wiley Clerk and staff.',
    regionalKicker: 'Regional Coverage',
    regionalHeading: 'News from Other Sources',
    regionalCopy: 'Regional and state media covering Wiley, CO or Prowers County.',
    readArticleLabel: 'Read article',
  },
  es: {
    pageKicker: 'Noticias y avisos',
    pageTitle: 'Noticias y anuncios del pueblo',
    pageCopy:
      'Revise primero los avisos mas recientes de Wiley y luego explore la cobertura externa que menciona a Wiley o el condado cercano.',
    featuredKicker: 'Aviso destacado del pueblo',
    officialKicker: 'Avisos oficiales del pueblo',
    officialHeading: 'Actualizaciones actuales de Wiley',
    officialCopy: 'Avisos y anuncios directos de la secretaria y el personal del Pueblo de Wiley.',
    regionalKicker: 'Cobertura regional',
    regionalHeading: 'Noticias de otras fuentes',
    regionalCopy: 'Medios regionales y estatales que cubren Wiley, CO o el condado de Prowers.',
    readArticleLabel: 'Leer articulo',
  },
};

// Regional links are used as fallback when no ExternalNewsLink records exist in the CMS.
const FALLBACK_REGIONAL_LINKS: ExternalLink[] = [
  {
    title: 'Lamar Ledger — Wiley and Prowers County Coverage',
    url: 'https://www.lamarledger.com/',
    source: 'Lamar Ledger',
  },
];

@Component({
  selector: 'app-news',
  imports: [CardModule],
  templateUrl: './news.html',
  styleUrl: './news.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class News {
  private readonly cms = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);

  protected readonly copy = computed(
    () => NEWS_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );
  protected readonly newsItems = this.cms.notices;
  protected readonly externalLinks = computed<ExternalLink[]>(() => {
    const cmsLinks = this.cms.externalNewsLinks();
    if (cmsLinks.length > 0) {
      return cmsLinks.map((l) => ({ title: l.title, url: l.url, source: l.source }));
    }
    return FALLBACK_REGIONAL_LINKS;
  });
  protected readonly featuredNotice = computed(() => this.newsItems()[0] ?? null);
  protected readonly remainingNotices = computed(() => this.newsItems().slice(1));

  protected readonly newsCardPt = {
    header: { class: 'news-card-header' },
    content: { class: 'news-card-content' },
    footer: { class: 'news-card-footer' },
  };
}
