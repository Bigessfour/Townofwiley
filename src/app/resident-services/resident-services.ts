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
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { startWith } from 'rxjs';
import { ContactUpdateService } from '../contact-update/contact-update.service';
import { PaystarConnectionService } from '../payments/paystar-connection';
import { CmsContact, LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguage, SiteLanguageService } from '../site-language';

type IssueCategory = 'water' | 'street' | 'streetlight' | 'property' | 'other';
type RequestType = 'records' | 'license' | 'clerk';
type ServicePanelId = 'payment' | 'issue' | 'records';

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
  paymentNameLabel: string;
  paymentStreetAddressLabel: string;
  paymentPoBoxLabel: string;
  paymentPhoneLabel: string;
  paymentEmailLabel: string;
  paymentQuestionLabel: string;
  paymentPortalActionLabel: string;
  paymentPortalLaunchMessage: string;
  paymentPortalErrorMessage: string;
  paymentPortalUnavailableMessage: string;
  paymentActionLabel: string;
  issueMeta: string;
  issueTitle: string;
  issueBody: string;
  issueCategoryLabel: string;
  issueLocationLabel: string;
  issueDetailsLabel: string;
  issueNameLabel: string;
  issueContactLabel: string;
  issueActionLabel: string;
  recordsMeta: string;
  recordsTitle: string;
  recordsBody: string;
  recordsTypeLabel: string;
  recordsDetailsLabel: string;
  recordsDeadlineLabel: string;
  recordsNameLabel: string;
  recordsContactLabel: string;
  recordsActionLabel: string;
  utilityBillFormLinkLabel: string;
  permitsClerkInfoLinkLabel: string;
  businessDirectoryLinkLabel: string;
  paymentSubject: string;
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
    sectionTitle: 'Start common town services online',
    sectionBody:
      'Use these forms to request payment help, report an issue, or contact the clerk without searching for the right office.',
    taskPickerLabel: 'Choose a resident task',
    taskPickerHelp: 'Choose the service you need and complete the matching form below.',
    validationMessage:
      'Complete the required fields so the site can prepare the message with the right details.',
    mailClientMessage:
      'Your email app should open with a prepared message. If nothing happens, use the direct phone or email links in this card.',
    phoneFallbackLabel: 'Call Town Hall',
    emailFallbackLabel: 'Email contact',
    paymentMeta: 'Billing support',
    paymentTitle: 'Pay utility bill',
    paymentIcon: 'pi pi-credit-card',
    issueIcon: 'pi pi-exclamation-triangle',
    recordsIcon: 'pi pi-file',
    paymentBody:
      'Use the secure Paystar payment path when it is configured below. If you need account help or the payment path is unavailable, send a prepared billing request to Wiley staff.',
    paymentNameLabel: 'Resident name',
    paymentStreetAddressLabel: 'Street address',
    paymentPoBoxLabel: 'PO Box (optional)',
    paymentPhoneLabel: 'Phone number',
    paymentEmailLabel: 'Email address',
    paymentQuestionLabel: 'Billing question or amount due',
    paymentPortalActionLabel: 'Open secure Paystar payment portal',
    paymentPortalLaunchMessage: 'Opening the secure Paystar payment portal.',
    paymentPortalErrorMessage:
      'Secure online payment is unavailable right now. Use the billing help email and Town Hall staff will help you complete your payment.',
    paymentPortalUnavailableMessage:
      'Online utility payment is temporarily unavailable. Use the billing help email for account help and payment instructions.',
    paymentActionLabel: 'Email billing support',
    issueMeta: 'Issue reporting',
    issueTitle: 'Report a street or utility issue',
    issueBody:
      'Prepare a resident request for public works or town operations covering utility concerns, potholes, drainage, signage, nuisance issues, and streetlight follow-up.',
    issueCategoryLabel: 'Issue type',
    issueLocationLabel: 'Location',
    issueDetailsLabel: 'What happened',
    issueNameLabel: 'Resident name',
    issueContactLabel: 'Best phone or email for follow-up',
    issueActionLabel: 'Open issue report email',
    recordsMeta: 'Clerk intake',
    recordsTitle: 'Request records, permits, or clerk help',
    recordsBody:
      'Send a structured request for public records, meeting packets, permit guidance, or clerk assistance without starting from a blank email.',
    recordsTypeLabel: 'Request type',
    recordsDetailsLabel: 'Records, permit, or clerk request details',
    recordsDeadlineLabel: 'Requested deadline or meeting date',
    recordsNameLabel: 'Resident or business name',
    recordsContactLabel: 'Best phone or email for reply',
    recordsActionLabel: 'Open records and permit email',
    utilityBillFormLinkLabel: 'Full utility bill payment form',
    permitsClerkInfoLinkLabel: 'Permits: contact the Town Clerk',
    businessDirectoryLinkLabel: 'Community business directory',
    paymentSubject: 'Utility payment help request',
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
    sectionTitle: 'Inicie servicios comunes del pueblo en linea',
    sectionBody:
      'Use estos formularios para solicitar ayuda con pagos, reportar un problema o contactar a la secretaria sin buscar la oficina correcta.',
    taskPickerLabel: 'Elija un tramite para residentes',
    taskPickerHelp:
      'Elija el servicio que necesita y complete el formulario correspondiente abajo.',
    validationMessage:
      'Complete los campos obligatorios para que el sitio pueda preparar el mensaje con los detalles correctos.',
    mailClientMessage:
      'Su aplicacion de correo debe abrirse con un mensaje preparado. Si no ocurre nada, use los enlaces directos de telefono o correo de esta tarjeta.',
    phoneFallbackLabel: 'Llamar al ayuntamiento',
    emailFallbackLabel: 'Enviar correo',
    paymentMeta: 'Soporte de facturacion',
    paymentTitle: 'Pagar recibo de servicios',
    paymentIcon: 'pi pi-credit-card',
    issueIcon: 'pi pi-exclamation-triangle',
    recordsIcon: 'pi pi-file',
    paymentBody:
      'Use la ruta segura de Paystar cuando este configurada abajo. Si necesita ayuda con su cuenta o la ruta de pago no esta disponible, envie una solicitud preparada al personal de Wiley.',
    paymentNameLabel: 'Nombre del residente',
    paymentStreetAddressLabel: 'Direccion de calle',
    paymentPoBoxLabel: 'Apartado postal (opcional)',
    paymentPhoneLabel: 'Numero de telefono',
    paymentEmailLabel: 'Correo electronico',
    paymentQuestionLabel: 'Pregunta de facturacion o monto adeudado',
    paymentPortalActionLabel: 'Abrir portal seguro de pago Paystar',
    paymentPortalLaunchMessage: 'Abriendo el portal seguro de pago de Paystar.',
    paymentPortalErrorMessage:
      'El pago seguro en linea no esta disponible en este momento. Use el correo de ayuda de facturacion y el personal del ayuntamiento le ayudara a completar su pago.',
    paymentPortalUnavailableMessage:
      'El pago en linea de servicios esta temporalmente no disponible. Use el correo de ayuda de facturacion para recibir instrucciones y apoyo con su cuenta.',
    paymentActionLabel: 'Enviar correo a soporte de facturacion',
    issueMeta: 'Reporte de problemas',
    issueTitle: 'Reportar un problema de calle o servicio',
    issueBody:
      'Prepare una solicitud para obras publicas u operaciones del pueblo sobre servicios, baches, drenaje, senalizacion, molestias y seguimiento de alumbrado.',
    issueCategoryLabel: 'Tipo de problema',
    issueLocationLabel: 'Ubicacion',
    issueDetailsLabel: 'Que ocurrio',
    issueNameLabel: 'Nombre del residente',
    issueContactLabel: 'Mejor telefono o correo para seguimiento',
    issueActionLabel: 'Abrir correo de reporte',
    recordsMeta: 'Recepcion de secretaria',
    recordsTitle: 'Solicitar registros, permisos o ayuda de secretaria',
    recordsBody:
      'Envie una solicitud estructurada de registros publicos, paquetes de reuniones, orientacion sobre permisos o ayuda de secretaria sin empezar desde un correo en blanco.',
    recordsTypeLabel: 'Tipo de solicitud',
    recordsDetailsLabel: 'Detalles de registros, permiso o apoyo de secretaria',
    recordsDeadlineLabel: 'Fecha solicitada o fecha de reunion',
    recordsNameLabel: 'Nombre del residente o negocio',
    recordsContactLabel: 'Mejor telefono o correo para responder',
    recordsActionLabel: 'Abrir correo de registros y permisos',
    utilityBillFormLinkLabel: 'Formulario completo de pago de servicios',
    permitsClerkInfoLinkLabel: 'Permisos: contacte al Secretario del Pueblo',
    businessDirectoryLinkLabel: 'Directorio de negocios locales',
    paymentSubject: 'Solicitud de ayuda para pago de servicios',
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
      'Ayude a la secretaria a mantener los registros de residentes actualizados. Todos los campos son opcionales.',
    contactUpdateFullNameLabel: 'Nombre completo',
    contactUpdateServiceAddressLabel: 'Direccion del servicio',
    contactUpdatePoBoxLabel: 'Apartado postal (opcional)',
    contactUpdatePhoneLabel: 'Numero de telefono',
    contactUpdateEmailLabel: 'Correo electronico',
    contactUpdateNotesLabel: 'Notas adicionales (opcional)',
    contactUpdateActionLabel: 'Enviar actualizacion de contacto a la secretaria',
    contactUpdateDismissLabel: 'No gracias, omitir por ahora',
    contactUpdateEmptyMessage:
      'Complete al menos un campo para enviar una actualizacion de contacto.',
    contactUpdateSuccessMessage: 'Informacion de contacto enviada a la secretaria. Gracias.',
    contactUpdateSubject: 'Actualizacion de informacion de contacto del residente',
    requiredFieldMessage: 'Este campo es obligatorio.',
    invalidEmailMessage: 'Ingrese un correo electronico valido.',
  },
};

