import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type CmsContact, LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import { AccessibilityPage } from './accessibility-page';

interface AccessibilityStore {
  contacts: ReturnType<typeof signal<CmsContact[]>>;
  isLoading: ReturnType<typeof signal<boolean>>;
}

function configure(language: 'en' | 'es' = 'en') {
  const store: AccessibilityStore = {
    contacts: signal<CmsContact[]>([
      {
        id: 'town-information',
        label: 'Town Hall',
        value: '(719) 829-4974',
        detail: 'Town Hall front desk',
        href: 'tel:+17198294974',
      },
      {
        id: 'city-clerk',
        label: 'City Clerk',
        value: 'clerk@townofwiley.gov',
        detail: 'Records and meetings',
        href: 'mailto:clerk@townofwiley.gov',
        linkLabel: 'clerk@townofwiley.gov',
      },
    ]),
    isLoading: signal(false),
  };

  TestBed.configureTestingModule({
    imports: [AccessibilityPage],
    providers: [
      SiteLanguageService,
      {
        provide: LocalizedCmsContentStore,
        useValue: store as unknown as LocalizedCmsContentStore,
      },
    ],
  });
  TestBed.inject(SiteLanguageService).setLanguage(language);
  const fixture = TestBed.createComponent(AccessibilityPage);
  fixture.detectChanges();
  return fixture;
}

describe('AccessibilityPage', () => {
  it('renders heading and accessibility commitments (English)', () => {
    const fixture = configure('en');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Accessible services');
    expect(el.querySelectorAll('.accessibility-row').length).toBeGreaterThan(0);
    expect(el.querySelector('.compliance-note')?.textContent).toContain('accessibility');
  });

  it('renders Spanish heading and content', () => {
    const fixture = configure('es');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Servicios accesibles');
    expect(el.querySelector('.section-kicker')?.textContent).toContain('Accesibilidad');
    expect(el.querySelectorAll('.accessibility-row').length).toBeGreaterThan(0);
  });

  it('embeds the accessibility-support component with contacts wired in', () => {
    const fixture = configure('en');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-accessibility-support')).toBeTruthy();
  });

  it('renders a "Last reviewed" governance line in English', () => {
    const fixture = configure('en');
    const el = fixture.nativeElement as HTMLElement;
    const line = el.querySelector('[data-testid="accessibility-last-reviewed"]');
    expect(line?.textContent ?? '').toMatch(/Last reviewed:.+\d{4}/);
  });

  it('renders a "Ultima revision" governance line in Spanish', () => {
    const fixture = configure('es');
    const el = fixture.nativeElement as HTMLElement;
    const line = el.querySelector('[data-testid="accessibility-last-reviewed"]');
    expect(line?.textContent ?? '').toMatch(/Ultima revision:.+\d{4}/);
  });
});
