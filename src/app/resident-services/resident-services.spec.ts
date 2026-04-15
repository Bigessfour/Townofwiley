import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ResidentServices } from './resident-services';

type ResidentServicesTestHarness = ResidentServices & {
  paymentForm: ResidentServices['paymentForm'];
  copy: ResidentServices['copy'];
  validationMessage: ResidentServices['validationMessage'];
};

describe('ResidentServices', () => {
  beforeEach(() => {
    window.localStorage.removeItem('tow-site-language');
  });

  it('shows field-level validation messages for invalid payment inputs', () => {
    TestBed.configureTestingModule({
      imports: [ResidentServices],
      providers: [provideHttpClient(), provideRouter([])],
    });

    const fixture = TestBed.createComponent(ResidentServices);
    const component = fixture.componentInstance as ResidentServicesTestHarness;

    component.paymentForm.controls.name.markAsTouched();
    component.paymentForm.controls.email.markAsTouched();
    component.paymentForm.controls.phone.markAsTouched();
    component.paymentForm.controls.streetAddress.markAsTouched();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('p-message').length).toBeGreaterThanOrEqual(4);
    expect(compiled.textContent).toContain('This field is required.');
  });

  it('returns an invalid email message for bad email input', () => {
    TestBed.configureTestingModule({
      imports: [ResidentServices],
      providers: [provideHttpClient(), provideRouter([])],
    });

    const fixture = TestBed.createComponent(ResidentServices);
    const component = fixture.componentInstance as ResidentServicesTestHarness;

    component.paymentForm.controls.email.setValue('not-an-email');
    component.paymentForm.controls.email.markAsTouched();

    expect(component.validationMessage(component.paymentForm.controls.email, component.copy().paymentEmailLabel)).toBe(
      'Enter a valid email address.',
    );
  });
});
