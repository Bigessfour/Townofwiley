import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { Ripple } from 'primeng/ripple';

export type RecordsRequestType = 'records' | 'license' | 'clerk';

export type RecordsFormGroup = FormGroup<{
  requestType: FormControl<RecordsRequestType>;
  details: FormControl<string>;
  deadline: FormControl<string>;
  name: FormControl<string>;
  preferredContact: FormControl<string>;
}>;

export interface RecordsPanelCopy {
  recordsMeta: string;
  recordsTitle: string;
  recordsBody: string;
  recordsIcon: string;
  recordsTypeLabel: string;
  recordsDetailsLabel: string;
  recordsDeadlineLabel: string;
  recordsNameLabel: string;
  recordsContactLabel: string;
  recordsSubmitLabel: string;
  permitsClerkInfoLinkLabel: string;
  businessDirectoryLinkLabel: string;
  phoneFallbackLabel: string;
  emailFallbackLabel: string;
  requestTypes: { value: RecordsRequestType; label: string }[];
}

@Component({
  selector: 'app-resident-records-panel',
  imports: [
    ButtonModule,
    CardModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    Ripple,
    RouterLink,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './records-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentRecordsPanel {
  readonly copy = input.required<RecordsPanelCopy>();
  readonly recordsForm = input.required<RecordsFormGroup>();
  readonly recordsSubmitting = input.required<boolean>();
  readonly townHallPhoneHref = input<string | null>(null);
  readonly townHallPhoneLabel = input<string>('');
  readonly clerkEmailHref = input<string | null>(null);
  readonly clerkEmailLabel = input<string>('');
  readonly validationMessage = input.required<
    (control: AbstractControl, fieldLabel: string) => string | null
  >();

  readonly submitRecords = output<void>();

  protected onSubmit(): void {
    this.submitRecords.emit();
  }
}
