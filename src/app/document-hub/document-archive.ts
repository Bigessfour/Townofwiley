import { SiteLanguage } from '../site-language';

export type DocumentArchiveSectionId =
  | 'records-requests'
  | 'meeting-documents'
  | 'financial-documents'
  | 'code-references';

export interface PublishedDocument {
  id: string;
  sectionId: DocumentArchiveSectionId;
  title: string;
  summary: string;
  status: string;
  updatedAt: string;
  format: string;
  href: string;
  downloadFileName: string;
  keywords: string[];
}

// Publishing workflow:
// 1. Add the public file under public/documents/archive.
// 2. Register the file here so the document hub and homepage search can surface it.
export const DOCUMENT_ARCHIVE: Record<SiteLanguage, PublishedDocument[]> = {
  en: [
    {
      id: 'records-request-checklist',
      sectionId: 'records-requests',
      title: 'Public Records Request Checklist',
      summary:
        'A downloadable checklist that tells residents what details to include when they need a public record, accessible copy, packet, or follow-up from the Clerk.',
      status: 'Published guide',
      updatedAt: 'March 2026',
      format: 'HTML reference',
      href: '/documents/archive/public-records-request-checklist.html',
      downloadFileName: 'public-records-request-checklist.html',
      keywords: ['records', 'foia', 'checklist', 'clerk', 'accessible copy', 'public request'],
    },
    {
      id: 'city-council-meeting-access-guide',
      sectionId: 'meeting-documents',
      title: 'City Council Meeting Access Guide',
      summary:
        'A public meeting-reference file covering the second-Monday meeting schedule, agenda timing, packet follow-up, and approved-minute routing.',
      status: 'Published guide',
      updatedAt: 'March 2026',
      format: 'HTML reference',
      href: '/documents/archive/city-council-meeting-access-guide.html',
      downloadFileName: 'city-council-meeting-access-guide.html',
      keywords: ['city council', 'meeting', 'agenda', 'packet', 'minutes', 'second monday'],
    },
    {
      id: 'planning-zoning-hearing-guide',
      sectionId: 'meeting-documents',
      title: 'Planning and Zoning Hearing Guide',
      summary:
        'A public hearing-reference file covering the first-Thursday schedule, hearing support materials, map follow-up, and request routing.',
      status: 'Published guide',
      updatedAt: 'March 2026',
      format: 'HTML reference',
      href: '/documents/archive/planning-zoning-hearing-guide.html',
      downloadFileName: 'planning-zoning-hearing-guide.html',
      keywords: ['planning', 'zoning', 'hearing', 'maps', 'staff report', 'first thursday'],
    },
    {
      id: 'budget-and-annual-reports-guide',
      sectionId: 'financial-documents',
      title: 'Budget and Annual Reports Guide',
      summary:
        'A resident-facing guide that explains where budget summaries and annual reports belong and how to request current finance documents.',
      status: 'Published guide',
      updatedAt: 'March 2026',
      format: 'HTML reference',
      href: '/documents/archive/budget-and-annual-reports-guide.html',
      downloadFileName: 'budget-and-annual-reports-guide.html',
      keywords: ['budget', 'annual report', 'finance', 'audit', 'town budget'],
    },
    {
      id: 'ordinance-and-code-reference-guide',
      sectionId: 'code-references',
      title: 'Ordinance and Code Reference Guide',
      summary:
        'A public reference file for ordinance lookups, code questions, and the best clerk follow-up path when a specific file is not posted yet.',
      status: 'Published guide',
      updatedAt: 'March 2026',
      format: 'HTML reference',
      href: '/documents/archive/ordinance-and-code-reference-guide.html',
      downloadFileName: 'ordinance-and-code-reference-guide.html',
      keywords: ['ordinance', 'code', 'municipal code', 'lookup', 'clerk'],
    },
    {
      id: 'zoning-and-permit-reference-guide',
      sectionId: 'code-references',
      title: 'Zoning and Permit Reference Guide',
      summary:
        'A downloadable guide for zoning references, permit support materials, and the structured follow-up path for residents and contractors.',
      status: 'Published guide',
      updatedAt: 'March 2026',
      format: 'HTML reference',
      href: '/documents/archive/zoning-and-permit-reference-guide.html',
      downloadFileName: 'zoning-and-permit-reference-guide.html',
      keywords: ['zoning', 'permit', 'contractor', 'land use', 'application'],
    },
  ],
  es: [
    {
      id: 'records-request-checklist',
      sectionId: 'records-requests',
      title: 'Lista para solicitudes de registros publicos',
      summary:
        'Una lista descargable que indica que detalles debe incluir el residente cuando necesita un registro publico, una copia accesible, un paquete o seguimiento de la secretaria.',
      status: 'Guia publicada',
      updatedAt: 'Marzo 2026',
      format: 'Referencia HTML',
      href: '/documents/archive/public-records-request-checklist.html',
      downloadFileName: 'public-records-request-checklist.html',
      keywords: [
        'registros',
        'foia',
        'lista',
        'secretaria',
        'copia accesible',
        'solicitud publica',
      ],
    },
    {
      id: 'city-council-meeting-access-guide',
      sectionId: 'meeting-documents',
      title: 'Guia de acceso a reuniones del concejo municipal',
      summary:
        'Una guia publica sobre la reunion del segundo lunes, los tiempos de agenda, el seguimiento de paquetes y la ruta para minutas aprobadas.',
      status: 'Guia publicada',
      updatedAt: 'Marzo 2026',
      format: 'Referencia HTML',
      href: '/documents/archive/city-council-meeting-access-guide.html',
      downloadFileName: 'city-council-meeting-access-guide.html',
      keywords: ['concejo municipal', 'reunion', 'agenda', 'paquete', 'minutas', 'segundo lunes'],
    },
    {
      id: 'planning-zoning-hearing-guide',
      sectionId: 'meeting-documents',
      title: 'Guia de audiencias de planeacion y zonificacion',
      summary:
        'Una guia publica sobre el horario del primer jueves, los materiales de apoyo, los mapas y la ruta correcta de seguimiento.',
      status: 'Guia publicada',
      updatedAt: 'Marzo 2026',
      format: 'Referencia HTML',
      href: '/documents/archive/planning-zoning-hearing-guide.html',
      downloadFileName: 'planning-zoning-hearing-guide.html',
      keywords: [
        'planeacion',
        'zonificacion',
        'audiencia',
        'mapas',
        'reporte del personal',
        'primer jueves',
      ],
    },
    {
      id: 'budget-and-annual-reports-guide',
      sectionId: 'financial-documents',
      title: 'Guia de presupuestos e informes anuales',
      summary:
        'Una guia para residentes que explica donde deben publicarse los resumenes de presupuesto e informes anuales y como solicitar documentos financieros actuales.',
      status: 'Guia publicada',
      updatedAt: 'Marzo 2026',
      format: 'Referencia HTML',
      href: '/documents/archive/budget-and-annual-reports-guide.html',
      downloadFileName: 'budget-and-annual-reports-guide.html',
      keywords: ['presupuesto', 'informe anual', 'finanzas', 'auditoria', 'presupuesto del pueblo'],
    },
    {
      id: 'ordinance-and-code-reference-guide',
      sectionId: 'code-references',
      title: 'Guia de ordenanzas y referencias de codigo',
      summary:
        'Una referencia publica para buscar ordenanzas, resolver preguntas sobre el codigo y dirigir el seguimiento correcto con la secretaria.',
      status: 'Guia publicada',
      updatedAt: 'Marzo 2026',
      format: 'Referencia HTML',
      href: '/documents/archive/ordinance-and-code-reference-guide.html',
      downloadFileName: 'ordinance-and-code-reference-guide.html',
      keywords: ['ordenanza', 'codigo', 'codigo municipal', 'busqueda', 'secretaria'],
    },
    {
      id: 'zoning-and-permit-reference-guide',
      sectionId: 'code-references',
      title: 'Guia de zonificacion y permisos',
      summary:
        'Una guia descargable para referencias de zonificacion, materiales de apoyo para permisos y la ruta estructurada de seguimiento para residentes y contratistas.',
      status: 'Guia publicada',
      updatedAt: 'Marzo 2026',
      format: 'Referencia HTML',
      href: '/documents/archive/zoning-and-permit-reference-guide.html',
      downloadFileName: 'zoning-and-permit-reference-guide.html',
      keywords: ['zonificacion', 'permiso', 'contratista', 'uso de suelo', 'solicitud'],
    },
  ],
};
