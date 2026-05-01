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

  it('renders permit messaging and clerk section when CMS includes clerk', () => {
    const { root } = mount([clerk, townInfo]);

    expect(root.querySelector('h1')?.textContent?.trim()).toContain('Permits');
    expect(root.textContent).toMatch(/city or Town Clerk|Town Clerk/);
    expect(root.textContent).toContain('Deb Dillon');
    expect(root.querySelector('a[href^="mailto:"]')?.getAttribute('href')).toBe(
      'mailto:clerk@town.test',
    );
  });

  it('omits clerk section when city-clerk contact is absent', () => {
    const { root } = mount([{ ...townInfo, id: 'other-contact' }]);

    expect(root.querySelector('#clerk-contact')).toBeNull();
  });

  it('shows Spanish headings when site language is Spanish', () => {
    const { fixture } = mount([clerk]);
    TestBed.inject(SiteLanguageService).setLanguage('es');
    TestBed.flushEffects();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toContain('Permisos');
  });
});
