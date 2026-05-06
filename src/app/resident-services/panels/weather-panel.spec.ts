import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ResidentWeatherPanel } from './weather-panel';

describe('ResidentWeatherPanel', () => {
  it('renders weather copy and the routerLink CTA', () => {
    TestBed.configureTestingModule({
      imports: [ResidentWeatherPanel],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ResidentWeatherPanel);
    fixture.componentRef.setInput('copy', {
      weatherMeta: 'Safety',
      weatherTitle: 'Weather alerts',
      weatherBody: 'Local forecast',
      weatherIcon: 'pi pi-cloud',
      weatherCta: 'Open weather page',
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h2')?.textContent).toContain('Weather alerts');
    expect(el.querySelector('p.meta-label')?.textContent).toContain('Safety');
    const cta = el.querySelector('a[href="/weather"]') as HTMLAnchorElement | null;
    expect(cta?.textContent ?? cta?.getAttribute('aria-label')).toContain('Open weather page');
  });
});
