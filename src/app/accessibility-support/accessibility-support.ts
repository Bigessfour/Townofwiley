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
    statementTitle: 'Every resident should be able to use this website',
    statementBody:
      'Accessibility means that people with disabilities — including those who use screen readers, keyboard navigation, voice control, or other assistive technology — can get the same information and complete the same tasks as anyone else. The Town of Wiley is committed to meeting WCAG 2.1 AA standards so that no resident is blocked from reaching public services, meeting notices, billing help, or emergency information.',
    statementCommitments: [
      'All pages support keyboard navigation and screen reader use, with visible focus indicators and skip-to-content links.',
      'Text and documents are published in readable contrast with plain-language labels so content is usable for everyone.',
      'If you report a barrier, town staff will review it and follow up with you directly — reports are not ignored.',
    ],
    reportKicker: 'Report an Accessibility Issue',
    reportTitle: 'Having trouble using this site? Let us know.',
    reportBody:
      'If any page, document, form, or feature on this site is hard to use because of a disability or assistive technology issue, fill out this short form. A town staff member will follow up with you directly. You can also call Town Hall or email the Clerk using the links below.',
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
    statementTitle: 'Cada residente debe poder usar este sitio',
    statementBody:
      'Accesibilidad significa que las personas con discapacidades, incluyendo quienes usan lectores de pantalla, navegacion por teclado, control por voz u otra tecnologia de asistencia, pueden obtener la misma informacion y completar las mismas tareas que cualquier otra persona. El Pueblo de Wiley esta comprometido a cumplir los estandares WCAG 2.1 AA para que ningun residente quede bloqueado al intentar acceder a servicios publicos, avisos de reuniones, ayuda de facturacion o informacion de emergencia.',
    statementCommitments: [
      'Todas las paginas admiten navegacion por teclado y uso de lectores de pantalla, con indicadores de foco visibles y enlaces para saltar el contenido.',
      'El texto y los documentos se publican con contraste legible y etiquetas en lenguaje sencillo para que el contenido sea usable para todos.',
      'Si reporta una barrera, el personal del pueblo la revisara y le dara seguimiento directamente. Los reportes no se ignoran.',
    ],
    reportKicker: 'Reporte un problema de accesibilidad',
    reportTitle: 'Tiene problemas para usar este sitio? Haganos saber.',
    reportBody:
      'Si alguna pagina, documento, formulario o funcion de este sitio es dificil de usar por una discapacidad o un problema con tecnologia de asistencia, llene este formulario corto. Un miembro del personal del pueblo le dara seguimiento directamente. Tambien puede llamar al ayuntamiento o enviar un correo a la secretaria usando los enlaces de abajo.',
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
