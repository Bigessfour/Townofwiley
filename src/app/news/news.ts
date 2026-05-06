import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
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
  newsletterKicker: string;
  newsletterHeading: string;
  newsletterCopy: string;
  featuredKicker: string;
  officialKicker: string;
  officialHeading: string;
  officialCopy: string;
  officialEmptyState: string;
  officialEmptyWithNewsletterOnly: string;
  regionalKicker: string;
  regionalHeading: string;
  regionalCopy: string;
  readArticleLabel: string;
  /** Visually-hidden suffix announced by screen readers on external links. */
  externalLinkSuffixLabel: string;
}

const NEWS_COPY: Record<SiteLanguage, NewsCopy> = {
  en: {
    pageKicker: 'News & Notices',
    pageTitle: 'Town News and Announcements',
    pageCopy:
      "Read the Town newsletter and short official notices from the Clerk's office first, then browse links to outside news that mentions Wiley, CO, or Prowers County.",
    newsletterKicker: 'Town newsletter',
    newsletterHeading: 'Newsletter from Town Hall',
    newsletterCopy: 'Long-form updates prepared by the Town Clerk for Wiley residents.',
    featuredKicker: 'Featured town notice',
    officialKicker: 'Official Town Notices',
    officialHeading: 'Current Wiley Updates',
    officialCopy:
      'Brief bulletins and reminders from the Town Clerk and staff (separate from the newsletter).',
    officialEmptyState: 'No current notices. Check back soon for town updates.',
    officialEmptyWithNewsletterOnly:
      'No separate bulletin notices right now. See the town newsletter above for the latest from Town Hall.',
    regionalKicker: 'Wider web coverage',
    regionalHeading: 'Stories mentioning Wiley or Prowers County',
    regionalCopy:
      'Links to reporting on the public web that mentions Wiley, the Town of Wiley, or Prowers County. Staff add and review these links so residents can follow regional coverage in one place.',
    readArticleLabel: 'Read article',
    externalLinkSuffixLabel: 'opens in new tab',
  },
  es: {
    pageKicker: 'Noticias y avisos',
    pageTitle: 'Noticias y anuncios del pueblo',
    pageCopy:
      'Lea primero el boletin del pueblo y los avisos oficiales del despacho del secretario, luego explore enlaces a noticias externas que mencionan a Wiley, CO o el condado de Prowers.',
    newsletterKicker: 'Boletin del pueblo',
    newsletterHeading: 'Boletin del Ayuntamiento',
    newsletterCopy:
      'Actualizaciones extensas preparadas por la Secretaria municipal para residentes de Wiley.',
    featuredKicker: 'Aviso destacado del pueblo',
    officialKicker: 'Avisos oficiales del pueblo',
    officialHeading: 'Actualizaciones actuales de Wiley',
    officialCopy:
      'Boletines breves y recordatorios del secretario y el personal (aparte del boletin largo).',
    officialEmptyState: 'No hay avisos en este momento. Vuelva pronto.',
    officialEmptyWithNewsletterOnly:
      'No hay avisos breves en este momento. Consulte el boletin del pueblo arriba.',
    regionalKicker: 'Cobertura en la web',
    regionalHeading: 'Relatos que mencionan Wiley o Prowers',
    regionalCopy:
      'Enlaces a articulos en la web publica que mencionan a Wiley, el Pueblo de Wiley o el condado de Prowers. El personal agrega y revisa estos enlaces.',
    readArticleLabel: 'Leer articulo',
    externalLinkSuffixLabel: 'se abre en una pestana nueva',
  },
};

// When no ExternalNewsLink rows exist in the CMS, show a vetted regional source as a starting point.
const FALLBACK_REGIONAL_LINKS: ExternalLink[] = [
  {
    title: 'Lamar Ledger — Wiley and Prowers County Coverage',
    url: 'https://www.lamarledger.com/',
    source: 'Lamar Ledger',
  },
];

@Component({
  selector: 'app-news',
  imports: [CardModule, RouterLink, SkeletonModule],
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
  protected readonly cmsLoading = this.cms.isLoading;
  protected readonly newsletterItems = computed(() =>
    this.newsItems().filter((item) => item.type === 'newsletter'),
  );
  protected readonly noticeItems = computed(() =>
    this.newsItems().filter((item) => item.type !== 'newsletter'),
  );
  protected readonly featuredNotice = computed(() => this.noticeItems()[0] ?? null);
  protected readonly remainingNotices = computed(() => this.noticeItems().slice(1));
  protected readonly officialEmptyMessage = computed(() => {
    const messages = this.copy();
    return this.newsletterItems().length
      ? messages.officialEmptyWithNewsletterOnly
      : messages.officialEmptyState;
  });
  protected readonly externalLinks = computed<ExternalLink[]>(() => {
    const cmsLinks = this.cms.externalNewsLinks();
    if (cmsLinks.length > 0) {
      return cmsLinks.map((l) => ({ title: l.title, url: l.url, source: l.source }));
    }
    return FALLBACK_REGIONAL_LINKS;
  });

  protected readonly newsCardPt = {
    header: { class: 'news-card-header' },
    content: { class: 'news-card-content' },
    footer: { class: 'news-card-footer' },
  };

  /** Split CMS detail on blank lines; single blocks still render as one paragraph. */
  protected newsletterParagraphs(detail: string): string[] {
    const blocks = detail
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (blocks.length > 0) {
      return blocks;
    }
    const trimmed = detail.trim();
    return trimmed ? [trimmed] : [];
  }
}
