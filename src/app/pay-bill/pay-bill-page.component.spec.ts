import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import { PayBillPageComponent } from './pay-bill-page.component';

describe('PayBillPageComponent', () => {
  interface RuntimeShape {
    payments?: { provider?: string; paystar?: { mode?: string; portalUrl?: string } };
  }

  function setRuntimePaystarMode(mode: 'none' | 'hosted', portalUrl = ''): void {
    const w = window as Window & {
      __TOW_RUNTIME_CONFIG_OVERRIDE__?: RuntimeShape;
    };
    w.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      payments: { provider: 'paystar', paystar: { mode, portalUrl } },
    };
  }

  function clearRuntimePaystarOverride(): void {
    const w = window as Window & {
      __TOW_RUNTIME_CONFIG_OVERRIDE__?: RuntimeShape;
    };
    delete w.__TOW_RUNTIME_CONFIG_OVERRIDE__;
  }

  afterEach(() => {
    clearRuntimePaystarOverride();
  });

  function setup(contacts: { id: string; href?: string; linkLabel?: string }[] = []) {
    TestBed.configureTestingModule({
      imports: [PayBillPageComponent],
      providers: [
        provideAnimations(),
        provideZonelessChangeDetection(),
        SiteLanguageService,
        {
          provide: LocalizedCmsContentStore,
          useValue: {
            getSiteCopy: () => undefined,
            contacts: signal(contacts),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(PayBillPageComponent);
    TestBed.flushEffects();
    return { fixture, component: fixture.componentInstance };
  }

  it('renders the CTA band with Ready to pay heading', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    const ctaBand = fixture.nativeElement.querySelector('[data-testid="pay-bill-cta-band"]');
    expect(ctaBand).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Ready to pay?');
  });

  it('renders the English instruction infographic by default', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    const infographic = fixture.nativeElement.querySelector(
      '[data-testid="pay-instructions-infographic"]',
    ) as HTMLImageElement | null;
    expect(infographic).not.toBeNull();
    expect(infographic?.getAttribute('src')).toContain('pay-bill-instructions-en.jpg');
    expect(infographic?.getAttribute('alt')).toContain('How to Pay Your Utility Bill');
  });

  it('switches to the Spanish instruction infographic when site language is ES', () => {
    const { fixture } = setup();
    const siteLanguage = TestBed.inject(SiteLanguageService);
    siteLanguage.setLanguage('es');
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const infographic = fixture.nativeElement.querySelector(
      '[data-testid="pay-instructions-infographic"]',
    ) as HTMLImageElement | null;
    expect(infographic?.getAttribute('src')).toContain('pay-bill-instructions-es-v2.jpg');
    expect(infographic?.getAttribute('alt')).toContain('Cómo Pagar Su Factura');
  });

  it('disables the portal CTA when Paystar mode is "none"', () => {
    setRuntimePaystarMode('none');
    const { fixture, component } = setup();
    fixture.detectChanges();

    expect(component['quickPayDisabled']()).toBe(true);

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="pay-bill-portal-cta-disabled"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="pay-bill-portal-cta"]')).toBeNull();
  });

  it('keeps the portal CTA active when Paystar mode is "hosted"', () => {
    setRuntimePaystarMode('hosted', 'https://secure.paystar.io/pay/townofwiley-utility');
    const { fixture, component } = setup();
    fixture.detectChanges();

    expect(component['quickPayDisabled']()).toBe(false);

    const activeCta = fixture.nativeElement.querySelector(
      '[data-testid="pay-bill-portal-cta"]',
    ) as HTMLAnchorElement | null;
    expect(activeCta).not.toBeNull();
    expect(activeCta?.classList.contains('p-button-primary')).toBe(true);
    expect(activeCta?.getAttribute('href')).toContain('paystar.io');
  });

  it('disables the portal CTA when hosted mode has no portalUrl', () => {
    setRuntimePaystarMode('hosted');
    const { fixture, component } = setup();
    fixture.detectChanges();

    expect(component['quickPayDisabled']()).toBe(true);
    expect(component['quickPayIsPlaceholder']()).toBe(true);
    expect(
      fixture.nativeElement.querySelector('[data-testid="pay-bill-portal-placeholder"]'),
    ).not.toBeNull();
  });

  it('shows the default clerk email when CMS has no city-clerk row', () => {
    const { fixture, component } = setup();
    fixture.detectChanges();

    expect(component['clerkEmailLabel']()).toBe('clerk@townofwiley.gov');
    expect(component['clerkEmailHref']()).toBe('mailto:clerk@townofwiley.gov');
    expect(fixture.nativeElement.textContent).toContain('clerk@townofwiley.gov');
  });

  it('uses the CMS mailto address when city-clerk has no linkLabel', () => {
    const { fixture, component } = setup([
      {
        id: 'city-clerk',
        href: 'mailto:deb@townofwiley.gov',
      },
    ]);
    fixture.detectChanges();

    expect(component['clerkEmailLabel']()).toBe('deb@townofwiley.gov');
    expect(component['clerkEmailHref']()).toBe('mailto:deb@townofwiley.gov');
    expect(fixture.nativeElement.textContent).toContain('deb@townofwiley.gov');
  });
});
