import { FormControl, FormGroup, Validators } from '@angular/forms';
import { describe, expect, it, vi } from 'vitest';
import { ResidentServices } from './resident-services';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResidentServicesHarness = any;

function createSignalMock<T>(initialValue: T) {
  let value = initialValue;

  return {
    set: vi.fn((nextValue: T) => {
      value = nextValue;
    }),
    update: vi.fn((updater: (currentValue: T) => T) => {
      value = updater(value);
      return value;
    }),
    get: vi.fn(() => value),
    asReadonly: vi.fn(() => value),
  };
}

function createHarness(): ResidentServicesHarness {
  const component = Object.create(ResidentServices.prototype) as ResidentServicesHarness;

  component.paymentForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    streetAddress: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    poBox: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    accountQuestion: new FormControl('', { nonNullable: true }),
  });
  component.issueForm = new FormGroup({
    category: new FormControl('water', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    details: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    preferredContact: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  component.recordsForm = new FormGroup({
    requestType: new FormControl('records', { nonNullable: true }),
    details: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    deadline: new FormControl('', { nonNullable: true }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    preferredContact: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  component.contactUpdateForm = new FormGroup({
    fullName: new FormControl('', { nonNullable: true }),
    serviceAddress: new FormControl('', { nonNullable: true }),
    poBox: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  component.copy = () => ({
    validationMessage: 'Complete the required fields so the site can prepare the message with the right details.',
    mailClientMessage: 'Your email app should open with a prepared message. If nothing happens, use the direct phone or email links in this card.',
    requiredFieldMessage: 'This field is required.',
    invalidEmailMessage: 'Enter a valid email address.',
    paymentSubject: 'Utility payment help request',
    issueSubject: 'Town issue report',
    recordsSubject: 'Records or permit request',
    paymentNameLabel: 'Resident name',
    paymentPhoneLabel: 'Phone number',
    paymentEmailLabel: 'Email address',
    paymentStreetAddressLabel: 'Street address',
    paymentPoBoxLabel: 'PO Box',
    paymentQuestionLabel: 'Billing question',
    paymentPortalUnavailableMessage: 'Online utility payment is temporarily unavailable. Use the billing help email for account help and payment instructions.',
    paymentPortalLaunchMessage: 'Opening the secure Paystar payment portal.',
    paymentPortalErrorMessage: 'Secure online payment is unavailable right now. Use the billing help email and Town Hall staff will help you complete your payment.',
    issueCategoryLabel: 'Issue type',
    issueLocationLabel: 'Location',
    issueDetailsLabel: 'What happened',
    issueNameLabel: 'Resident name',
    issueContactLabel: 'Best phone or email for follow-up',
    recordsTypeLabel: 'Request type',
    recordsNameLabel: 'Resident or business name',
    recordsContactLabel: 'Best phone or email for reply',
    recordsDeadlineLabel: 'Requested deadline or meeting date',
    recordsDetailsLabel: 'Records, permit, or clerk request details',
    contactUpdateFullNameLabel: 'Full name',
    contactUpdateServiceAddressLabel: 'Service address',
    contactUpdatePoBoxLabel: 'PO Box',
    contactUpdatePhoneLabel: 'Phone number',
    contactUpdateEmailLabel: 'Email address',
    contactUpdateNotesLabel: 'Additional notes',
    contactUpdateSubject: 'Resident contact information update',
    contactUpdateEmptyMessage: 'Fill in at least one field to send a contact update.',
    contactUpdateSuccessMessage: 'Contact info sent to the Clerk. Thank you!',
    issueCategories: [
      { value: 'water', label: 'Water or sewer' },
      { value: 'street', label: 'Street or pothole' },
      { value: 'streetlight', label: 'Streetlight or signage' },
      { value: 'property', label: 'Property or nuisance concern' },
      { value: 'other', label: 'Other town issue' },
    ],
    requestTypes: [
      { value: 'records', label: 'Public records / FOIA' },
      { value: 'permit', label: 'Permit guidance' },
      { value: 'license', label: 'License or fee question' },
      { value: 'clerk', label: 'Clerk assistance' },
    ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  component.validationMessage = (ResidentServices.prototype as any).validationMessage;
  component.buildPaymentMailtoHref = (ResidentServices.prototype as any).buildPaymentMailtoHref;
  component.buildIssueMailtoHref = (ResidentServices.prototype as any).buildIssueMailtoHref;
  component.buildRecordsMailtoHref = (ResidentServices.prototype as any).buildRecordsMailtoHref;
  component.buildContactUpdateMailtoHref = (ResidentServices.prototype as any).buildContactUpdateMailtoHref;
  component.selectServicePanel = (ResidentServices.prototype as any).selectServicePanel;
  component.openPaystarPortal = (ResidentServices.prototype as any).openPaystarPortal;
  component.openContactUpdateMailto = (ResidentServices.prototype as any).openContactUpdateMailto;
  component.toggleContactUpdate = (ResidentServices.prototype as any).toggleContactUpdate;
  component.dismissContactUpdate = (ResidentServices.prototype as any).dismissContactUpdate;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  component.paymentFormValue = () => component.paymentForm.getRawValue();
  component.issueFormValue = () => component.issueForm.getRawValue();
  component.recordsFormValue = () => component.recordsForm.getRawValue();
  component.contactUpdateFormValue = () => component.contactUpdateForm.getRawValue();
  component.clerkContact = () => ({ href: 'mailto:clerk@wiley.gov', value: 'Town Clerk', linkLabel: 'Email the Clerk' });
  component.townInfoContact = () => ({ href: 'mailto:townhall@wiley.gov', value: 'Town Hall', linkLabel: 'Town Hall' });
  component.superintendentContact = () => ({ href: 'mailto:scott.whitman@townofwiley.gov', value: 'Scott Whitman', linkLabel: 'Town Superintendent' });
  component.paymentPortalAvailable = true;
  component.paymentPortalHref = null;
  component.paystarConnection = {
    createLaunchRequest: vi.fn(),
  };
  component.siteLanguageService = {
    currentLanguage: () => 'en',
  };
  component.contactUpdateService = {
    submitUpdate: vi.fn(),
  };
  component.activeServicePanel = () => 'payment';
  component.paymentStatus = createSignalMock<string | null>(null);
  component.issueStatus = createSignalMock<string | null>(null);
  component.recordsStatus = createSignalMock<string | null>(null);
  component.contactUpdateStatus = createSignalMock<string | null>(null);
  component.contactUpdateExpanded = createSignalMock(false);
  component.hasSubmittedContactUpdate = createSignalMock(false);
  component.paymentMailtoHref = () => null;
  component.issueMailtoHref = () => null;
  component.recordsMailtoHref = () => null;
  component.contactUpdateMailtoHref = () => null;

  return component;
}

describe('ResidentServices validation helpers', () => {
  it('returns required-field messaging for touched empty payment inputs', () => {
    const component = createHarness();
    const control = component.paymentForm.controls.name;

    control.markAsTouched();

    expect(component.validationMessage(control, 'Resident name')).toBe(
      'Resident name: This field is required.',
    );
  });

  it('returns invalid-email messaging for malformed payment email input', () => {
    const component = createHarness();
    const control = component.paymentForm.controls.email;

    control.setValue('not-an-email');
    control.markAsTouched();
    control.setErrors({ email: true });

    expect(component.validationMessage(control, 'Email address')).toBe('Enter a valid email address.');
  });

  it('returns required message for other form fields like issue location', () => {
    const component = createHarness();
    const control = new FormControl('', { validators: [Validators.required], nonNullable: true });
    control.markAsTouched();
    control.setErrors({ required: true });

    expect(component.validationMessage(control, 'Location')).toBe('Location: This field is required.');
  });
});

describe('ResidentServices mailto and portal flows', () => {
  it('marks payment fields touched and shows validation messaging when the mailto action is unavailable', () => {
    const component = createHarness();
    const event = { preventDefault: vi.fn() } as unknown as Event;

    component.openPaymentMailto(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.paymentForm.controls.name.touched).toBe(true);
    expect(component.paymentForm.controls.streetAddress.touched).toBe(true);
    expect(component.paymentStatus.set).toHaveBeenCalledWith(
      'Complete the required fields so the site can prepare the message with the right details.',
    );
  });

  it('builds issue and records mailto hrefs with the correct recipients and labels', () => {
    const component = createHarness();

    component.issueForm.patchValue({
      category: 'streetlight',
      location: '210 Main Street',
      details: 'The streetlight at the corner is out.',
      name: 'Jordan Resident',
      preferredContact: 'jordan@example.com',
    });
    component.recordsForm.patchValue({
      requestType: 'permit',
      details: 'Please send the permit checklist.',
      deadline: 'Friday afternoon',
      name: 'Jordan Resident',
      preferredContact: 'jordan@example.com',
    });

    const issueHref = component.buildIssueMailtoHref();
    const recordsHref = component.buildRecordsMailtoHref();

    expect(issueHref).toContain('mailto:scott.whitman@townofwiley.gov');
    expect(issueHref).toContain('subject=Town+issue+report+%7C+Streetlight+or+signage');
    expect(issueHref).toContain('Issue+type%3A+Streetlight+or+signage');
    expect(issueHref).toContain('Location%3A+210+Main+Street');
    expect(recordsHref).toContain('mailto:clerk@wiley.gov');
    expect(recordsHref).toContain('subject=Records+or+permit+request+%7C+Permit+guidance');
    expect(recordsHref).toContain('Request+type%3A+Permit+guidance');
    expect(recordsHref).toContain('Requested+deadline+or+meeting+date%3A+Friday+afternoon');
  });

  it('builds contact-update mailto href only when at least one field is filled', () => {
    const component = createHarness();

    expect(component.buildContactUpdateMailtoHref()).toBeNull();

    component.contactUpdateForm.patchValue({
      fullName: 'Jordan Resident',
      serviceAddress: '210 Main Street',
      phone: '719-555-0102',
      email: 'jordan@example.com',
      notes: 'Please update the mailing address on file.',
    });

    const href = component.buildContactUpdateMailtoHref();

    expect(href).toContain('mailto:clerk@wiley.gov');
    expect(href).toContain('subject=Resident+contact+information+update');
    expect(href).toContain('Full+name%3A+Jordan+Resident');
    expect(href).toContain('Service+address%3A+210+Main+Street');
    expect(href).toContain('Additional+notes%3A+Please+update+the+mailing+address+on+file.');
  });

  it('shows unavailable payment messaging when the portal is not configured', async () => {
    const component = createHarness();
    const event = { preventDefault: vi.fn() } as unknown as Event;

    component.paymentPortalAvailable = false;
    component.paymentPortalHref = null;

    await component.openPaystarPortal(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.paymentStatus.set).toHaveBeenCalledWith(
      'Online utility payment is temporarily unavailable. Use the billing help email for account help and payment instructions.',
    );
  });

  it('toggles and dismisses the contact update prompt', () => {
    const component = createHarness();

    expect(component.contactUpdateExpanded.get()).toBe(false);

    component.toggleContactUpdate();

    expect(component.contactUpdateExpanded.get()).toBe(true);

    component.dismissContactUpdate();

    expect(component.hasSubmittedContactUpdate.get()).toBe(true);
  });

  it('shows contact update validation messaging when no fields are filled', async () => {
    const component = createHarness();
    const event = { preventDefault: vi.fn() } as unknown as Event;

    await component.openContactUpdateMailto(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.contactUpdateService.submitUpdate).not.toHaveBeenCalled();
    expect(component.contactUpdateStatus.set).toHaveBeenCalledWith(
      'Fill in at least one field to send a contact update.',
    );
  });

  it('completes the contact-update flow when the API succeeds', async () => {
    const component = createHarness();
    const submitUpdate = vi.fn().mockResolvedValue({ outcome: 'api-success' });
    component.contactUpdateService.submitUpdate = submitUpdate;
    component.contactUpdateMailtoHref = () => 'mailto:clerk@wiley.gov?subject=Resident+contact+information+update';

    component.contactUpdateForm.patchValue({
      fullName: 'Jordan Resident',
      serviceAddress: '210 Main Street',
      phone: '719-555-0102',
      email: 'jordan@example.com',
      notes: 'Please update the mailing address on file.',
    });

    await component.openContactUpdateMailto({ preventDefault: vi.fn() } as unknown as Event);

    expect(submitUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Jordan Resident',
        serviceAddress: '210 Main Street',
        phone: '719-555-0102',
        email: 'jordan@example.com',
        notes: 'Please update the mailing address on file.',
        locale: 'en',
        source: 'payment-panel',
      }),
      expect.stringContaining('mailto:clerk@wiley.gov'),
    );
    expect(component.contactUpdateStatus.set).toHaveBeenCalledWith('Contact info sent to the Clerk. Thank you!');
    expect(component.contactUpdateExpanded.set).toHaveBeenCalledWith(false);
    expect(component.hasSubmittedContactUpdate.set).toHaveBeenCalledWith(true);
  });
});
