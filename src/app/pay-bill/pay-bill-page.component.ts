import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { getPaystarRuntimeConfig } from '../payments/paystar-config';
import { resolveQuickPayHref } from '../payments/paystar-quick-pay';
import { SiteLanguageService } from '../site-language';
import { PayInstructionsComponent } from './pay-instructions.component';

@Component({
  selector: 'app-pay-bill-page',
  standalone: true,
  imports: [CardModule, ButtonModule, MessageModule, PayInstructionsComponent],
  templateUrl: './pay-bill-page.component.html',
  styleUrl: './pay-bill-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayBillPageComponent {
  private readonly siteLanguage = inject(SiteLanguageService);

  protected readonly lang = signal<'en' | 'es'>(this.siteLanguage.currentLanguage());

  protected readonly copy = computed(() => {
    const es = this.lang() === 'es';
    return {
      heroTitle: es ? 'Pague su factura de servicios en línea' : 'Pay Your Utility Bill Online',
      heroSubtitle: es
        ? 'Siga los pasos a continuación y pague de forma segura a través del portal Paystar.'
        : 'Follow the steps below to pay securely through the Paystar portal.',
      payRegionLabel: es ? 'Instrucciones y pago en línea' : 'Instructions and online payment',
      ctaHeading: es ? '¿Listo para pagar?' : 'Ready to pay?',
      ctaLead: es
        ? 'Abra el portal seguro de Paystar para pagar su factura de servicios.'
        : 'Open the secure Paystar portal to pay your utility bill.',
      quickPayCta: es ? 'Pague su factura' : 'Pay Your Bill',
      quickPayPlaceholderNote: es
        ? 'El enlace de pago en línea se está finalizando; llame al Ayuntamiento si necesita ayuda.'
        : 'The online payment link is being finalized—call Town Hall if you need help.',
      quickPayUnavailableNote: es
        ? 'El portal de pagos en línea aún no está disponible. Llame al Ayuntamiento o envíe un correo a la secretaria municipal.'
        : 'The online payment portal is not yet active. Call Town Hall or email the town clerk for assistance.',
      quickPayUnavailableLabel: es ? 'Portal no disponible' : 'Portal unavailable',
      helpTitle: es ? '¿Necesita ayuda ahora?' : 'Need help right now?',
      helpBody: es
        ? 'La secretaria municipal puede orientarle sobre saldos, opciones de pago y su cuenta.'
        : 'The town clerk can help with balances, payment options, and your account.',
      helpPhoneLabel: es ? 'Teléfono del Ayuntamiento' : 'Town Hall phone',
      helpEmailLabel: es ? 'Correo de la secretaria' : 'Clerk email',
    };
  });

  protected readonly quickPayState = computed(() => resolveQuickPayHref(getPaystarRuntimeConfig()));

  protected readonly quickPayHref = computed(() => this.quickPayState().href ?? '');

  protected readonly quickPayIsPlaceholder = computed(() => this.quickPayState().isPlaceholder);

  protected readonly quickPayDisabled = computed(() => this.quickPayState().disabled);

  constructor() {
    effect(() => {
      this.lang.set(this.siteLanguage.currentLanguage());
    });
  }
}
