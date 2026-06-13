import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { Ripple } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { startWith } from 'rxjs';
import {
  CmsContact,
  LocalizedCmsContentStore,
  OFFICIAL_CONTACT_ID_CITY_CLERK,
  OFFICIAL_CONTACT_ID_TOWN_INFORMATION,
} from '../site-cms-content';
import { SiteLanguage, SiteLanguageService } from '../site-language';
import { ResidentIssuePanel } from './panels/issue-panel';
import { ResidentPaymentPanel } from './panels/payment-panel';
import { ResidentWeatherPanel } from './panels/weather-panel';

type IssueCategory = 'water' | 'street' | 'streetlight' | 'property' | 'other';
type ServicePanelId = 'payment' | 'issue' | 'weather';

interface SelectOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface ServicePanelOption {
  id: ServicePanelId;
  anchor: string;
  meta: string;
  title: string;
  summary: string;
  icon: string;
}

interface ResidentServicesCopy {
  sectionKicker: string;
  sectionTitle: string;
  sectionBody: string;
  taskPickerLabel: string;
  taskPickerHelp: string;
  validationMessage: string;
  mailClientMessage: string;
  phoneFallbackLabel: string;
  emailFallbackLabel: string;
  paymentMeta: string;
  paymentTitle: string;
  paymentBody: string;
  paymentIcon: string;
  payBillLinkLabel: string;
  issueIcon: string;
  recordsIcon: string;
  weatherMeta: string;
  weatherTitle: string;
  weatherBody: string;
  weatherIcon: string;
  weatherCta: string;
  portalValidationToastSummary: string;
  portalValidationToastDetail: string;
  prepareMailToastSummary: string;
  prepareMailToastDetail: string;
  issueMeta: string;
  issueTitle: string;
  issueBody: string;
  issueCategoryLabel: string;
  issueLocationLabel: string;
  issueDetailsLabel: string;
  issueNameLabel: string;
  issueContactLabel: string;
  issueSubmitLabel: string;
  recordsMeta: string;
  recordsTitle: string;
  recordsBody: string;
  recordsTypeLabel: string;
  recordsDetailsLabel: string;
  recordsDeadlineLabel: string;
  recordsNameLabel: string;
  recordsContactLabel: string;
  recordsSubmitLabel: string;
  utilityBillFormLinkLabel: string;
  clerkInfoLinkLabel: string;
  businessDirectoryLinkLabel: string;
  issueSubject: string;
  issueCategories: SelectOption<IssueCategory>[];
  requiredFieldMessage: string;
  invalidEmailMessage: string;
}

