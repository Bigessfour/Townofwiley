import { ViewportScroller } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { Ripple } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { startWith } from 'rxjs';
import { ContactUpdateService } from '../contact-update/contact-update.service';
import { BillPayService } from '../pay-bill/bill-pay.service';
import {
  PAY_BILL_QUICK_PAY_PORTAL_PLACEHOLDER_URL,
  type PreferredBillPayContact,
} from '../pay-bill/pay-bill-request';
import { getPaystarRuntimeConfig } from '../payments/paystar-config';
import { CmsContact, LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguage, SiteLanguageService } from '../site-language';

/** Allows digits, spaces, and common phone punctuation; min length enforced separately. */
const PHONE_INPUT_PATTERN = /^[\d\s\-+().]{10,40}$/;

type IssueCategory = 'water' | 'street' | 'streetlight' | 'property' | 'other';
type RequestType = 'records' | 'license' | 'clerk';
type ServicePanelId = 'payment' | 'issue' | 'records' | 'weather';

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
  issueIcon: string;
  recordsIcon: string;
  weatherMeta: string;
  weatherTitle: string;
  weatherBody: string;
  weatherIcon: string;
  weatherCta: string;
  payNowCardTitle: string;
  payNowCardBody: string;
  payNowCta: string;
  payNowPlaceholderNote: string;
  portalSoonTitle: string;
  portalSoonBody: string;
  portalSoonBadge: string;
  requestEarlyAccessCta: string;
  portalFormTitle: string;
  portalFormIntro: string;
  fullNameLabel: string;
  serviceAddressLabel: string;
  accountNumberLabel: string;
  emailLabel: string;
  phoneLabel: string;
  preferredContactLabel: string;
  notesLabel: string;
  consentLabel: string;
  submitPortalLabel: string;
  submittingPortalLabel: string;
  portalSuccessToastSummary: string;
  portalSuccessToastDetail: string;
  portalErrorToastSummary: string;
  portalErrorToastDetail: string;
  portalMailtoToastSummary: string;
  portalMailtoToastDetail: string;
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
  permitsClerkInfoLinkLabel: string;
  businessDirectoryLinkLabel: string;
  issueSubject: string;
  recordsSubject: string;
  issueCategories: SelectOption<IssueCategory>[];
  requestTypes: SelectOption<RequestType>[];
  contactUpdateToggleLabel: string;
  contactUpdateBody: string;
  contactUpdateFullNameLabel: string;
  contactUpdateServiceAddressLabel: string;
  contactUpdatePoBoxLabel: string;
  contactUpdatePhoneLabel: string;
  contactUpdateEmailLabel: string;
  contactUpdateNotesLabel: string;
  contactUpdateActionLabel: string;
  contactUpdateDismissLabel: string;
  contactUpdateEmptyMessage: string;
  contactUpdateSuccessMessage: string;
  contactUpdateSubject: string;
  requiredFieldMessage: string;
  invalidEmailMessage: string;
}

