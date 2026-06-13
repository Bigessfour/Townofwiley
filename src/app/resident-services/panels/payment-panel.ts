import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Ripple } from 'primeng/ripple';

export interface PaymentPanelCopy {
  paymentMeta: string;
  paymentTitle: string;
  paymentBody: string;
  paymentIcon: string;
  phoneFallbackLabel: string;
  emailFallbackLabel: string;
  payBillLinkLabel: string;
}

@Component({
  selector: 'app-resident-payment-panel',
  imports: [ButtonModule, Ripple, RouterLink],
  templateUrl: './payment-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentPaymentPanel {
  readonly copy = input.required<PaymentPanelCopy>();
  readonly townHallPhoneHref = input<string | null>(null);
  readonly townHallPhoneLabel = input<string>('');
  readonly clerkEmailHref = input<string | null>(null);
  readonly clerkEmailLabel = input<string>('');
}
