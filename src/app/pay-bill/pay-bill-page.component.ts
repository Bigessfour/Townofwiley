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
import { LocalizedCmsContentStore, OFFICIAL_CONTACT_ID_CITY_CLERK } from '../site-cms-content';
import { resolveSiteCopyLabel, siteCopyTelHref } from '../site-copy-overrides';
import { SiteLanguageService } from '../site-language';
import { PayInstructionsComponent } from './pay-instructions.component';

const DEFAULT_TOWN_HALL_PHONE = '(719) 829-4974';
const DEFAULT_CLERK_EMAIL = 'clerk@townofwiley.gov';

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
  private readonly cmsStore = inject(LocalizedCmsContentStore);

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

  protected readonly townHallPhone = computed(() => {
    const lang = this.lang();
    return resolveSiteCopyLabel(
      (key) => this.cmsStore.getSiteCopy(key),
      lang,
      'contactTownHallPhone',
      DEFAULT_TOWN_HALL_PHONE,
    );
  });

  protected readonly townHallPhoneHref = computed(() =>
    siteCopyTelHref(this.townHallPhone(), DEFAULT_TOWN_HALL_PHONE),
  );

  protected readonly clerkContact = computed(() =>
    this.cmsStore.contacts().find((contact) => contact.id === OFFICIAL_CONTACT_ID_CITY_CLERK),
  );

  protected readonly clerkEmailLabel = computed(() => {
    const contact = this.clerkContact();
    const labeled = contact?.linkLabel?.trim();
    if (labeled) {
      return labeled;
    }
    const href = contact?.href?.trim() ?? '';
    if (href.toLowerCase().startsWith('mailto:')) {
      return href.slice('mailto:'.length).trim() || DEFAULT_CLERK_EMAIL;
    }
    return DEFAULT_CLERK_EMAIL;
  });

  protected readonly clerkEmailHref = computed(
    () => this.clerkContact()?.href?.trim() || `mailto:${DEFAULT_CLERK_EMAIL}`,
  );

  constructor() {
    effect(() => {
      this.lang.set(this.siteLanguage.currentLanguage());
    });
  }
}
