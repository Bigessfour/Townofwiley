import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { AppRouteLink, getAppRouteLink } from '../internal-route-link';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguage, SiteLanguageService } from '../site-language';
import { DocumentRefreshService } from '../document-refresh.service';
import { DocumentUploadService } from '../document-upload.service';
import {
    DOCUMENT_ARCHIVE,
    type DocumentArchiveSectionId,
    type PublishedDocument,
} from './document-archive';

interface DocumentAction {
  label: string;
  href: string;
  external?: boolean;
}

interface DocumentItem {
  title: string;
  status: string;
  detail: string;
  actions: DocumentAction[];
}

interface DocumentSection {
  id: DocumentArchiveSectionId;
  kicker: string;
  title: string;
  intro: string;
  items: DocumentItem[];
}

interface DocumentSectionView extends DocumentSection {
  publishedDocuments: PublishedDocument[];
}

interface DocumentHubCopy {
  kicker: string;
  title: string;
  intro: string;
  returnHome: string;
  openRecordsForm: string;
  sectionNavLabel: string;
  publishedArchiveKicker: string;
  publishedArchiveHeading: string;
  publishedArchiveIntro: string;
  openDocumentLabel: string;
  downloadDocumentLabel: string;
  updatedLabel: string;
  formatLabel: string;
  sections: DocumentSection[];
}

export const DOCUMENT_HUB_TITLE_EN = 'Public meeting, finance, and code documents';

