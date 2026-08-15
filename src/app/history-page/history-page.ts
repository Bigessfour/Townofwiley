import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { APP_COPY } from '../app';
import { SiteLanguageService } from '../site-language';

/** Raster of the one-page history flyer (reliable cross-browser display). */
export const HISTORY_DOCUMENT_IMAGE_SRC = '/media/wiley-history-one-page.webp' as const;

/** Printable PDF companion (opens in a new tab). */
export const HISTORY_PDF_HREF = '/media/wiley-history-one-page.pdf' as const;

@Component({
  selector: 'app-history-page',
  imports: [CardModule, NgOptimizedImage],
  templateUrl: './history-page.html',
  styleUrl: './history-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPage {
  private readonly siteLanguageService = inject(SiteLanguageService);

  protected readonly copy = computed(
    () => APP_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );

  protected readonly documentImageSrc = HISTORY_DOCUMENT_IMAGE_SRC;
  protected readonly pdfHref = HISTORY_PDF_HREF;
}