const RESIDENT_SERVICES_COPY: Record<SiteLanguage, ResidentServicesCopy> = {
  en: {
    sectionKicker: 'Resident Services',
    sectionTitle: 'Town services in one place',
    sectionBody:
      'Pay your utility bill, report an issue, and open weather alerts — without hunting for the right office.',
    taskPickerLabel: 'Choose a service',
    taskPickerHelp: 'Select a card below, then complete the matching section.',
    validationMessage:
      'Complete the required fields so the site can prepare the message with the right details.',
    mailClientMessage:
      'Your email app should open with a prepared message. If nothing happens, use the phone or email links in this section.',
    phoneFallbackLabel: 'Call Town Hall',
    emailFallbackLabel: 'Email contact',
    paymentMeta: 'Utilities',
    paymentTitle: 'Pay bill',
    paymentBody:
      'Pay your utility bill online through Paystar, or call Town Hall for billing help.',
    paymentIcon: 'pi pi-credit-card',
    payBillLinkLabel: 'Pay your utility bill',
    issueIcon: 'pi pi-exclamation-triangle',
    recordsIcon: 'pi pi-file',
    weatherMeta: 'Safety',
    weatherTitle: 'Weather alerts',
    weatherBody: 'Local forecast, advisories, and optional severe weather text alerts for Wiley.',
    weatherIcon: 'pi pi-cloud',
    weatherCta: 'Open weather page',
    portalValidationToastSummary: 'Check required fields',
    portalValidationToastDetail: 'Please review the highlighted fields.',
    prepareMailToastSummary: 'Preparing email',
    prepareMailToastDetail: 'Your mail app will open with a draft message.',
    issueMeta: 'Public works',
    issueTitle: 'Report an issue',
    issueBody:
      'Tell public works or town operations about utilities, streets, drainage, signage, nuisances, or streetlights.',
    issueCategoryLabel: 'Issue type',
    issueLocationLabel: 'Location',
    issueDetailsLabel: 'What happened',
    issueNameLabel: 'Your name',
    issueContactLabel: 'Best phone or email for follow-up',
    issueSubmitLabel: 'Send report',
    recordsMeta: 'Clerk',
    recordsTitle: 'Records & clerk assistance',
    recordsBody: 'Request public records, meeting materials, or general clerk assistance.',
    recordsTypeLabel: 'Request type',
    recordsDetailsLabel: 'Details',
    recordsDeadlineLabel: 'Deadline or meeting date',
    recordsNameLabel: 'Resident or business name',
    recordsContactLabel: 'Best phone or email for reply',
    recordsSubmitLabel: 'Send request',
    utilityBillFormLinkLabel: 'Dedicated pay bill page',
    clerkInfoLinkLabel: 'Town Clerk contact',
    businessDirectoryLinkLabel: 'Business directory',
    issueSubject: 'Town issue report',
    issueCategories: [
      { value: 'water', label: 'Water or sewer' },
      { value: 'street', label: 'Street or pothole' },
      { value: 'streetlight', label: 'Streetlight or signage' },
      { value: 'property', label: 'Property or nuisance concern' },
      { value: 'other', label: 'Other town issue' },
    ],
    requiredFieldMessage: 'This field is required.',
    invalidEmailMessage: 'Enter a valid email address.',
  },
  es: {
    sectionKicker: 'Servicios para residentes',
    sectionTitle: 'Servicios del pueblo en un solo lugar',
    sectionBody:
      'Pague su recibo, reporte un problema y abra alertas del clima sin buscar la oficina.',
    taskPickerLabel: 'Elija un servicio',
    taskPickerHelp: 'Seleccione una tarjeta y complete la seccion correspondiente.',
    validationMessage:
      'Complete los campos obligatorios para que el sitio pueda preparar el mensaje con los detalles correctos.',
    mailClientMessage:
      'Su aplicacion de correo debe abrirse con un mensaje preparado. Si no ocurre nada, use los enlaces de telefono o correo en esta seccion.',
    phoneFallbackLabel: 'Llamar al ayuntamiento',
    emailFallbackLabel: 'Enviar correo',
    paymentMeta: 'Servicios publicos',
    paymentTitle: 'Pagar recibo',
    paymentBody:
      'Pague su recibo de servicios en linea con Paystar o llame al Ayuntamiento para ayuda con facturacion.',
    paymentIcon: 'pi pi-credit-card',
    payBillLinkLabel: 'Pague su factura de servicios',
    issueIcon: 'pi pi-exclamation-triangle',
    recordsIcon: 'pi pi-file',
    weatherMeta: 'Seguridad',
    weatherTitle: 'Alertas del tiempo',
    weatherBody: 'Pronostico local, avisos y alertas opcionales por mensaje para Wiley.',
    weatherIcon: 'pi pi-cloud',
    weatherCta: 'Abrir pagina del clima',
    portalValidationToastSummary: 'Revise los campos',
    portalValidationToastDetail: 'Revise los campos marcados.',
    prepareMailToastSummary: 'Preparando correo',
    prepareMailToastDetail: 'Se abrira su aplicacion de correo con un borrador.',
    issueMeta: 'Obras publicas',
    issueTitle: 'Reportar un problema',
    issueBody:
      'Informe a obras publicas sobre servicios, calles, drenaje, senalizacion, molestias o alumbrado.',
    issueCategoryLabel: 'Tipo de problema',
    issueLocationLabel: 'Ubicacion',
    issueDetailsLabel: 'Que ocurrio',
    issueNameLabel: 'Su nombre',
    issueContactLabel: 'Mejor telefono o correo para seguimiento',
    issueSubmitLabel: 'Enviar reporte',
    recordsMeta: 'Secretaria',
    recordsTitle: 'Registros y ayuda de la secretaria',
    recordsBody:
      'Solicite registros publicos, materiales de reunion o ayuda general de la secretaria.',
    recordsTypeLabel: 'Tipo de solicitud',
    recordsDetailsLabel: 'Detalles',
    recordsDeadlineLabel: 'Plazo o fecha de reunion',
    recordsNameLabel: 'Nombre del residente o negocio',
    recordsContactLabel: 'Mejor telefono o correo para responder',
    recordsSubmitLabel: 'Enviar solicitud',
    utilityBillFormLinkLabel: 'Pagina dedicada de pago',
    clerkInfoLinkLabel: 'Contacto de la secretaria',
    businessDirectoryLinkLabel: 'Directorio de negocios',
    issueSubject: 'Reporte de problema del pueblo',
    issueCategories: [
      { value: 'water', label: 'Agua o alcantarillado' },
      { value: 'street', label: 'Calle o bache' },
      { value: 'streetlight', label: 'Alumbrado o senalizacion' },
      { value: 'property', label: 'Propiedad o molestias' },
      { value: 'other', label: 'Otro problema del pueblo' },
    ],
    requiredFieldMessage: 'Este campo es obligatorio.',
    invalidEmailMessage: 'Ingrese un correo electronico valido.',
  },
};

