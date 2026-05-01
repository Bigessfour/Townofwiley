import { DOCUMENT } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SiteLanguageService } from '../site-language';
import { RECORDS_CENTER_COPY, RecordsCenter } from './records-center';

describe('RecordsCenter', () => {
  function mount() {
    TestBed.configureTestingModule({
      imports: [RecordsCenter],
      providers: [
        provideRouter([]),
        provideZonelessChangeDetection(),
        { provide: DOCUMENT, useValue: document },
        SiteLanguageService,
      ],
    });
    const fixture = TestBed.createComponent(RecordsCenter);
    TestBed.flushEffects();
    fixture.detectChanges();
    return { root: fixture.nativeElement as HTMLElement };
  }

  it('exposes four English guide cards with stable ids', () => {
    expect(RECORDS_CENTER_COPY.en.guides).toHaveLength(4);
    const ids = RECORDS_CENTER_COPY.en.guides.map((g) => g.id);
    expect(ids).toEqual([
      'records-guide-foia',
      'records-guide-packets',
      'records-guide-budgets',
      'records-guide-ordinances',
    ]);
  });

  it('renders guide titles and internal document hub links', () => {
    const { root } = mount();

    expect(root.querySelector('h1')?.textContent).toContain('public document destinations');
    expect(root.querySelectorAll('.records-guide-card').length).toBe(4);
    expect(root.querySelector('#records-guide-foia h2')?.textContent).toContain('FOIA');
    const firstLink = root.querySelector('#records-guide-foia a.records-guide-link');
    expect(firstLink?.getAttribute('href')).toMatch(/\/documents/);
  });

  it('uses Spanish copy when site language is Spanish', () => {
    TestBed.configureTestingModule({
      imports: [RecordsCenter],
      providers: [
        provideRouter([]),
        provideZonelessChangeDetection(),
        { provide: DOCUMENT, useValue: document },
        SiteLanguageService,
      ],
    });
    TestBed.inject(SiteLanguageService).setLanguage('es');
    const fixture = TestBed.createComponent(RecordsCenter);
    TestBed.flushEffects();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toContain('destinos publicos');
  });
});