const RESIDENT_SERVICES_COPY: Record<SiteLanguage, ResidentServicesCopy> = {
  en: {
    sectionKicker: 'Resident Services',
    sectionTitle: 'Town services in one place',
    sectionBody:
      'Pay your utility bill, report an issue, request records or clerk help, and open weather alerts — without hunting for the right office.',
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
      'Pay online with Paystar, or ask for billing help and early access to the full portal.',
    paymentIcon: 'pi pi-credit-card',
    issueIcon: 'pi pi-exclamation-triangle',
    recordsIcon: 'pi pi-file',
    weatherMeta: 'Safety',
    weatherTitle: 'Weather alerts',
    weatherBody: 'Local forecast, advisories, and optional severe weather text alerts for Wiley.',
    weatherIcon: 'pi pi-cloud',
    weatherCta: 'Open weather page',
    payNowCardTitle: 'Pay now with Paystar',
    payNowCardBody:
      'Pay your utility bill through the hosted Paystar portal when it is active for this site.',
    payNowCta: 'Pay now with Paystar',
    payNowPlaceholderNote:
      'When runtime billing data is connected, this link will point to your live Paystar checkout.',
    portalSoonTitle: 'Full online account portal',
    portalSoonBody:
      'Account history, autopay, and usage will appear here after billing data is connected.',
    portalSoonBadge: 'Coming soon',
    requestEarlyAccessCta: 'Request early access',
    portalFormTitle: 'Billing help & portal early access',
    portalFormIntro:
      'Send your details to the clerk for billing questions, payment options, or to be notified when the full portal launches.',
    fullNameLabel: 'Full name',
    serviceAddressLabel: 'Service address',
    accountNumberLabel: 'Utility account number (optional)',
    emailLabel: 'Email',
    phoneLabel: 'Phone',
    preferredContactLabel: 'Preferred contact method',
    notesLabel: 'Additional questions or details (optional)',
    consentLabel:
      'I agree that the Town of Wiley may contact me about billing, payment options, and portal access.',
    submitPortalLabel: 'Submit request',
    submittingPortalLabel: 'Sending…',
    portalSuccessToastSummary: 'Request received',
    portalSuccessToastDetail: 'Thank you. The town clerk will follow up within 1–2 business days.',
    portalErrorToastSummary: 'Could not send',
    portalErrorToastDetail: 'Please try again or use the phone or email below.',
    portalMailtoToastSummary: 'Opening your mail app',
    portalMailtoToastDetail: 'Complete the message to send your request to the clerk.',
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
    recordsTitle: 'Records & permits',
    recordsBody:
      'Request public records, meeting materials, permit guidance, or general clerk assistance.',
    recordsTypeLabel: 'Request type',
    recordsDetailsLabel: 'Details',
    recordsDeadlineLabel: 'Deadline or meeting date',
    recordsNameLabel: 'Resident or business name',
    recordsContactLabel: 'Best phone or email for reply',
    recordsSubmitLabel: 'Send request',
    utilityBillFormLinkLabel: 'Dedicated pay bill page',
    permitsClerkInfoLinkLabel: 'Permits: Town Clerk',
    businessDirectoryLinkLabel: 'Business directory',
    issueSubject: 'Town issue report',
    recordsSubject: 'Records or permit request',
    issueCategories: [
      { value: 'water', label: 'Water or sewer' },
      { value: 'street', label: 'Street or pothole' },
      { value: 'streetlight', label: 'Streetlight or signage' },
      { value: 'property', label: 'Property or nuisance concern' },
      { value: 'other', label: 'Other town issue' },
    ],
    requestTypes: [
      { value: 'records', label: 'Public records / FOIA' },
      { value: 'license', label: 'License or fee question' },
      { value: 'clerk', label: 'Clerk assistance' },
    ],
    contactUpdateToggleLabel: 'Update contact info with Clerk (optional)',
    contactUpdateBody:
      'Help the Clerk keep resident records accurate. All fields are optional — skip this step if you prefer.',
    contactUpdateFullNameLabel: 'Full name',
    contactUpdateServiceAddressLabel: 'Service address',
    contactUpdatePoBoxLabel: 'PO Box (optional)',
    contactUpdatePhoneLabel: 'Phone number',
    contactUpdateEmailLabel: 'Email address',
    contactUpdateNotesLabel: 'Additional notes (optional)',
    contactUpdateActionLabel: 'Send contact update to Clerk',
    contactUpdateDismissLabel: 'No thanks, skip for now',
    contactUpdateEmptyMessage: 'Fill in at least one field to send a contact update.',
    contactUpdateSuccessMessage: 'Contact info sent to the Clerk. Thank you!',
    contactUpdateSubject: 'Resident contact information update',
    requiredFieldMessage: 'This field is required.',
    invalidEmailMessage: 'Enter a valid email address.',
  },
  es: {
    sectionKicker: 'Servicios para residentes',
    sectionTitle: 'Servicios del pueblo en un solo lugar',
    sectionBody:
      'Pague su recibo, reporte un problema, solicite registros o ayuda de secretaria, y abra alertas del clima sin buscar la oficina.',
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
      'Pague en linea con Paystar o solicite ayuda de facturacion y acceso anticipado al portal completo.',
    paymentIcon: 'pi pi-credit-card',
    issueIcon: 'pi pi-exclamation-triangle',
    recordsIcon: 'pi pi-file',
    weatherMeta: 'Seguridad',
    weatherTitle: 'Alertas del tiempo',
    weatherBody: 'Pronostico local, avisos y alertas opcionales por mensaje para Wiley.',
    weatherIcon: 'pi pi-cloud',
    weatherCta: 'Abrir pagina del clima',
    payNowCardTitle: 'Pagar ahora con Paystar',
    payNowCardBody:
      'Pague su recibo de servicios a traves del portal alojado de Paystar cuando este activo.',
    payNowCta: 'Pagar ahora con Paystar',
    payNowPlaceholderNote:
      'Cuando se conecten los datos de facturacion, este enlace apuntara al checkout en vivo.',
    portalSoonTitle: 'Portal de cuenta en linea',
    portalSoonBody:
      'Historial de cuenta, pago automatico y uso apareceran aqui cuando se conecten los datos.',
    portalSoonBadge: 'Proximamente',
    requestEarlyAccessCta: 'Solicitar acceso anticipado',
    portalFormTitle: 'Ayuda de facturacion y acceso al portal',
    portalFormIntro:
      'Envie sus datos a la secretaria para preguntas de facturacion, opciones de pago o aviso cuando el portal este listo.',
    fullNameLabel: 'Nombre completo',
    serviceAddressLabel: 'Direccion del servicio',
    accountNumberLabel: 'Numero de cuenta de servicios (opcional)',
    emailLabel: 'Correo electronico',
    phoneLabel: 'Telefono',
    preferredContactLabel: 'Metodo de contacto preferido',
    notesLabel: 'Preguntas o detalles adicionales (opcional)',
    consentLabel:
      'Acepto que el Ayuntamiento de Wiley me contacte sobre facturacion, opciones de pago y acceso al portal.',
    submitPortalLabel: 'Enviar solicitud',
    submittingPortalLabel: 'Enviando…',
    portalSuccessToastSummary: 'Solicitud recibida',
    portalSuccessToastDetail: 'Gracias. La secretaria dara seguimiento en 1 a 2 dias habiles.',
    portalErrorToastSummary: 'No se pudo enviar',
    portalErrorToastDetail: 'Inténtelo de nuevo o use el telefono o correo abajo.',
    portalMailtoToastSummary: 'Abriendo su correo',
    portalMailtoToastDetail: 'Complete el mensaje para enviar la solicitud a la secretaria.',
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
    recordsTitle: 'Registros y permisos',
    recordsBody:
      'Solicite registros publicos, materiales de reunion, orientacion sobre permisos o ayuda general.',
    recordsTypeLabel: 'Tipo de solicitud',
    recordsDetailsLabel: 'Detalles',
    recordsDeadlineLabel: 'Plazo o fecha de reunion',
    recordsNameLabel: 'Nombre del residente o negocio',
    recordsContactLabel: 'Mejor telefono o correo para responder',
    recordsSubmitLabel: 'Enviar solicitud',
    utilityBillFormLinkLabel: 'Pagina dedicada de pago',
    permitsClerkInfoLinkLabel: 'Permisos: secretaria municipal',
    businessDirectoryLinkLabel: 'Directorio de negocios',
    issueSubject: 'Reporte de problema del pueblo',
    recordsSubject: 'Solicitud de registros o permiso',
    issueCategories: [
      { value: 'water', label: 'Agua o alcantarillado' },
      { value: 'street', label: 'Calle o bache' },
      { value: 'streetlight', label: 'Alumbrado o senalizacion' },
      { value: 'property', label: 'Propiedad o molestias' },
      { value: 'other', label: 'Otro problema del pueblo' },
    ],
    requestTypes: [
      { value: 'records', label: 'Registros publicos / FOIA' },
      { value: 'license', label: 'Licencia o pregunta de cuota' },
      { value: 'clerk', label: 'Ayuda de secretaria' },
    ],
    contactUpdateToggleLabel: 'Actualizar informacion de contacto con la secretaria (opcional)',
    contactUpdateBody:
      'Ayude a la secretaria a mantener los registros actualizados. Todos los campos son opcionales.',
    contactUpdateFullNameLabel: 'Nombre completo',
    contactUpdateServiceAddressLabel: 'Direccion del servicio',
    contactUpdatePoBoxLabel: 'Apartado postal (opcional)',
    contactUpdatePhoneLabel: 'Numero de telefono',
    contactUpdateEmailLabel: 'Correo electronico',
    contactUpdateNotesLabel: 'Notas adicionales (opcional)',
    contactUpdateActionLabel: 'Enviar actualizacion de contacto',
    contactUpdateDismissLabel: 'No gracias, omitir por ahora',
    contactUpdateEmptyMessage:
      'Complete al menos un campo para enviar una actualizacion de contacto.',
    contactUpdateSuccessMessage: 'Informacion enviada a la secretaria. Gracias.',
    contactUpdateSubject: 'Actualizacion de informacion de contacto del residente',
    requiredFieldMessage: 'Este campo es obligatorio.',
    invalidEmailMessage: 'Ingrese un correo electronico valido.',
  },
};

