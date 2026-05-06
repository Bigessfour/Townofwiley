import { TestBed } from '@angular/core/testing';
import { SiteLanguageService } from '../site-language';
import { PrivacyPage } from './privacy-page';

function configure(language: 'en' | 'es' = 'en') {
  TestBed.configureTestingModule({
    imports: [PrivacyPage],
    providers: [SiteLanguageService],
  });
  TestBed.inject(SiteLanguageService).setLanguage(language);
  const fixture = TestBed.createComponent(PrivacyPage);
  fixture.detectChanges();
  return fixture;
}

describe('PrivacyPage', () => {
  it('renders the privacy policy heading and policy items (English)', () => {
    const fixture = configure('en');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Weather alert privacy notice');
    const items = Array.from(el.querySelectorAll('.info-row strong'));
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((node) => node.textContent?.includes('Information we collect'))).toBe(true);
  });

  it('renders Spanish heading and policy items', () => {
    const fixture = configure('es');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent?.toLowerCase()).toContain('aviso');
    expect(el.querySelectorAll('.info-row').length).toBeGreaterThan(0);
  });

  it('renders a non-empty intro paragraph', () => {
    const fixture = configure('en');
    const el = fixture.nativeElement as HTMLElement;
    const intro = el.querySelector('.feature-hub-copy');
    expect(intro?.textContent?.trim().length).toBeGreaterThan(20);
  });

  it('renders a "Last updated" governance line in English', () => {
    const fixture = configure('en');
    const el = fixture.nativeElement as HTMLElement;
    const line = el.querySelector('[data-testid="privacy-last-updated"]');
    expect(line?.textContent ?? '').toMatch(/Last updated:.+\d{4}/);
  });

  it('renders a "Ultima actualizacion" governance line in Spanish', () => {
    const fixture = configure('es');
    const el = fixture.nativeElement as HTMLElement;
    const line = el.querySelector('[data-testid="privacy-last-updated"]');
    expect(line?.textContent ?? '').toMatch(/Ultima actualizacion:.+\d{4}/);
  });
});