const DOCUMENT_HUB_COPY: Record<SiteLanguage, DocumentHubCopy> = {
  en: {
    kicker: 'Public Document Hub',
    title: 'Public meeting, finance, and code documents',
    intro:
      'Use this page to find meeting packets, approved minutes, budget summaries, annual reports, ordinances, zoning references, and records request information.',
    returnHome: 'Return to homepage',
    openRecordsForm: 'Open records request form',
    sectionNavLabel: 'Document hub sections',
    publishedArchiveKicker: 'Published now',
    publishedArchiveHeading: 'Downloadable public files available now',
    publishedArchiveIntro:
      'Browse the public documents that are currently available for download.',
    openDocumentLabel: 'Open document',
    downloadDocumentLabel: 'Download file',
    updatedLabel: 'Updated',
    formatLabel: 'Format',
    sections: [
      {
        id: 'records-requests',
        kicker: 'Requests',
        title: 'Public records and FOIA requests',
        intro:
          'Start here when you need a specific date range, accessible copy, public record, or document that is not already posted in the public destinations below.',
        items: [
          {
            title: 'Records request form',
            status: 'Resident request path live',
            detail:
              'Use the clerk request form for public records, meeting packets, approved minutes, permit references, or accessible document copies.',
            actions: [
              { label: 'Open records request form', href: '/services#records-request' },
              { label: 'Email the Clerk', href: 'mailto:deb.dillon@townofwiley.gov' },
            ],
          },
        ],
      },
      {
        id: 'meeting-documents',
        kicker: 'Meetings',
        title: 'Agenda packets, approved minutes, and meeting access',
        intro:
          'These are the public destinations for recurring meeting records and agenda follow-up. Residents should be able to start here before needing direct clerk help.',
        items: [
          {
            title: 'City Council packets and approved minutes',
            status: 'Public destination live',
            detail:
              'Use this destination for the recurring second-Monday council record, agenda timing, packet follow-up, and approved-minute publishing guidance.',
            actions: [
              { label: 'Open the public calendar', href: '/meetings' },
              { label: 'Email the Clerk', href: 'mailto:deb.dillon@townofwiley.gov' },
              { label: 'Call Town Hall', href: 'tel:+17198294974' },
            ],
          },
          {
            title: 'Planning and zoning hearing references',
            status: 'Public destination live',
            detail:
              'Use this destination for recurring hearing timing, map follow-up, staff-report routing, and packet requests tied to planning and zoning review.',
            actions: [
              { label: 'Open the public calendar', href: '/meetings' },
              { label: 'Request clerk follow-up', href: '/services#records-request' },
            ],
          },
        ],
      },
      {
        id: 'financial-documents',
        kicker: 'Finance',
        title: 'Budget summaries and annual reports',
        intro:
          'Residents should have one clear place to start for the Town budget, annual reporting, and finance-document follow-up instead of guessing which office holds a file.',
        items: [
          {
            title: 'Budget summary destination',
            status: 'Public destination live',
            detail:
              'Use this section for budget summaries, annual reports, and finance document requests.',
            actions: [
              { label: 'Request budget documents', href: '/services#records-request' },
              { label: 'Email the Clerk', href: 'mailto:deb.dillon@townofwiley.gov' },
            ],
          },
          {
            title: 'Annual reports and audit follow-up',
            status: 'Public destination live',
            detail:
              'Use this destination when you need annual reports, audit-related records, or finance packets that are not yet published as a downloadable archive.',
            actions: [
              { label: 'Open records request form', href: '/services#records-request' },
              { label: 'Call Town Hall', href: 'tel:+17198294974' },
            ],
          },
        ],
      },
      {
        id: 'code-references',
        kicker: 'Code and Zoning',
        title: 'Ordinances, municipal code, and zoning references',
        intro:
          'Residents, businesses, and contractors need a stable public destination for ordinance lookups, zoning references, and permit-support materials.',
        items: [
          {
            title: 'Ordinance and code lookup destination',
            status: 'Public destination live',
            detail:
              'Use this destination for ordinance lookups, municipal-code questions, and code-reference follow-up when the exact file is not yet posted online.',
            actions: [
              { label: 'Request ordinance or code help', href: '/services#records-request' },
              { label: 'Email the Clerk', href: 'mailto:deb.dillon@townofwiley.gov' },
            ],
          },
          {
            title: 'Zoning and permit reference destination',
            status: 'Public destination live',
            detail:
              'Use this destination for zoning references, hearing support materials, and permit guidance that needs clerk or Town Hall follow-up.',
            actions: [
              { label: 'Open permit and records request form', href: '/services#records-request' },
              { label: 'Call Town Hall', href: 'tel:+17198294974' },
            ],
          },
        ],
      },
    ],
  },
  es: {
    kicker: 'Centro publico de documentos',
    title: 'Documentos publicos de reuniones, finanzas y codigo',
    intro:
      'Use esta pagina para encontrar paquetes de agenda, minutas aprobadas, resumenes de presupuesto, informes anuales, ordenanzas, referencias de zonificacion e informacion para solicitar registros.',
    returnHome: 'Volver a la pagina principal',
    openRecordsForm: 'Abrir formulario de registros',
    sectionNavLabel: 'Secciones del centro de documentos',
    publishedArchiveKicker: 'Publicado ahora',
    publishedArchiveHeading: 'Archivos publicos descargables disponibles ahora',
    publishedArchiveIntro:
      'Consulte los documentos publicos que actualmente estan disponibles para descargar.',
    openDocumentLabel: 'Abrir documento',
    downloadDocumentLabel: 'Descargar archivo',
    updatedLabel: 'Actualizado',
    formatLabel: 'Formato',
    sections: [
      {
        id: 'records-requests',
        kicker: 'Solicitudes',
        title: 'Registros publicos y solicitudes FOIA',
        intro:
          'Empiece aqui cuando necesite un rango de fechas, una copia accesible, un registro publico o un documento que todavia no este publicado en los destinos publicos de abajo.',
        items: [
          {
            title: 'Formulario de solicitud de registros',
            status: 'Ruta publica para residentes activa',
            detail:
              'Use el formulario de la secretaria para registros publicos, paquetes de reuniones, minutas aprobadas, referencias para permisos o copias accesibles.',
            actions: [
              { label: 'Abrir formulario de registros', href: '/services#records-request' },
              { label: 'Escribir a la secretaria', href: 'mailto:deb.dillon@townofwiley.gov' },
            ],
          },
        ],
      },
      {
        id: 'meeting-documents',
        kicker: 'Reuniones',
        title: 'Paquetes de agenda, minutas aprobadas y acceso a reuniones',
        intro:
          'Estos son los destinos publicos para registros de reuniones recurrentes y seguimiento de agenda. Los residentes deben poder empezar aqui antes de necesitar ayuda directa de la secretaria.',
        items: [
          {
            title: 'Paquetes y minutas del concejo municipal',
            status: 'Destino publico activo',
            detail:
              'Use este destino para el registro recurrente del concejo del segundo lunes, los tiempos de agenda, el seguimiento de paquetes y la publicacion de minutas aprobadas.',
            actions: [
              { label: 'Abrir calendario publico', href: '/meetings' },
              { label: 'Escribir a la secretaria', href: 'mailto:deb.dillon@townofwiley.gov' },
              { label: 'Llamar al ayuntamiento', href: 'tel:+17198294974' },
            ],
          },
          {
            title: 'Referencias de planeacion y zonificacion',
            status: 'Destino publico activo',
            detail:
              'Use este destino para horarios de audiencias recurrentes, seguimiento de mapas, rutas para informes del personal y solicitudes de paquetes de planeacion y zonificacion.',
            actions: [
              { label: 'Abrir calendario publico', href: '/meetings' },
              { label: 'Solicitar seguimiento de secretaria', href: '/services#records-request' },
            ],
          },
        ],
      },
      {
        id: 'financial-documents',
        kicker: 'Finanzas',
        title: 'Resumenes de presupuesto e informes anuales',
        intro:
          'Los residentes deben tener un lugar claro para empezar cuando buscan el presupuesto del pueblo, informes anuales o seguimiento de documentos financieros sin adivinar que oficina tiene el archivo.',
        items: [
          {
            title: 'Destino para resumenes de presupuesto',
            status: 'Destino publico activo',
            detail:
              'Use este destino para solicitudes de resumenes de presupuesto, seguimiento de documentos financieros y la ruta de secretaria cuando la publicacion actual todavia se esta preparando.',
            actions: [
              { label: 'Solicitar documentos de presupuesto', href: '/services#records-request' },
              { label: 'Escribir a la secretaria', href: 'mailto:deb.dillon@townofwiley.gov' },
            ],
          },
          {
            title: 'Seguimiento de informes anuales y auditorias',
            status: 'Destino publico activo',
            detail:
              'Use este destino cuando necesite informes anuales, registros relacionados con auditorias o paquetes financieros que todavia no esten publicados como archivo descargable.',
            actions: [
              { label: 'Abrir formulario de registros', href: '/services#records-request' },
              { label: 'Llamar al ayuntamiento', href: 'tel:+17198294974' },
            ],
          },
        ],
      },
      {
        id: 'code-references',
        kicker: 'Codigo y zonificacion',
        title: 'Ordenanzas, codigo municipal y referencias de zonificacion',
        intro:
          'Residentes, negocios y contratistas necesitan un destino publico estable para buscar ordenanzas, referencias de zonificacion y materiales de apoyo para permisos.',
        items: [
          {
            title: 'Destino para ordenanzas y codigo',
            status: 'Destino publico activo',
            detail:
              'Use este destino para buscar ordenanzas, preguntas sobre codigo municipal y seguimiento de referencias cuando el archivo exacto todavia no este publicado en linea.',
            actions: [
              {
                label: 'Solicitar ayuda sobre ordenanzas o codigo',
                href: '/services#records-request',
              },
              { label: 'Escribir a la secretaria', href: 'mailto:deb.dillon@townofwiley.gov' },
            ],
          },
          {
            title: 'Destino para zonificacion y permisos',
            status: 'Destino publico activo',
            detail:
              'Use este destino para referencias de zonificacion, materiales de audiencias y orientacion de permisos que requieren seguimiento de la secretaria o del ayuntamiento.',
            actions: [
              {
                label: 'Abrir formulario de permisos y registros',
                href: '/services#records-request',
              },
              { label: 'Llamar al ayuntamiento', href: 'tel:+17198294974' },
            ],
          },
        ],
      },
    ],
  },
};