type PortalAccessFormGroup = FormGroup<{
  fullName: FormControl<string>;
  serviceAddress: FormControl<string>;
  accountNumber: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  preferredContactMethod: FormControl<PreferredBillPayContact | null>;
  notes: FormControl<string>;
  consentToContact: FormControl<boolean>;
}>;

type IssueFormGroup = FormGroup<{
  category: FormControl<IssueCategory>;
  location: FormControl<string>;
  details: FormControl<string>;
  name: FormControl<string>;
  preferredContact: FormControl<string>;
}>;

type RecordsFormGroup = FormGroup<{
  requestType: FormControl<RequestType>;
  details: FormControl<string>;
  deadline: FormControl<string>;
  name: FormControl<string>;
  preferredContact: FormControl<string>;
}>;

type ContactUpdateFormGroup = FormGroup<{
  fullName: FormControl<string>;
  serviceAddress: FormControl<string>;
  poBox: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
  notes: FormControl<string>;
}>;

@Component({
  selector: 'app-resident-services',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
    CheckboxModule,
    ToastModule,
    TagModule,
    Ripple,
  ],
  templateUrl: './resident-services.html',
  styleUrl: './resident-services.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentServices {
  readonly contacts = input<CmsContact[]>([]);

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly viewportScroller = inject(ViewportScroller);
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly contactUpdateService = inject(ContactUpdateService);
  private readonly billPayService = inject(BillPayService);
  private readonly messages = inject(MessageService);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly routeFragment = toSignal(this.route.fragment, { initialValue: null });

  protected readonly copy = computed(
    () => RESIDENT_SERVICES_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );

  protected readonly lang = computed(() => this.siteLanguageService.currentLanguage());

  protected readonly activeServicePanel = signal<ServicePanelId>('payment');
  protected readonly portalSubmitting = signal(false);
  protected readonly issueSubmitting = signal(false);
  protected readonly recordsSubmitting = signal(false);
  protected readonly contactUpdateExpanded = signal(false);
  protected readonly contactUpdateStatus = signal<string | null>(null);
  protected readonly hasSubmittedContactUpdate = signal(false);

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
        id: 'records',
        anchor: 'records-request',
        meta: c.recordsMeta,
        title: c.recordsTitle,
        summary: c.recordsBody,
        icon: c.recordsIcon,
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

  protected readonly portalAccessForm: PortalAccessFormGroup = this.fb.group({
    fullName: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    serviceAddress: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    accountNumber: this.fb.nonNullable.control('', {
      validators: [Validators.pattern(/^[A-Za-z0-9-]*$/)],
    }),
    email: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.email],
    }),
    phone: this.fb.nonNullable.control('', {
      validators: [
        Validators.required,
        Validators.minLength(10),
        Validators.pattern(PHONE_INPUT_PATTERN),
      ],
    }),
    preferredContactMethod: this.fb.control<PreferredBillPayContact | null>(null, {
      validators: [Validators.required],
    }),
    notes: this.fb.nonNullable.control(''),
    consentToContact: this.fb.nonNullable.control(false, {
      validators: [Validators.requiredTrue],
    }),
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

  protected readonly recordsForm: RecordsFormGroup = new FormGroup({
    requestType: new FormControl<RequestType>('records', { nonNullable: true }),
    details: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    deadline: new FormControl('', { nonNullable: true }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    preferredContact: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected readonly contactUpdateForm: ContactUpdateFormGroup = new FormGroup({
    fullName: new FormControl('', { nonNullable: true }),
    serviceAddress: new FormControl('', { nonNullable: true }),
    poBox: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  private readonly issueFormValue = toSignal(
    this.issueForm.valueChanges.pipe(startWith(this.issueForm.getRawValue())),
    { initialValue: this.issueForm.getRawValue() },
  );
  private readonly recordsFormValue = toSignal(
    this.recordsForm.valueChanges.pipe(startWith(this.recordsForm.getRawValue())),
    { initialValue: this.recordsForm.getRawValue() },
  );
  private readonly contactUpdateFormValue = toSignal(
    this.contactUpdateForm.valueChanges.pipe(startWith(this.contactUpdateForm.getRawValue())),
    { initialValue: this.contactUpdateForm.getRawValue() },
  );

  protected readonly preferredContactOptions = computed(() =>
    this.lang() === 'es'
      ? [
          { label: 'Correo electrónico', value: 'email' as const },
          { label: 'Llamada telefónica', value: 'phone' as const },
          { label: 'Mensaje de texto (SMS)', value: 'sms' as const },
          { label: 'Correo postal', value: 'mail' as const },
        ]
      : [
          { label: 'Email', value: 'email' as const },
          { label: 'Phone call', value: 'phone' as const },
          { label: 'Text message (SMS)', value: 'sms' as const },
          { label: 'U.S. Mail', value: 'mail' as const },
        ],
  );

  protected readonly quickPayHref = computed(() => {
    const url = getPaystarRuntimeConfig().portalUrl.trim();
    return url || PAY_BILL_QUICK_PAY_PORTAL_PLACEHOLDER_URL;
  });

  /** True when using the placeholder Paystar URL until runtime config supplies the live portal. */
  protected readonly quickPayIsPlaceholder = computed(
    () => !getPaystarRuntimeConfig().portalUrl.trim(),
  );

  protected readonly townInfoContact = computed(() => this.findContact('town-information'));
  protected readonly clerkContact = computed(() => this.findContact('city-clerk'));
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
  protected readonly recordsMailtoHref = computed(() => this.buildRecordsMailtoHref());
  protected readonly contactUpdateMailtoHref = computed(() => this.buildContactUpdateMailtoHref());

  constructor() {
    effect(() => {
      const fragment = this.routeFragment();
      if (fragment === 'issue-report') {
        this.activeServicePanel.set('issue');
      } else if (fragment === 'records-request') {
        this.activeServicePanel.set('records');
      } else if (fragment === 'payment-help') {
        this.activeServicePanel.set('payment');
      } else if (fragment === 'weather-alerts') {
        this.activeServicePanel.set('weather');
      }
    });

    this.contactUpdateForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.contactUpdateStatus.set(null);
    });

    this.checkContactUpdateCookie();
  }

  protected selectServicePanel(panelId: ServicePanelId): void {
    this.activeServicePanel.set(panelId);
  }

  /** Scroll target `id="billing-intake"` — matches resident-services modernization plan. */
  protected scrollToBillingIntake(): void {
    this.viewportScroller.scrollToAnchor('billing-intake');
    document.getElementById('billing-intake')?.focus();
  }

  protected portalFieldMessage(
    controlName: keyof PortalAccessFormGroup['controls'],
  ): string | null {
    const control = this.portalAccessForm.controls[controlName];
    if (!control.invalid || !control.touched) {
      return null;
    }
    const es = this.lang() === 'es';
    if (controlName === 'phone') {
      if (control.hasError('required')) {
        return es ? 'Campo obligatorio' : 'This field is required';
      }
      if (control.hasError('minlength')) {
        return es
          ? 'El teléfono es demasiado corto (mínimo 10 caracteres).'
          : 'Phone number is too short (at least 10 characters).';
      }
      if (control.hasError('pattern')) {
        return es
          ? 'Use solo números y símbolos de teléfono habituales.'
          : 'Use digits and common phone characters only.';
      }
    }
    if (control.hasError('required')) {
      return es ? 'Campo obligatorio' : 'This field is required';
    }
    if (control.hasError('requiredTrue')) {
      return es ? 'Debe aceptar para continuar' : 'Consent is required to continue';
    }
    if (control.hasError('email')) {
      return es ? 'Correo no válido' : 'Invalid email';
    }
    if (control.hasError('pattern')) {
      return es ? 'Solo letras, números o guiones.' : 'Use only letters, numbers, or hyphens.';
    }
    return this.copy().portalValidationToastDetail;
  }

  async onPortalAccessSubmit(): Promise<void> {
    if (this.portalAccessForm.invalid) {
      this.portalAccessForm.markAllAsTouched();
      this.messages.add({
        key: 'resident-services',
        severity: 'warn',
        summary: this.copy().portalValidationToastSummary,
        detail: this.copy().portalValidationToastDetail,
        life: 6000,
      });
      return;
    }

    this.portalSubmitting.set(true);
    const raw = this.portalAccessForm.getRawValue();
    const locale = this.siteLanguageService.currentLanguage();

    try {
      const result = await this.billPayService.submitRequest({
        fullName: raw.fullName,
        serviceAddress: raw.serviceAddress,
        accountNumber: raw.accountNumber,
        email: raw.email,
        phone: raw.phone,
        preferredContactMethod: raw.preferredContactMethod!,
        notes: raw.notes,
        consentToContact: raw.consentToContact,
        locale,
        source: 'resident-services',
      });

      if (result.outcome === 'api-success') {
        this.messages.add({
          key: 'resident-services',
          severity: 'success',
          summary: this.copy().portalSuccessToastSummary,
          detail: this.copy().portalSuccessToastDetail,
          life: 8000,
        });
        this.portalAccessForm.reset();
        this.portalAccessForm.patchValue({ consentToContact: false });
        return;
      }

      this.messages.add({
        key: 'resident-services',
        severity: 'info',
        summary: this.copy().portalMailtoToastSummary,
        detail: this.copy().portalMailtoToastDetail,
        life: 5000,
      });
      if (typeof window !== 'undefined') {
        window.setTimeout(() => window.location.assign(result.href), 400);
      }
    } catch {
      this.messages.add({
        key: 'resident-services',
        severity: 'error',
        summary: this.copy().portalErrorToastSummary,
        detail: this.copy().portalErrorToastDetail,
        life: 8000,
      });
    } finally {
      this.portalSubmitting.set(false);
    }
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

  protected async submitRecordsRequest(): Promise<void> {
    const href = this.recordsMailtoHref();
    if (!href) {
      this.recordsForm.markAllAsTouched();
      this.messages.add({
        key: 'resident-services',
        severity: 'warn',
        summary: this.copy().portalValidationToastSummary,
        detail: this.copy().portalValidationToastDetail,
        life: 6000,
      });
      return;
    }

    this.recordsSubmitting.set(true);
    this.messages.add({
      key: 'resident-services',
      severity: 'info',
      summary: this.copy().prepareMailToastSummary,
      detail: this.copy().prepareMailToastDetail,
      life: 4000,
    });

    window.setTimeout(() => {
      window.location.assign(href);
      this.recordsSubmitting.set(false);
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

  private buildRecordsMailtoHref(): string | null {
    if (this.recordsForm.invalid) {
      return null;
    }

    const values = this.recordsFormValue();
    const requestTypeLabel =
      this.copy().requestTypes.find((requestType) => requestType.value === values.requestType)
        ?.label ?? values.requestType;
    const recipient =
      this.getEmailAddress(this.clerkContact()) || this.getEmailAddress(this.townInfoContact());

    return this.buildMailtoHref(recipient, `${this.copy().recordsSubject} | ${requestTypeLabel}`, [
      `${this.copy().recordsTypeLabel}: ${requestTypeLabel}`,
      `${this.copy().recordsNameLabel}: ${values.name}`,
      `${this.copy().recordsContactLabel}: ${values.preferredContact}`,
      `${this.copy().recordsDeadlineLabel}: ${values.deadline || '-'}`,
      `${this.copy().recordsDetailsLabel}: ${values.details}`,
    ]);
  }

  protected dismissContactUpdate(): void {
    this.setContactUpdateCookie();
    this.hasSubmittedContactUpdate.set(true);
  }

  protected toggleContactUpdate(): void {
    this.contactUpdateExpanded.update((v) => !v);
    this.contactUpdateStatus.set(null);
  }

  protected async openContactUpdateMailto(event: Event): Promise<void> {
    event.preventDefault();
    const href = this.contactUpdateMailtoHref();

    if (!href) {
      this.messages.add({
        key: 'resident-services',
        severity: 'warn',
        summary: this.copy().portalValidationToastSummary,
        detail: this.copy().contactUpdateEmptyMessage,
        life: 6000,
      });
      this.contactUpdateStatus.set(this.copy().contactUpdateEmptyMessage);
      return;
    }

    this.contactUpdateStatus.set(null);
    const values = this.contactUpdateFormValue();
    const result = await this.contactUpdateService.submitUpdate(
      {
        fullName: values.fullName ?? '',
        serviceAddress: values.serviceAddress ?? '',
        poBox: values.poBox ?? '',
        phone: values.phone ?? '',
        email: values.email ?? '',
        notes: values.notes ?? '',
        locale: this.siteLanguageService.currentLanguage(),
        source: 'payment-panel',
      },
      href,
    );

    if (result.outcome === 'api-success') {
      this.messages.add({
        key: 'resident-services',
        severity: 'success',
        summary: this.copy().contactUpdateSuccessMessage,
        detail: '',
        life: 6000,
      });
      this.contactUpdateStatus.set(this.copy().contactUpdateSuccessMessage);
      this.contactUpdateForm.reset();
      this.contactUpdateExpanded.set(false);
      this.setContactUpdateCookie();
      this.hasSubmittedContactUpdate.set(true);
    } else {
      this.setContactUpdateCookie();
      this.hasSubmittedContactUpdate.set(true);
      this.messages.add({
        key: 'resident-services',
        severity: 'info',
        summary: this.copy().prepareMailToastSummary,
        detail: this.copy().mailClientMessage,
        life: 5000,
      });
      this.contactUpdateStatus.set(this.copy().mailClientMessage);
      window.location.assign(result.href);
    }
  }

  private checkContactUpdateCookie(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const hasCookie = document.cookie
      .split('; ')
      .some((row) => row.startsWith('wiley_contact_updated='));

    if (hasCookie) {
      this.hasSubmittedContactUpdate.set(true);
    }
  }

  private setContactUpdateCookie(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `wiley_contact_updated=true; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure`;
  }

  private buildContactUpdateMailtoHref(): string | null {
    const values = this.contactUpdateFormValue();
    const recipient =
      this.getEmailAddress(this.clerkContact()) || this.getEmailAddress(this.townInfoContact());
    const copy = this.copy();
    const lines: string[] = [];

    if (values.fullName) lines.push(`${copy.contactUpdateFullNameLabel}: ${values.fullName}`);
    if (values.serviceAddress)
      lines.push(`${copy.contactUpdateServiceAddressLabel}: ${values.serviceAddress}`);
    if (values.poBox) lines.push(`${copy.contactUpdatePoBoxLabel}: ${values.poBox}`);
    if (values.phone) lines.push(`${copy.contactUpdatePhoneLabel}: ${values.phone}`);
    if (values.email) lines.push(`${copy.contactUpdateEmailLabel}: ${values.email}`);
    if (values.notes) lines.push(`${copy.contactUpdateNotesLabel}: ${values.notes}`);

    if (lines.length === 0) {
      return null;
    }

    return this.buildMailtoHref(recipient, copy.contactUpdateSubject, lines);
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
