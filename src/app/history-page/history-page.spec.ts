import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SiteLanguageService } from '../site-language';
import { HISTORY_DOCUMENT_IMAGE_SRC, HISTORY_PDF_HREF, HistoryPage } from './history-page';

function configure(language: 'en' | 'es' = 'en') {
  TestBed.configureTestingModule({
    imports: [HistoryPage],
    providers: [SiteLanguageService, provideRouter([])],
  });
  TestBed.inject(SiteLanguageService).setLanguage(language);
  const fixture = TestBed.createComponent(HistoryPage);
  fixture.detectChanges();
  return fixture;
}

describe('HistoryPage', () => {
  it('renders heading and history document image (English)', () => {
    const fixture = configure('en');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('History & Stories');
    const image = el.querySelector('[data-testid="history-document-image"]') as HTMLImageElement | null;
    expect(image?.getAttribute('ng-src') ?? image?.getAttribute('src') ?? '').toContain(
      HISTORY_DOCUMENT_IMAGE_SRC.replace(/^\//, ''),
    );
    const pdf = el.querySelector('[data-testid="history-pdf-download"]');
    expect(pdf?.getAttribute('href')).toBe(HISTORY_PDF_HREF);
    expect(pdf?.textContent).toContain('Open printable PDF');
  });

  it('renders Spanish heading and PDF label', () => {
    const fixture = configure('es');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Historia y Relatos');
    expect(el.querySelector('[data-testid="history-pdf-download"]')?.textContent).toContain(
      'Abrir PDF',
    );
  });
});