type IssueFormGroup = FormGroup<{
  category: FormControl<IssueCategory>;
  location: FormControl<string>;
  details: FormControl<string>;
  name: FormControl<string>;
  preferredContact: FormControl<string>;
}>;

@Component({
  selector: 'app-resident-services',
  imports: [
    CardModule,
    ToastModule,
    Ripple,
    ResidentIssuePanel,
    ResidentPaymentPanel,
    ResidentWeatherPanel,
  ],
  templateUrl: './resident-services.html',
  styleUrl: './resident-services.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentServices {
  readonly contacts = input<CmsContact[]>([]);

  private readonly route = inject(ActivatedRoute);
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly messages = inject(MessageService);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly routeFragment = toSignal(this.route.fragment, { initialValue: null });

  protected readonly copy = computed(
    () => RESIDENT_SERVICES_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );

  protected readonly activeServicePanel = signal<ServicePanelId>('payment');
  protected readonly issueSubmitting = signal(false);

  private readonly resolvedContacts = computed<CmsContact[]>(() => {
    const providedContacts = this.contacts();
    return providedContacts.length > 0 ? providedContacts : this.cmsStore.contacts();
  });

  protected readonly servicePanels = computed<ServicePanelOption[]>(() => {
    const c = this.copy();
    return [
      {
        id: 'payment',
        anchor: 'payment-help',
        meta: c.paymentMeta,
        title: c.paymentTitle,
        summary: c.paymentBody,
        icon: c.paymentIcon,
      },
      {
        id: 'issue',
        anchor: 'issue-report',
        meta: c.issueMeta,
        title: c.issueTitle,
        summary: c.issueBody,
        icon: c.issueIcon,
      },
      {
        id: 'weather',
        anchor: 'weather-alerts',
        meta: c.weatherMeta,
        title: c.weatherTitle,
        summary: c.weatherBody,
        icon: c.weatherIcon,
      },
    ];
  });

  protected readonly issueForm: IssueFormGroup = new FormGroup({
    category: new FormControl<IssueCategory>('water', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    details: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    preferredContact: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  private readonly issueFormValue = toSignal(
    this.issueForm.valueChanges.pipe(startWith(this.issueForm.getRawValue())),
    { initialValue: this.issueForm.getRawValue() },
  );

  protected readonly townInfoContact = computed(() =>
    this.findContact(OFFICIAL_CONTACT_ID_TOWN_INFORMATION),
  );
  protected readonly clerkContact = computed(() =>
    this.findContact(OFFICIAL_CONTACT_ID_CITY_CLERK),
  );
  protected readonly superintendentContact = computed(() =>
    this.findContact('town-superintendent'),
  );
  protected readonly townHallPhoneHref = computed(() =>
    this.getContactHref(this.townInfoContact(), 'tel:'),
  );
  protected readonly townHallPhoneLabel = computed(
    () => this.townInfoContact()?.value ?? 'Town Hall',
  );
  protected readonly clerkEmailHref = computed(() =>
    this.getContactHref(this.clerkContact(), 'mailto:'),
  );
  protected readonly clerkEmailLabel = computed(
    () => this.clerkContact()?.linkLabel ?? this.clerkContact()?.value ?? 'Town Clerk',
  );
  protected readonly superintendentEmailHref = computed(() =>
    this.getContactHref(this.superintendentContact(), 'mailto:'),
  );
  protected readonly superintendentEmailLabel = computed(
    () =>
      this.superintendentContact()?.linkLabel ??
      this.superintendentContact()?.value ??
      'Town Operations',
  );

  protected readonly issueMailtoHref = computed(() => this.buildIssueMailtoHref());

  /** Stable reference for child panels that need a callable input. */
  protected readonly boundValidationMessage = (
    control: AbstractControl,
    fieldLabel: string,
  ): string | null => this.validationMessage(control, fieldLabel);

  constructor() {
    effect(() => {
      const fragment = this.routeFragment();
      if (fragment === 'issue-report') {
        this.activeServicePanel.set('issue');
      } else if (fragment === 'payment-help') {
        this.activeServicePanel.set('payment');
      } else if (fragment === 'weather-alerts') {
        this.activeServicePanel.set('weather');
      }
    });
  }

  protected selectServicePanel(panelId: ServicePanelId): void {
    this.activeServicePanel.set(panelId);
  }

  protected async submitIssueReport(): Promise<void> {
    const href = this.issueMailtoHref();
    if (!href) {
      this.issueForm.markAllAsTouched();
      this.messages.add({
        key: 'resident-services',
        severity: 'warn',
        summary: this.copy().portalValidationToastSummary,
        detail: this.copy().portalValidationToastDetail,
        life: 6000,
      });
      return;
    }

    this.issueSubmitting.set(true);
    this.messages.add({
      key: 'resident-services',
      severity: 'info',
      summary: this.copy().prepareMailToastSummary,
      detail: this.copy().prepareMailToastDetail,
      life: 4000,
    });

    window.setTimeout(() => {
      window.location.assign(href);
      this.issueSubmitting.set(false);
    }, 400);
  }

  protected validationMessage(control: AbstractControl, fieldLabel: string): string | null {
    if (!control.invalid || !control.touched) {
      return null;
    }

    if (control.hasError('email')) {
      return this.copy().invalidEmailMessage;
    }

    if (control.hasError('required')) {
      return `${fieldLabel}: ${this.copy().requiredFieldMessage}`;
    }

    return this.copy().requiredFieldMessage;
  }

  private findContact(id: string): CmsContact | null {
    return this.resolvedContacts().find((contact) => contact.id === id) ?? null;
  }

  private getContactHref(contact: CmsContact | null, prefix: 'mailto:' | 'tel:'): string | null {
    const href = contact?.href?.trim();

    return href?.startsWith(prefix) ? href : null;
  }

  private getEmailAddress(contact: CmsContact | null): string {
    const href = this.getContactHref(contact, 'mailto:');

    return href ? href.slice('mailto:'.length).trim() : '';
  }

  private buildIssueMailtoHref(): string | null {
    if (this.issueForm.invalid) {
      return null;
    }

    const values = this.issueFormValue();
    const categoryLabel =
      this.copy().issueCategories.find((category) => category.value === values.category)?.label ??
      values.category;
    const recipient =
      this.getEmailAddress(this.superintendentContact()) ||
      this.getEmailAddress(this.townInfoContact());

    return this.buildMailtoHref(recipient, `${this.copy().issueSubject} | ${categoryLabel}`, [
      `${this.copy().issueCategoryLabel}: ${categoryLabel}`,
      `${this.copy().issueLocationLabel}: ${values.location}`,
      `${this.copy().issueDetailsLabel}: ${values.details}`,
      `${this.copy().issueNameLabel}: ${values.name}`,
      `${this.copy().issueContactLabel}: ${values.preferredContact}`,
    ]);
  }

  private buildMailtoHref(recipient: string, subject: string, lines: string[]): string | null {
    if (!recipient) {
      return null;
    }

    const params = new URLSearchParams({
      subject,
      body: lines.join('\n'),
    });

    return `mailto:${recipient}?${params.toString()}`;
  }
}