@Component({
  selector: 'app-document-hub',
  imports: [InputTextModule, RouterLink],
  templateUrl: './document-hub.html',
  styleUrl: './document-hub.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentHub {
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly cms = inject(LocalizedCmsContentStore);
  private readonly documentUploadService = inject(DocumentUploadService);
  private readonly documentRefreshService = inject(DocumentRefreshService);

  protected readonly resolvedCmsDocumentHrefs = signal<Record<string, string>>({});

  protected readonly copy = computed(
    () => DOCUMENT_HUB_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );
  protected readonly sections = computed<DocumentSectionView[]>(() => {
    const language = this.siteLanguageService.currentLanguage();
    const staticArchive = DOCUMENT_ARCHIVE[language];
    const cmsDocuments = this.cms.publicDocuments();
    const resolvedCmsDocumentHrefs = this.resolvedCmsDocumentHrefs();

    // Merge: CMS documents take precedence and can reference storage-backed files; static entries fill gaps.
    const mergedById = new Map<string, PublishedDocument>();
    for (const doc of staticArchive) {
      mergedById.set(doc.id, doc);
    }
    for (const doc of cmsDocuments) {
      mergedById.set(doc.id, {
        id: doc.id,
        sectionId: doc.sectionId as DocumentArchiveSectionId,
        title: doc.title,
        summary: doc.summary,
        status: doc.status,
        updatedAt: '',
        format: doc.format,
        href: resolvedCmsDocumentHrefs[doc.id] ?? doc.href,
        downloadFileName: doc.downloadFileName,
        keywords: doc.keywords,
      });
    }
    const merged = Array.from(mergedById.values());

    return DOCUMENT_HUB_COPY[language].sections.map((section) => ({
      ...section,
      publishedDocuments: merged.filter((document) => document.sectionId === section.id),
    }));
  });

  protected readonly searchTerm = signal('');

  protected readonly filteredDocuments = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) {
      return this.sections().flatMap((s) => s.publishedDocuments);
    }
    return this.sections().flatMap((s) => s.publishedDocuments).filter((d) =>
      d.title.toLowerCase().includes(term) ||
      d.summary.toLowerCase().includes(term) ||
      d.keywords.some((k) => k.toLowerCase().includes(term))
    );
  });

  protected readonly upcomingMeeting = computed(() => {
    const language = this.siteLanguageService.currentLanguage();
    const now = Date.now();
    const nextEvent = this.cms.events()
      .filter(e => new Date(e.start).getTime() > now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];

    if (nextEvent) {
      const locale = language === 'es' ? 'es-US' : 'en-US';
      const datePart = new Intl.DateTimeFormat(locale, {
        month: 'long', day: 'numeric', year: 'numeric',
      }).format(new Date(nextEvent.start));
      const timePart = new Intl.DateTimeFormat(locale, {
        hour: 'numeric', minute: '2-digit',
      }).format(new Date(nextEvent.start));
      const at = language === 'es' ? 'a las' : 'at';
      return {
        title: nextEvent.title,
        date: `${datePart} ${at} ${timePart}`,
        summary: nextEvent.description ||
          (language === 'es'
            ? 'Consulte la agenda completa con la secretaria antes de la reunion.'
            : 'See the full agenda. Contact the clerk to be placed on the agenda.'),
        href: '/meetings',
      };
    }

    return language === 'es'
      ? {
          title: 'Proxima reunion del concejo municipal — segundo lunes',
          date: 'Consulte el calendario para la fecha y hora exactas',
          summary:
            'El concejo se reune el segundo lunes de cada mes a las 6:00 PM en el ayuntamiento de Wiley. La secretaria publica la agenda con anticipacion.',
          href: '/meetings',
        }
      : {
          title: 'Next City Council Meeting — Second Monday',
          date: 'Check the public calendar for the exact date and time',
          summary:
            'The council meets every second Monday at 6:00 PM at Wiley Town Hall. The clerk posts the agenda ahead of the meeting.',
          href: '/meetings',
        };
  });

  protected resolveAppLink(href: string | null | undefined, defaultPath = '/documents'): AppRouteLink {
    return getAppRouteLink(href, defaultPath);
  }

  constructor() {
    void this.resolveCmsDocumentHrefs();

    effect(() => {
      this.documentRefreshService.getRefreshTrigger()();
      void this.cms.refreshContent();
      void this.resolveCmsDocumentHrefs();
    });
  }

  private async resolveCmsDocumentHrefs() {
    try {
      const hrefEntries = await Promise.all(
        this.cms.publicDocuments().map(async (document) => {
          const resolvedHref = await this.documentUploadService.resolveDocumentHref(document.href);
          return [document.id, resolvedHref] as const;
        }),
      );

      this.resolvedCmsDocumentHrefs.set(Object.fromEntries(hrefEntries));
    } catch (error) {
      console.error('Failed to resolve CMS document links:', error);
      this.resolvedCmsDocumentHrefs.set({});
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private getFormatFromType(mimeType: string): string {
    const formatMap: Record<string, string> = {
      'application/pdf': 'PDF',
      'application/msword': 'DOC',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/vnd.ms-excel': 'XLS',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'text/plain': 'TXT',
      'image/jpeg': 'JPG',
      'image/png': 'PNG',
    };
    return formatMap[mimeType] || 'File';
  }
}
