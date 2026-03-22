import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the in-development message', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Town of Wiley');
    expect(compiled.querySelector('.status')?.textContent).toContain('Official Website In Development');
    expect(compiled.querySelector('#top-tasks h2')?.textContent).toContain('Top tasks');
    expect(compiled.querySelector('#site-search')).toBeTruthy();
    expect(compiled.querySelector('#calendar h2')?.textContent).toContain('calendar app');
    expect(compiled.querySelector('.meeting-card strong')?.textContent).toContain('City Council');
    expect(compiled.querySelector('.meeting-location')?.textContent).toContain('304 Main Street');
    expect(compiled.querySelector('.contact-link[href="tel:+17198294974"]')?.textContent).toContain('(719) 829-4974');
    expect(compiled.querySelector('.contact-link[href="mailto:deb.dillon@townofwiley.gov"]')?.textContent).toContain('deb.dillon@townofwiley.gov');
    expect(compiled.querySelector('.contact-link[href="mailto:stephen.mckitrick@townofwiley.gov"]')?.textContent).toContain('stephen.mckitrick@townofwiley.gov');
    expect(compiled.querySelector('.leadership-card h3')?.textContent).toContain('Mayor and Council');
    expect(compiled.querySelector('#accessibility h2')?.textContent).toContain('ADA and WCAG 2.1 AA');
  });
});
