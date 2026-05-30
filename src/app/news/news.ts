import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { DocumentUploadService } from '../document-upload.service';
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
  newsletterIframeTitle: string;
  openPdfLabel: string;
  pdfFallbackCopy: string;
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
    newsletterIframeTitle: 'Town newsletter PDF',
    openPdfLabel: 'Open newsletter PDF in a new tab',
    pdfFallbackCopy:
      'A PDF version of this newsletter is not yet attached. Read the summary above or check back soon.',
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
    newsletterIframeTitle: 'Boletin del pueblo en PDF',
    openPdfLabel: 'Abrir el boletin en PDF en una pestana nueva',
    pdfFallbackCopy:
      'Aun no se ha adjuntado una version PDF de este boletin. Lea el resumen arriba o regrese pronto.',
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
  imports: [NgOptimizedImage, CardModule, RouterLink, SkeletonModule],
  templateUrl: './news.html',
  styleUrl: './news.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class News {
  private readonly cms = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly documentUploadService = inject(DocumentUploadService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly copy = computed(
    () => NEWS_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );
  protected readonly newsItems = this.cms.notices;
  protected readonly cmsLoading = this.cms.isLoading;
  protected readonly newsletterItems = computed(() =>
    this.newsItems().filter((item) => item.type === 'newsletter'),
  );
  /**
   * Only the latest active newsletter renders on /news. Records are already sorted by
   * `priority` ASC in the store, so the head of the list is the clerk-curated current issue.
   * `rawDate` (AWSDate) is a tiebreaker so a clerk who only edits dates still gets the newest.
   */
  protected readonly latestNewsletter = computed(() => {
    const newsletters = this.newsletterItems();
    if (!newsletters.length) {
      return null;
    }
    return [...newsletters].sort((left, right) => {
      const leftDate = left.rawDate ?? '';
      const rightDate = right.rawDate ?? '';
      if (leftDate && rightDate && leftDate !== rightDate) {
        return rightDate.localeCompare(leftDate);
      }
      return 0;
    })[0];
  });
  protected readonly noticeItems = computed(() =>
    this.newsItems().filter((item) => item.type !== 'newsletter'),
  );
  protected readonly featuredNotice = computed(() => this.noticeItems()[0] ?? null);
  protected readonly remainingNotices = computed(() => this.noticeItems().slice(1));
  protected readonly officialEmptyMessage = computed(() => {
    const messages = this.copy();
    return this.latestNewsletter()
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

  protected readonly resolvedNewsletterHref = signal<string | null>(null);
  protected readonly trustedNewsletterUrl = signal<SafeResourceUrl | null>(null);
  protected readonly newsletterHrefError = signal(false);

  constructor() {
    // Kick off resolution synchronously so initial render can render the iframe as soon as the
    // presigned URL resolves, mirroring DocumentHub's resolveCmsDocumentHrefs() boot path.
    void this.refreshNewsletterHref(untracked(() => this.latestNewsletter()?.attachmentKey));
    // React to subsequent newsletter changes (clerk publishes a newer issue, language toggles).
    effect(() => {
      const key = this.latestNewsletter()?.attachmentKey;
      void this.refreshNewsletterHref(key);
    });
  }

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

  private async refreshNewsletterHref(rawKey: string | null | undefined): Promise<void> {
    const key = rawKey?.trim();
    if (!key) {
      this.resolvedNewsletterHref.set(null);
      this.trustedNewsletterUrl.set(null);
      this.newsletterHrefError.set(false);
      return;
    }
    try {
      const url = await this.documentUploadService.resolveDocumentHref(key);
      this.resolvedNewsletterHref.set(url);
      this.trustedNewsletterUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      this.newsletterHrefError.set(false);
    } catch (error) {
      console.error('Failed to resolve newsletter PDF link:', error);
      this.resolvedNewsletterHref.set(null);
      this.trustedNewsletterUrl.set(null);
      this.newsletterHrefError.set(true);
    }
  }
}
