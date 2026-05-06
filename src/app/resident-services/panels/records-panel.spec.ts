import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
  type RecordsFormGroup,
  type RecordsRequestType,
  ResidentRecordsPanel,
} from './records-panel';

function makeRecordsForm(): RecordsFormGroup {
  return new FormGroup({
    requestType: new FormControl<RecordsRequestType>('records', { nonNullable: true }),
    details: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    deadline: new FormControl('', { nonNullable: true }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    preferredContact: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
}

const COPY = {
  recordsMeta: 'Clerk',
  recordsTitle: 'Records & permits',
  recordsBody: 'Request public records',
  recordsIcon: 'pi pi-file',
  recordsTypeLabel: 'Request type',
  recordsDetailsLabel: 'Details',
  recordsDeadlineLabel: 'Deadline',
  recordsNameLabel: 'Name',
  recordsContactLabel: 'Contact',
  recordsSubmitLabel: 'Send request',
  permitsClerkInfoLinkLabel: 'Permits link',
  businessDirectoryLinkLabel: 'Business directory',
  phoneFallbackLabel: 'Call Town Hall',
  emailFallbackLabel: 'Email contact',
  requestTypes: [
    { value: 'records' as const, label: 'Records' },
    { value: 'license' as const, label: 'License' },
    { value: 'clerk' as const, label: 'Clerk' },
  ],
};

describe('ResidentRecordsPanel', () => {
  it('renders heading and emits submit when the form is submitted', () => {
    TestBed.configureTestingModule({
      imports: [ResidentRecordsPanel],
      providers: [provideRouter([]), provideAnimations()],
    });
    const fixture = TestBed.createComponent(ResidentRecordsPanel);
    fixture.componentRef.setInput('copy', COPY);
    fixture.componentRef.setInput('recordsForm', makeRecordsForm());
    fixture.componentRef.setInput('recordsSubmitting', false);
    fixture.componentRef.setInput('validationMessage', () => null);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h2')?.textContent).toContain('Records & permits');

    let submitted = 0;
    fixture.componentInstance.submitRecords.subscribe(() => {
      submitted += 1;
    });
    const form = el.querySelector('form');
    form?.dispatchEvent(new Event('submit'));
    expect(submitted).toBe(1);
  });
});
