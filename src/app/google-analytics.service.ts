import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Live GA4 measurement ID (must match public/google-analytics-init.js). */
export const GA4_MEASUREMENT_ID = 'G-HS0707W6BF';

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

/**
 * Sends GA4 page_view events on Angular client-side navigations.
 *
 * `public/google-analytics-init.js` configures the tag with `send_page_view: false`
 * so the initial load and later SPA routes are both measured here — otherwise GA4
 * only sees one page_view and reports a near-100% bounce rate.
 */
@Injectable({ providedIn: 'root' })
export class GoogleAnalyticsService {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  /** Last page_path we reported (path + query, no hash) to avoid duplicate hits. */
  private lastReportedPath: string | null = null;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        // Let App browserMetadataEffect update document title before reading it.
        queueMicrotask(() => this.sendPageView(event.urlAfterRedirects));
      });
  }

  /** Exposed for unit tests — sends one GA4 page_view when gtag is available. */
  sendPageView(urlAfterRedirects: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const pathWithQueryHash = this.normalizeAppUrl(urlAfterRedirects);
    const pagePath = pathWithQueryHash.split('#')[0] || '/';
    if (pagePath === this.lastReportedPath) {
      return;
    }

    const gtag = window.gtag;
    if (typeof gtag !== 'function') {
      return;
    }

    this.lastReportedPath = pagePath;
    const pageTitle = this.title.getTitle() || document.title || 'Town of Wiley';

    gtag('event', 'page_view', {
      page_title: pageTitle,
      page_location: window.location.href,
      page_path: pagePath,
      send_to: GA4_MEASUREMENT_ID,
    });
  }

  private normalizeAppUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) {
      return '/';
    }
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
}
