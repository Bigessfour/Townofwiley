import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MessageModule } from 'primeng/message';
import { StaffAuthService } from '../auth/staff-auth.service';
import { CmsPublicDocumentAdminService } from '../cms-public-document-admin.service';
import { DocumentRefreshService } from '../document-refresh.service';
import { DocumentUploadService } from '../document-upload.service';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import { confirmMeetingDocumentUpload } from './cms-clerk-sensitive-save';

interface MeetingUploadCopy {
  title: string;
  lead: string;
  eventLabel: string;
  eventPlaceholder: string;
  noEvents: string;
  fileLabel: string;
  uploading: string;
  chooseFile: string;
  uploadButton: string;
  signInHint: string;
  signInLink: string;
  successTemplate: string;
  viewDocuments: string;
}

const MEETING_UPLOAD_COPY = {
  en: {
    title: 'Upload a meeting agenda or packet',
    lead: 'Choose the meeting this file belongs to, then upload a PDF via secure presigned URL. CloudFront cache for /meetings refreshes automatically. The file is published under Meeting documents and linked to that meeting on the Meetings page.',
    eventLabel: 'Which meeting is this for?',
    eventPlaceholder: 'Select a meeting',
    noEvents:
      'No upcoming meetings found. Use Add meeting or event on /admin first, then return here to upload its agenda.',
    fileLabel: 'Agenda or meeting PDF',
    uploading: 'Uploading…',
    chooseFile: 'Choose PDF (presigned upload)',
    uploadButton: 'Upload and publish',
    signInHint: 'Sign in to',
    signInLink: 'Town admin',
    successTemplate: 'Published {title}. Residents can open it from the Meetings page.',
    viewDocuments: 'View on Meetings page',
  },
  es: {
    title: 'Subir agenda o paquete de reunion',
    lead: 'Elija la reunion a la que corresponde este archivo y seleccione un PDF de su computadora. El archivo se publica en Documentos de reuniones y se vincula a esa reunion en la pagina de Reuniones.',
    eventLabel: '¿Para que reunion es?',
    eventPlaceholder: 'Seleccione una reunion',
    noEvents:
      'No hay reuniones proximas. Use Agregar reunion o evento en /admin primero y vuelva aqui para subir la agenda.',
    fileLabel: 'Agenda o PDF de reunion',
    uploading: 'Subiendo…',
    chooseFile: 'Elegir archivo de la computadora',
    uploadButton: 'Subir y publicar',
    signInHint: 'Inicie sesion en',
    signInLink: 'Administracion municipal',
    successTemplate:
      'Se publico {title}. Los residentes pueden abrirlo desde la pagina de Reuniones.',
    viewDocuments: 'Ver en pagina de Reuniones',
  },
} satisfies Record<'en' | 'es', MeetingUploadCopy>;

@Component({
  selector: 'app-cms-meeting-document-upload',
  standalone: true,
  imports: [MessageModule],
  templateUrl: './cms-meeting-document-upload.component.html',
  styleUrl: './cms-meeting-document-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsMeetingDocumentUploadComponent implements OnInit {
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly uploads = inject(DocumentUploadService);
  private readonly publicDocuments = inject(CmsPublicDocumentAdminService);
  private readonly staffAuth = inject(StaffAuthService);
  private readonly documentRefresh = inject(DocumentRefreshService);
  private readonly siteLanguage = inject(SiteLanguageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly isSignedIn = this.staffAuth.isStaff;

  ngOnInit(): void {
    void this.staffAuth.refreshSession().then(() => this.cdr.markForCheck());
  }

  protected readonly selectedEventId = signal('');
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly publishedDocumentsHref = signal<string | null>(null);

  protected readonly copy = computed(
    () => MEETING_UPLOAD_COPY[this.siteLanguage.currentLanguage()],
  );

  protected readonly meetingOptions = computed(() => {
    const locale = this.siteLanguage.currentLanguage() === 'es' ? 'es-US' : 'en-US';
    const formatter = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    return this.cmsStore.events().map((event) => {
      const parsed = Date.parse(event.start);
      const schedule = Number.isNaN(parsed) ? event.start : formatter.format(new Date(parsed));

      return {
        id: event.id,
        label: `${event.title} — ${schedule}`,
      };
    });
  });

  protected readonly canUpload = computed(
    () => Boolean(this.selectedEventId()) && Boolean(this.selectedFile()) && !this.uploading(),
  );

  protected readonly uploadPreview = computed(() => {
    const eventId = this.selectedEventId();
    const file = this.selectedFile();
    if (!eventId || !file) {
      return null;
    }
    const meeting = this.meetingOptions().find((option) => option.id === eventId);
    if (!meeting) {
      return null;
    }
    return {
      meetingLabel: meeting.label,
      fileName: file.name,
    };
  });

  protected onEventChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedEventId.set(select.value);
    this.error.set(null);
    this.success.set(null);
  }

  protected onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0] ?? null;
    this.selectedFile.set(file);
    this.error.set(null);
    this.success.set(null);
  }

  protected async uploadSelectedFile(): Promise<void> {
    const file = this.selectedFile();
    const eventId = this.selectedEventId();
    const event = this.cmsStore.events().find((item) => item.id === eventId);

    if (!file || !event) {
      return;
    }

    this.error.set(null);
    this.success.set(null);
    this.publishedDocumentsHref.set(null);

    await this.staffAuth.refreshSession();
    if (!this.staffAuth.isStaff()) {
      this.error.set(
        `${this.copy().signInHint} ${this.copy().signInLink} at /admin/login before uploading.`,
      );
      return;
    }

    const meetingLabel = event.title?.trim() || 'Selected meeting';
    if (!confirmMeetingDocumentUpload(meetingLabel, file.name)) {
      return;
    }

    this.uploading.set(true);
    try {
      const uploaded = await this.uploads.uploadDocument(file, 'meeting-documents');

      try {
        await this.publicDocuments.createDocumentFromUpload(uploaded, 'meeting-documents', {
          eventId: event.id,
          eventTitle: event.title,
          eventStart: event.start,
          locale: this.siteLanguage.currentLanguage() === 'es' ? 'es-US' : 'en-US',
        });
      } catch (createError) {
        await this.uploads.deleteDocument(uploaded.id).catch(() => undefined);
        throw createError;
      }

      this.documentRefresh.triggerRefresh();
      await this.cmsStore.forceLiveRefresh();

      const title = `${event.title}`;
      this.success.set(this.copy().successTemplate.replace('{title}', title));
      this.publishedDocumentsHref.set('/meetings');
      this.selectedFile.set(null);
    } catch {
      this.error.set(
        'Upload failed. Confirm you are signed in at /admin/login and try again, or call Town Hall at (719) 829-4974.',
      );
    } finally {
      this.uploading.set(false);
      this.cdr.markForCheck();
    }
  }
}
