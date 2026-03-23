import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SiteLanguage, SiteLanguageService } from '../site-language';

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
  id: string;
  kicker: string;
  title: string;
  intro: string;
  items: DocumentItem[];
}

interface DocumentHubCopy {
  kicker: string;
  title: string;
  intro: string;
  returnHome: string;
  openRecordsForm: string;
  sectionNavLabel: string;
  sections: DocumentSection[];
}

const DOCUMENT_HUB_COPY: Record<SiteLanguage, DocumentHubCopy> = {
  en: {
    kicker: 'Public Document Hub',
    title: 'Stable public destinations for meetings, finance records, and code references',
    intro:
      'Use this page when you need meeting packets, approved minutes, budget summaries, annual reports, ordinances, zoning references, or a structured records request path. Even when a file is not posted yet, the destination stays public and tells residents exactly where the follow-up belongs.',
    returnHome: 'Return to homepage',
    openRecordsForm: 'Open records request form',
    sectionNavLabel: 'Document hub sections',
    sections: [
      {
        id: 'records-requests',
        kicker: 'Requests',
        title: 'Public records and FOIA requests',
        intro:
          'Start here when you need a specific date range, accessible copy, public record, or document that is not already posted in the public destinations below.',
        items: [
          {
            title: 'Records request workflow',
            status: 'Resident request path live',
            detail:
              'Use the structured clerk intake form for public records, meeting packets, approved minutes, permit references, or accessible document copies that still need staff follow-up.',
            actions: [
              { label: 'Open records request form', href: '/#records-request' },
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
              { label: 'Open the public calendar', href: '/#calendar' },
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
              { label: 'Open the public calendar', href: '/#calendar' },
              { label: 'Request clerk follow-up', href: '/#records-request' },
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
              'Use this destination for budget-summary requests, finance-document follow-up, and the clerk path when a current posting is still being prepared.',
            actions: [
              { label: 'Request budget documents', href: '/#records-request' },
              { label: 'Email the Clerk', href: 'mailto:deb.dillon@townofwiley.gov' },
            ],
          },
          {
            title: 'Annual reports and audit follow-up',
            status: 'Public destination live',
            detail:
              'Use this destination when you need annual reports, audit-related records, or finance packets that are not yet published as a downloadable archive.',
            actions: [
              { label: 'Open records request form', href: '/#records-request' },
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
              { label: 'Request ordinance or code help', href: '/#records-request' },
              { label: 'Email the Clerk', href: 'mailto:deb.dillon@townofwiley.gov' },
            ],
          },
          {
            title: 'Zoning and permit reference destination',
            status: 'Public destination live',
            detail:
              'Use this destination for zoning references, hearing support materials, and permit guidance that needs clerk or Town Hall follow-up.',
            actions: [
              { label: 'Open permit and records request form', href: '/#records-request' },
              { label: 'Call Town Hall', href: 'tel:+17198294974' },
            ],
          },
        ],
      },
    ],
  },
  es: {
    kicker: 'Centro publico de documentos',
    title: 'Destinos publicos estables para reuniones, finanzas y referencias de codigo',
    intro:
      'Use esta pagina cuando necesite paquetes de agenda, minutas aprobadas, resumenes de presupuesto, informes anuales, ordenanzas, referencias de zonificacion o una ruta estructurada de solicitud de registros. Aunque un archivo aun no este publicado, el destino sigue siendo publico y le indica al residente donde corresponde el seguimiento.',
    returnHome: 'Volver a la pagina principal',
    openRecordsForm: 'Abrir formulario de registros',
    sectionNavLabel: 'Secciones del centro de documentos',
    sections: [
      {
        id: 'records-requests',
        kicker: 'Solicitudes',
        title: 'Registros publicos y solicitudes FOIA',
        intro:
          'Empiece aqui cuando necesite un rango de fechas, una copia accesible, un registro publico o un documento que todavia no este publicado en los destinos publicos de abajo.',
        items: [
          {
            title: 'Flujo de solicitud de registros',
            status: 'Ruta publica para residentes activa',
            detail:
              'Use el formulario estructurado de la secretaria para registros publicos, paquetes de reuniones, minutas aprobadas, referencias para permisos o copias accesibles que aun requieren seguimiento del personal.',
            actions: [
              { label: 'Abrir formulario de registros', href: '/#records-request' },
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
              { label: 'Abrir calendario publico', href: '/#calendar' },
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
              { label: 'Abrir calendario publico', href: '/#calendar' },
              { label: 'Solicitar seguimiento de secretaria', href: '/#records-request' },
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
              { label: 'Solicitar documentos de presupuesto', href: '/#records-request' },
              { label: 'Escribir a la secretaria', href: 'mailto:deb.dillon@townofwiley.gov' },
            ],
          },
          {
            title: 'Seguimiento de informes anuales y auditorias',
            status: 'Destino publico activo',
            detail:
              'Use este destino cuando necesite informes anuales, registros relacionados con auditorias o paquetes financieros que todavia no esten publicados como archivo descargable.',
            actions: [
              { label: 'Abrir formulario de registros', href: '/#records-request' },
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
              { label: 'Solicitar ayuda sobre ordenanzas o codigo', href: '/#records-request' },
              { label: 'Escribir a la secretaria', href: 'mailto:deb.dillon@townofwiley.gov' },
            ],
          },
          {
            title: 'Destino para zonificacion y permisos',
            status: 'Destino publico activo',
            detail:
              'Use este destino para referencias de zonificacion, materiales de audiencias y orientacion de permisos que requieren seguimiento de la secretaria o del ayuntamiento.',
            actions: [
              { label: 'Abrir formulario de permisos y registros', href: '/#records-request' },
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
  templateUrl: './document-hub.html',
  styleUrl: './document-hub.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentHub {
  private readonly siteLanguageService = inject(SiteLanguageService);

  protected readonly copy = computed(
    () => DOCUMENT_HUB_COPY[this.siteLanguageService.currentLanguage()],
  );
}
