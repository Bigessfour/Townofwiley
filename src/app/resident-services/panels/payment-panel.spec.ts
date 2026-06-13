import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ResidentPaymentPanel } from './payment-panel';

const COPY = {
  paymentMeta: 'Utilities',
  paymentTitle: 'Pay bill',
  paymentBody: 'Pay your utility bill online through Paystar.',
  paymentIcon: 'pi pi-credit-card',
  phoneFallbackLabel: 'Call',
  emailFallbackLabel: 'Email',
  payBillLinkLabel: 'Pay your utility bill',
};

describe('ResidentPaymentPanel', () => {
  function setUp() {
    TestBed.configureTestingModule({
      imports: [ResidentPaymentPanel],
      providers: [provideRouter([]), provideAnimations()],
    });
    const fixture = TestBed.createComponent(ResidentPaymentPanel);
    fixture.componentRef.setInput('copy', COPY);
    fixture.componentRef.setInput('townHallPhoneHref', 'tel:+17198294974');
    fixture.componentRef.setInput('townHallPhoneLabel', '(719) 829-4974');
    fixture.componentRef.setInput('clerkEmailHref', 'mailto:clerk@townofwiley.gov');
    fixture.componentRef.setInput('clerkEmailLabel', 'Town Clerk');
    fixture.detectChanges();
    return fixture;
  }

  it('renders payment heading and link to /pay-bill', () => {
    const fixture = setUp();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h2')?.textContent).toContain('Pay bill');
    const link = el.querySelector('[data-testid="resident-pay-bill-link"]');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toContain('/pay-bill');
  });
});
