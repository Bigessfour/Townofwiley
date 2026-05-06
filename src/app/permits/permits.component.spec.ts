import { DOCUMENT } from '@angular/common';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CmsContact } from '../site-cms-content';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import { PermitsComponent } from './permits.component';

describe('PermitsComponent', () => {
  const clerk: CmsContact = {
    id: 'city-clerk',
    label: 'Town Clerk',
    value: 'Deb Dillon',
    detail: 'Clerk office',
    href: 'mailto:clerk@town.test',
    linkLabel: 'Email',
  };

  const townInfo: CmsContact = {
    id: 'town-information',
    label: 'Town Hall',
    value: 'Main line',
    detail: 'Hours',
    href: 'tel:+17198294974',
  };

  function mount(contacts: CmsContact[]) {
    const contactsSig = signal(contacts);
    TestBed.configureTestingModule({
      imports: [PermitsComponent],
      providers: [
        provideRouter([]),
        provideZonelessChangeDetection(),
        { provide: DOCUMENT, useValue: document },
        SiteLanguageService,
        {
          provide: LocalizedCmsContentStore,
          useValue: { contacts: contactsSig } as unknown as LocalizedCmsContentStore,
        },
      ],
    });
    const fixture = TestBed.createComponent(PermitsComponent);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('renders structured English copy and clerk section when CMS includes clerk', () => {
    const { root } = mount([clerk, townInfo]);

    expect(root.querySelector('.section-kicker')?.textContent).toContain('Town Hall services');
    expect(root.querySelector('h1')?.textContent).toContain('Permits & Inquiries');
    expect(root.querySelector('.feature-hub-copy')?.textContent).toContain(
      'does not currently process permits online',
    );
    expect(root.querySelector('#clerk-heading')?.textContent).toContain('Town Clerk');
    expect(root.querySelector('.clerk-name')?.textContent).toContain('Deb Dillon');
    expect(root.querySelector('a[href^="mailto:"]')?.getAttribute('href')).toBe(
      'mailto:clerk@town.test',
    );
    expect(root.querySelector('a[href^="tel:"]')?.getAttribute('href')).toBe('tel:+17198294974');
    expect(root.querySelector('[data-testid="permits-clerk-fallback"]')).toBeNull();
  });

  it('shows the bilingual fallback message when the city-clerk contact is missing', () => {
    const { root } = mount([{ ...townInfo, id: 'other-contact' }]);
    const fallback = root.querySelector('[data-testid="permits-clerk-fallback"]');
    expect(root.querySelector('#clerk-contact')).toBeNull();
    expect(fallback).toBeTruthy();
    expect(fallback?.textContent).toContain('contact information is being updated');
  });

  it('renders Spanish copy when site language is es', () => {
    const { fixture } = mount([clerk]);
    TestBed.inject(SiteLanguageService).setLanguage('es');
    TestBed.flushEffects();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.section-kicker')?.textContent).toContain(
      'Servicios del Ayuntamiento',
    );
    expect(root.querySelector('h1')?.textContent).toContain('Permisos e Indagaciones');
  });

  it('renders the Spanish fallback message when clerk is missing and language is es', () => {
    const { fixture } = mount([{ ...townInfo, id: 'other-contact' }]);
    TestBed.inject(SiteLanguageService).setLanguage('es');
    TestBed.flushEffects();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const fallback = root.querySelector('[data-testid="permits-clerk-fallback"]');
    expect(fallback?.textContent).toContain('Secretario se esta actualizando');
  });
});
