import { afterNextRender, DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { fromEvent } from 'rxjs';
import { SiteLanguageService } from './site-language';

/**
 * Subscribes to browser online/offline events and surfaces bilingual status toasts.
 * Implements part of docs/feature-completion-spec.md "Offline Resilience".
 */
@Injectable({ providedIn: 'root' })
export class OfflineConnectivityNotifier {
  private readonly toast = inject(MessageService);
  private readonly language = inject(SiteLanguageService);
  private readonly destroyRef = inject(DestroyRef);
  /** Avoid "back online" toasts on every reconnect; offline warning is enough. */
  private offlineToastShown = false;

  constructor() {
    afterNextRender(() => {
      if (typeof window === 'undefined') {
        return;
      }

      fromEvent(window, 'offline')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.showOffline());

      fromEvent(window, 'online')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.showOnline());
    });
  }

  private showOffline(): void {
    if (this.offlineToastShown) {
      return;
    }

    this.offlineToastShown = true;
    const es = this.language.currentLanguage() === 'es';
    this.toast.add({
      severity: 'warn',
      summary: es ? 'Sin conexión a Internet' : 'You are offline',
      detail: es
        ? 'Puede seguir explorando páginas guardadas; los envíos se sincronizarán al volver la conexión.'
        : 'Cached pages may still work; form submissions will sync when you are back online.',
      life: 10_000,
      sticky: false,
    });
  }

  private showOnline(): void {
    this.offlineToastShown = false;
  }
}
