import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { startWith } from 'rxjs';
import { CmsContact } from '../site-cms-content';
import { SiteLanguage, SiteLanguageService } from '../site-language';

type AccessibilityStatusTone = 'error' | 'info';

interface AccessibilitySupportCopy {
  statementKicker: string;
  statementTitle: string;
  statementBody: string;
  statementCommitments: string[];
  reportKicker: string;
  reportTitle: string;
  reportBody: string;
  nameLabel: string;
  contactLabel: string;
  pageLabel: string;
  detailsLabel: string;
  actionLabel: string;
  validationMessage: string;
  mailClientMessage: string;
  phoneFallbackLabel: string;
  emailFallbackLabel: string;
  reportSubject: string;
}

const ACCESSIBILITY_SUPPORT_COPY: Record<SiteLanguage, AccessibilitySupportCopy> = {
  en: {
    statementKicker: 'Accessibility Statement',
    statementTitle: 'The Town of Wiley aims to keep core public information accessible',
    statementBody:
      'The town website is intended to support WCAG 2.1 AA expectations for navigation, readable contrast, accessible documents, and consistent public-service access on desktop and mobile devices.',
    statementCommitments: [
      'Keep keyboard navigation, focus states, and skip links working on public pages.',
      'Publish readable text, accessible documents, and clear contact paths for resident services.',
      'Respond to reported barriers by routing them to town staff for follow-up.',
    ],
    reportKicker: 'Barrier Report',
    reportTitle: 'Report an accessibility barrier',
    reportBody:
      'Use this form to prepare an accessibility report for the Town of Wiley if a page, document, image, or service workflow is difficult to use.',
    nameLabel: 'Your name',
    contactLabel: 'Best phone or email for follow-up',
    pageLabel: 'Page, document, or service with the barrier',
    detailsLabel: 'Describe the barrier',
    actionLabel: 'Open accessibility report email',
    validationMessage:
      'Complete the contact, page, and barrier details so the site can prepare the report.',
    mailClientMessage:
      'Your email app should open with a prepared accessibility report. If nothing happens, use the direct phone or email links below.',
    phoneFallbackLabel: 'Call Town Hall',
    emailFallbackLabel: 'Email the Clerk',
    reportSubject: 'Accessibility barrier report',
  },
  es: {
    statementKicker: 'Declaracion de accesibilidad',
    statementTitle: 'El Pueblo de Wiley busca mantener accesible la informacion publica esencial',
    statementBody:
      'El sitio del pueblo busca cumplir con expectativas de WCAG 2.1 AA para navegacion, contraste legible, documentos accesibles y acceso constante a los servicios publicos desde computadoras y telefonos.',
    statementCommitments: [
      'Mantener la navegacion por teclado, los estados de foco y los enlaces para saltar contenido en las paginas publicas.',
      'Publicar texto legible, documentos accesibles y rutas claras de contacto para los servicios a residentes.',
      'Responder a las barreras reportadas canalizandolas al personal del pueblo para seguimiento.',
    ],
    reportKicker: 'Reporte de barrera',
    reportTitle: 'Reportar una barrera de accesibilidad',
    reportBody:
      'Use este formulario para preparar un reporte de accesibilidad para el Pueblo de Wiley si una pagina, documento, imagen o flujo de servicio es dificil de usar.',
    nameLabel: 'Su nombre',
    contactLabel: 'Mejor telefono o correo para seguimiento',
    pageLabel: 'Pagina, documento o servicio con la barrera',
    detailsLabel: 'Describa la barrera',
    actionLabel: 'Abrir correo de reporte de accesibilidad',
    validationMessage:
      'Complete el contacto, la pagina y los detalles de la barrera para que el sitio pueda preparar el reporte.',
    mailClientMessage:
      'Su aplicacion de correo debe abrirse con un reporte de accesibilidad preparado. Si no ocurre nada, use los enlaces directos de telefono o correo de abajo.',
    phoneFallbackLabel: 'Llamar al ayuntamiento',
    emailFallbackLabel: 'Enviar correo a la secretaria',
    reportSubject: 'Reporte de barrera de accesibilidad',
  },
};

type AccessibilityReportFormGroup = FormGroup<{
  name: FormControl<string>;
  preferredContact: FormControl<string>;
  pageOrDocument: FormControl<string>;
  details: FormControl<string>;
}>;

@Component({
  selector: 'app-accessibility-support',
  imports: [ReactiveFormsModule, InputTextModule, MessageModule, TextareaModule],
  templateUrl: './accessibility-support.html',
  styleUrl: './accessibility-support.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessibilitySupport {
  readonly contacts = input<CmsContact[]>([]);

  private readonly siteLanguageService = inject(SiteLanguageService);

  protected readonly copy = computed(
    () => ACCESSIBILITY_SUPPORT_COPY[this.siteLanguageService.currentLanguage()],
  );
  protected readonly status = signal<string | null>(null);
  protected readonly statusTone = signal<AccessibilityStatusTone>('info');
  protected readonly reportForm: AccessibilityReportFormGroup = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    preferredContact: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    pageOrDocument: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    details: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  private readonly reportFormValue = toSignal(
    this.reportForm.valueChanges.pipe(startWith(this.reportForm.getRawValue())),
    { initialValue: this.reportForm.getRawValue() },
  );

  protected readonly townInfoContact = computed(() => this.findContact('town-information'));
  protected readonly clerkContact = computed(() => this.findContact('city-clerk'));
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
  protected readonly accessibilityMailtoHref = computed(() => this.buildAccessibilityMailtoHref());

  constructor() {
    this.reportForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.status.set(null);
      this.statusTone.set('info');
    });
  }

  protected openAccessibilityMailto(event: Event): void {
    if (!this.accessibilityMailtoHref()) {
      event.preventDefault();
      this.reportForm.markAllAsTouched();
      this.statusTone.set('error');
      this.status.set(this.copy().validationMessage);
      return;
    }

    this.statusTone.set('info');
    this.status.set(this.copy().mailClientMessage);
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

  private buildAccessibilityMailtoHref(): string | null {
    if (this.reportForm.invalid) {
      return null;
    }

    const values = this.reportFormValue();
    const recipient =
      this.getEmailAddress(this.clerkContact()) || this.getEmailAddress(this.townInfoContact());

    if (!recipient) {
      return null;
    }

    const params = new URLSearchParams({
      subject: this.copy().reportSubject,
      body: [
        `${this.copy().nameLabel}: ${values.name || '-'}`,
        `${this.copy().contactLabel}: ${values.preferredContact}`,
        `${this.copy().pageLabel}: ${values.pageOrDocument}`,
        `${this.copy().detailsLabel}: ${values.details}`,
      ].join('\n'),
    });

    return `mailto:${recipient}?${params.toString()}`;
  }
}