type PaymentFormGroup = FormGroup<{
  name: FormControl<string>;
  streetAddress: FormControl<string>;
  poBox: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
  accountQuestion: FormControl<string>;
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
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './resident-services.html',
  styleUrl: './resident-services.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentServices {
  readonly contacts = input<CmsContact[]>([]);

  private readonly route = inject(ActivatedRoute);
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly contactUpdateService = inject(ContactUpdateService);
  private readonly paystarConnection = inject(PaystarConnectionService);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly paystarRuntimeConfig = this.paystarConnection.getRuntimeConfig();
  private readonly routeFragment = toSignal(this.route.fragment, { initialValue: null });

  protected readonly copy = computed(
    () => RESIDENT_SERVICES_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );
  protected readonly activeServicePanel = signal<ServicePanelId>('payment');
  protected readonly paymentStatus = signal<string | null>(null);
  protected readonly issueStatus = signal<string | null>(null);
  protected readonly recordsStatus = signal<string | null>(null);
  protected readonly contactUpdateExpanded = signal(false);
  protected readonly contactUpdateStatus = signal<string | null>(null);
  protected readonly hasSubmittedContactUpdate = signal(false);
  private readonly resolvedContacts = computed<CmsContact[]>(() => {
    const providedContacts = this.contacts();
    return providedContacts.length > 0 ? providedContacts : this.cmsStore.contacts();
  });
  protected readonly servicePanels = computed<ServicePanelOption[]>(() => {
    const copy = this.copy();

    return [
      {
        id: 'payment',
        anchor: 'payment-help',
        meta: copy.paymentMeta,
        title: copy.paymentTitle,
        summary: copy.paymentBody,
        icon: copy.paymentIcon,
      },
      {
        id: 'issue',
        anchor: 'issue-report',
        meta: copy.issueMeta,
        title: copy.issueTitle,
        summary: copy.issueBody,
        icon: copy.issueIcon,
      },
      {
        id: 'records',
        anchor: 'records-request',
        meta: copy.recordsMeta,
        title: copy.recordsTitle,
        summary: copy.recordsBody,
        icon: copy.recordsIcon,
      },
    ];
  });

  protected readonly paymentForm: PaymentFormGroup = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    streetAddress: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    poBox: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    accountQuestion: new FormControl('', { nonNullable: true }),
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

  private readonly paymentFormValue = toSignal(
    this.paymentForm.valueChanges.pipe(startWith(this.paymentForm.getRawValue())),
    { initialValue: this.paymentForm.getRawValue() },
  );
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
  protected readonly paymentPortalHref =
    this.paystarRuntimeConfig.mode === 'hosted' && this.paystarRuntimeConfig.portalUrl
      ? this.paystarRuntimeConfig.portalUrl
      : null;
  protected readonly paymentPortalAvailable =
    (this.paystarRuntimeConfig.mode === 'hosted' && !!this.paystarRuntimeConfig.portalUrl) ||
    (this.paystarRuntimeConfig.mode === 'api' && !!this.paystarRuntimeConfig.apiEndpoint);
  protected readonly paymentMailtoHref = computed(() => this.buildPaymentMailtoHref());
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
      }
    });

    this.paymentForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.paymentStatus.set(null);
    });

    this.issueForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.issueStatus.set(null);
    });

    this.recordsForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.recordsStatus.set(null);
    });

    this.contactUpdateForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.contactUpdateStatus.set(null);
    });

    this.checkContactUpdateCookie();
  }

  protected selectServicePanel(panelId: ServicePanelId): void {
    this.activeServicePanel.set(panelId);
  }

  protected openPaymentMailto(event: Event): void {
    this.handleMailtoClick(event, this.paymentForm, this.paymentMailtoHref(), this.paymentStatus);
  }

  protected async openPaystarPortal(event: Event): Promise<void> {
    if (!this.paymentPortalAvailable) {
      event.preventDefault();
      this.paymentStatus.set(this.copy().paymentPortalUnavailableMessage);
      return;
    }

    if (this.paymentPortalHref) {
      this.paymentStatus.set(this.copy().paymentPortalLaunchMessage);
      return;
    }

    event.preventDefault();
    this.paymentStatus.set(this.copy().paymentPortalLaunchMessage);

    try {
      const values = this.paymentFormValue();
      const launch = await this.paystarConnection.createLaunchRequest({
        residentName: values.name?.trim() ?? '',
        serviceAddress: [values.streetAddress?.trim(), values.poBox?.trim()]
          .filter(Boolean)
          .join(', '),
        preferredContact: [values.phone?.trim(), values.email?.trim()].filter(Boolean).join(' / '),
        accountQuestion: values.accountQuestion?.trim() ?? '',
        locale: this.siteLanguageService.currentLanguage(),
        source: 'resident-services',
      });

      if (!launch.launchUrl) {
        this.paymentStatus.set(this.copy().paymentPortalErrorMessage);
        return;
      }

      window.location.assign(launch.launchUrl);
    } catch {
      this.paymentStatus.set(this.copy().paymentPortalErrorMessage);
    }
  }

  protected openIssueMailto(event: Event): void {
    this.handleMailtoClick(event, this.issueForm, this.issueMailtoHref(), this.issueStatus);
  }

  protected openRecordsMailto(event: Event): void {
    this.handleMailtoClick(event, this.recordsForm, this.recordsMailtoHref(), this.recordsStatus);
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

  private handleMailtoClick(
    event: Event,
    form: PaymentFormGroup | IssueFormGroup | RecordsFormGroup,
    href: string | null,
    statusSignal: ReturnType<typeof signal<string | null>>,
  ): void {
    if (!href) {
      event.preventDefault();
      form.markAllAsTouched();
      statusSignal.set(this.copy().validationMessage);
      return;
    }

    statusSignal.set(this.copy().mailClientMessage);
    window.location.assign(href);
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

  private buildPaymentMailtoHref(): string | null {
    if (this.paymentForm.invalid) {
      return null;
    }

    const values = this.paymentFormValue();
    const recipient =
      this.getEmailAddress(this.clerkContact()) || this.getEmailAddress(this.townInfoContact());
    const copy = this.copy();

    return this.buildMailtoHref(recipient, copy.paymentSubject, [
      `${copy.paymentNameLabel}: ${values.name}`,
      `${copy.paymentPhoneLabel}: ${values.phone}`,
      `${copy.paymentEmailLabel}: ${values.email}`,
      `${copy.paymentStreetAddressLabel}: ${values.streetAddress}`,
      `${copy.paymentPoBoxLabel}: ${values.poBox || '-'}`,
      `${copy.paymentQuestionLabel}: ${values.accountQuestion || '-'}`,
    ]);
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
      this.contactUpdateStatus.set(this.copy().contactUpdateSuccessMessage);
      this.contactUpdateForm.reset();
      this.contactUpdateExpanded.set(false);
      this.setContactUpdateCookie();
      this.hasSubmittedContactUpdate.set(true);
    } else {
      this.setContactUpdateCookie();
      this.hasSubmittedContactUpdate.set(true);
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
