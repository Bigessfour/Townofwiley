import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { startWith } from 'rxjs';
import { PaystarConnectionService } from '../payments/paystar-connection';
import { CmsContact } from '../site-cms-content';
import { SiteLanguage, SiteLanguageService } from '../site-language';

type IssueCategory = 'water' | 'street' | 'streetlight' | 'property' | 'other';
type RequestType = 'records' | 'permit' | 'license' | 'clerk';
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
  paymentAddressLabel: string;
  paymentQuestionLabel: string;
  paymentContactLabel: string;
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
  paymentSubject: string;
  issueSubject: string;
  recordsSubject: string;
  issueCategories: SelectOption<IssueCategory>[];
  requestTypes: SelectOption<RequestType>[];
}

const RESIDENT_SERVICES_COPY: Record<SiteLanguage, ResidentServicesCopy> = {
  en: {
    sectionKicker: 'Resident Services',
    sectionTitle: 'Start the town tasks that still need a human follow-through',
    sectionBody:
      'These guided forms prepare the right email for the clerk or town operations so residents do not have to guess who to contact.',
    taskPickerLabel: 'Choose a resident task',
    taskPickerHelp:
      'Pick the task you need first, then complete only that workflow instead of scanning through every town form.',
    validationMessage:
      'Complete the required fields so the site can prepare the message with the right details.',
    mailClientMessage:
      'Your email app should open with a prepared message. If nothing happens, use the direct phone or email links in this card.',
    phoneFallbackLabel: 'Call Town Hall',
    emailFallbackLabel: 'Email contact',
    paymentMeta: 'Billing help desk',
    paymentTitle: 'Pay utility bill',
    paymentIcon: 'pi pi-credit-card',
    issueIcon: 'pi pi-exclamation-triangle',
    recordsIcon: 'pi pi-file',
    paymentBody:
      'Use the secure Paystar payment path when it is configured below. If you need account help or the payment path is unavailable, send a prepared billing request to Wiley staff.',
    paymentNameLabel: 'Resident name',
    paymentAddressLabel: 'Service address or account identifier',
    paymentQuestionLabel: 'Billing question or amount due',
    paymentContactLabel: 'Best phone or email for follow-up',
    paymentPortalActionLabel: 'Open secure Paystar payment portal',
    paymentPortalLaunchMessage: 'Opening the secure Paystar payment portal.',
    paymentPortalErrorMessage:
      'Secure online payment is unavailable right now. Use the billing help email and Town Hall staff will help you complete your payment.',
    paymentPortalUnavailableMessage:
      'Online utility payment is temporarily unavailable. Use the billing help email for account help and payment instructions.',
    paymentActionLabel: 'Open billing help email',
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
      { value: 'permit', label: 'Permit guidance' },
      { value: 'license', label: 'License or fee question' },
      { value: 'clerk', label: 'Clerk assistance' },
    ],
  },
  es: {
    sectionKicker: 'Servicios para residentes',
    sectionTitle: 'Inicie los tramites del pueblo que todavia requieren seguimiento humano',
    sectionBody:
      'Estos formularios preparan el correo correcto para la secretaria o para operaciones del pueblo para que los residentes no tengan que adivinar a quien escribir.',
    taskPickerLabel: 'Elija un tramite para residentes',
    taskPickerHelp:
      'Primero elija el tramite que necesita y luego complete solo ese flujo en lugar de revisar todos los formularios del pueblo.',
    validationMessage:
      'Complete los campos obligatorios para que el sitio pueda preparar el mensaje con los detalles correctos.',
    mailClientMessage:
      'Su aplicacion de correo debe abrirse con un mensaje preparado. Si no ocurre nada, use los enlaces directos de telefono o correo de esta tarjeta.',
    phoneFallbackLabel: 'Llamar al ayuntamiento',
    emailFallbackLabel: 'Enviar correo',
    paymentMeta: 'Mesa de ayuda de facturacion',
    paymentTitle: 'Pagar recibo de servicios',
    paymentIcon: 'pi pi-credit-card',
    issueIcon: 'pi pi-exclamation-triangle',
    recordsIcon: 'pi pi-file',
    paymentBody:
      'Use la ruta segura de Paystar cuando este configurada abajo. Si necesita ayuda con su cuenta o la ruta de pago no esta disponible, envie una solicitud preparada al personal de Wiley.',
    paymentNameLabel: 'Nombre del residente',
    paymentAddressLabel: 'Direccion del servicio o identificador de cuenta',
    paymentQuestionLabel: 'Pregunta de facturacion o monto adeudado',
    paymentContactLabel: 'Mejor telefono o correo para seguimiento',
    paymentPortalActionLabel: 'Abrir portal seguro de pago Paystar',
    paymentPortalLaunchMessage: 'Abriendo el portal seguro de pago de Paystar.',
    paymentPortalErrorMessage:
      'El pago seguro en linea no esta disponible en este momento. Use el correo de ayuda de facturacion y el personal del ayuntamiento le ayudara a completar su pago.',
    paymentPortalUnavailableMessage:
      'El pago en linea de servicios esta temporalmente no disponible. Use el correo de ayuda de facturacion para recibir instrucciones y apoyo con su cuenta.',
    paymentActionLabel: 'Abrir correo de ayuda de facturacion',
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
      { value: 'permit', label: 'Orientacion sobre permisos' },
      { value: 'license', label: 'Licencia o pregunta de cuota' },
      { value: 'clerk', label: 'Ayuda de secretaria' },
    ],
  },
};

type PaymentFormGroup = FormGroup<{
  name: FormControl<string>;
  serviceAddress: FormControl<string>;
  accountQuestion: FormControl<string>;
  preferredContact: FormControl<string>;
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

@Component({
  selector: 'app-resident-services',
  imports: [ReactiveFormsModule, ButtonModule, CardModule, InputTextModule, SelectModule, TextareaModule],
  templateUrl: './resident-services.html',
  styleUrl: './resident-services.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentServices {
  readonly contacts = input<CmsContact[]>([]);

  private readonly route = inject(ActivatedRoute);
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
    serviceAddress: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    accountQuestion: new FormControl('', { nonNullable: true }),
    preferredContact: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
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
        serviceAddress: values.serviceAddress?.trim() ?? '',
        preferredContact: values.preferredContact?.trim() ?? '',
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
    return this.contacts().find((contact) => contact.id === id) ?? null;
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

    return this.buildMailtoHref(recipient, this.copy().paymentSubject, [
      `${this.copy().paymentNameLabel}: ${values.name}`,
      `${this.copy().paymentAddressLabel}: ${values.serviceAddress}`,
      `${this.copy().paymentContactLabel}: ${values.preferredContact}`,
      `${this.copy().paymentQuestionLabel}: ${values.accountQuestion || '-'}`,
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
