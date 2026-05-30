/**
 * One-time migration source for PublicDocument rows (formerly DOCUMENT_ARCHIVE manifest).
 * Used by scripts/seed-public-documents-from-archive.mjs — not loaded at runtime.
 */
import type { DocumentArchiveSectionId } from './document-archive';

export interface ArchiveSeedDocument {
  id: string;
  sectionId: DocumentArchiveSectionId;
  title: string;
  titleEs: string;
  summary: string;
  summaryEs: string;
  status: string;
  statusEs: string;
  updatedAtLabel: string;
  updatedAtLabelEs: string;
  format: string;
  formatEs: string;
  href: string;
  downloadFileName: string;
  keywords: string[];
  displayOrder: number;
}

/** Former static manifest entries to seed into Amplify Studio PublicDocument. */
export const ARCHIVE_SEED_DOCUMENTS: ArchiveSeedDocument[] = [
  {
    id: 'records-request-checklist',
    sectionId: 'records-requests',
    title: 'Public Records Request Checklist',
    titleEs: 'Lista para solicitudes de registros publicos',
    summary:
      'A downloadable checklist that tells residents what details to include when they need a public record, accessible copy, packet, or follow-up from the Clerk.',
    summaryEs:
      'Una lista descargable que indica que detalles debe incluir el residente cuando necesita un registro publico, una copia accesible, un paquete o seguimiento de la secretaria.',
    status: 'Published guide',
    statusEs: 'Guia publicada',
    updatedAtLabel: 'March 2026',
    updatedAtLabelEs: 'Marzo 2026',
    format: 'HTML reference',
    formatEs: 'Referencia HTML',
    href: '/documents/archive/public-records-request-checklist.html',
    downloadFileName: 'public-records-request-checklist.html',
    keywords: ['records', 'foia', 'checklist', 'clerk', 'accessible copy', 'public request'],
    displayOrder: 10,
  },
  {
    id: 'city-council-meeting-access-guide',
    sectionId: 'meeting-documents',
    title: 'City Council Meeting Access Guide',
    titleEs: 'Guia de acceso a reuniones del concejo municipal',
    summary:
      'A public meeting-reference file covering the second-Monday meeting schedule, agenda timing, packet follow-up, and approved-minute routing.',
    summaryEs:
      'Una guia publica sobre la reunion del segundo lunes, los tiempos de agenda, el seguimiento de paquetes y la ruta para minutas aprobadas.',
    status: 'Published guide',
    statusEs: 'Guia publicada',
    updatedAtLabel: 'March 2026',
    updatedAtLabelEs: 'Marzo 2026',
    format: 'HTML reference',
    formatEs: 'Referencia HTML',
    href: '/documents/archive/city-council-meeting-access-guide.html',
    downloadFileName: 'city-council-meeting-access-guide.html',
    keywords: ['city council', 'meeting', 'agenda', 'packet', 'minutes', 'second monday'],
    displayOrder: 20,
  },
  {
    id: 'planning-zoning-hearing-guide',
    sectionId: 'meeting-documents',
    title: 'Planning and Zoning Hearing Guide',
    titleEs: 'Guia de audiencias de planeacion y zonificacion',
    summary:
      'A public hearing-reference file covering the first-Thursday schedule, hearing support materials, map follow-up, and request routing.',
    summaryEs:
      'Una guia publica sobre el horario del primer jueves, los materiales de apoyo, los mapas y la ruta correcta de seguimiento.',
    status: 'Published guide',
    statusEs: 'Guia publicada',
    updatedAtLabel: 'March 2026',
    updatedAtLabelEs: 'Marzo 2026',
    format: 'HTML reference',
    formatEs: 'Referencia HTML',
    href: '/documents/archive/planning-zoning-hearing-guide.html',
    downloadFileName: 'planning-zoning-hearing-guide.html',
    keywords: ['planning', 'zoning', 'hearing', 'maps', 'staff report', 'first thursday'],
    displayOrder: 30,
  },
  {
    id: 'budget-and-annual-reports-guide',
    sectionId: 'financial-documents',
    title: 'Budget and Annual Reports Guide',
    titleEs: 'Guia de presupuestos e informes anuales',
    summary:
      'A resident-facing guide that explains where budget summaries and annual reports belong and how to request current finance documents.',
    summaryEs:
      'Una guia para residentes que explica donde deben publicarse los resumenes de presupuesto e informes anuales y como solicitar documentos financieros actuales.',
    status: 'Published guide',
    statusEs: 'Guia publicada',
    updatedAtLabel: 'March 2026',
    updatedAtLabelEs: 'Marzo 2026',
    format: 'HTML reference',
    formatEs: 'Referencia HTML',
    href: '/documents/archive/budget-and-annual-reports-guide.html',
    downloadFileName: 'budget-and-annual-reports-guide.html',
    keywords: ['budget', 'annual report', 'finance', 'audit', 'town budget'],
    displayOrder: 40,
  },
  {
    id: 'ordinance-and-code-reference-guide',
    sectionId: 'code-references',
    title: 'Ordinance and Code Reference Guide',
    titleEs: 'Guia de ordenanzas y referencias de codigo',
    summary:
      'A public reference file for ordinance lookups, code questions, and the best clerk follow-up path when a specific file is not posted yet.',
    summaryEs:
      'Una referencia publica para buscar ordenanzas, resolver preguntas sobre el codigo y dirigir el seguimiento correcto con la secretaria.',
    status: 'Published guide',
    statusEs: 'Guia publicada',
    updatedAtLabel: 'March 2026',
    updatedAtLabelEs: 'Marzo 2026',
    format: 'HTML reference',
    formatEs: 'Referencia HTML',
    href: '/documents/archive/ordinance-and-code-reference-guide.html',
    downloadFileName: 'ordinance-and-code-reference-guide.html',
    keywords: ['ordinance', 'code', 'municipal code', 'lookup', 'clerk'],
    displayOrder: 50,
  },
  {
    id: 'zoning-and-permit-reference-guide',
    sectionId: 'code-references',
    title: 'Zoning and Permit Reference Guide',
    titleEs: 'Guia de zonificacion y permisos',
    summary:
      'A downloadable guide for zoning references, permit support materials, and the structured follow-up path for residents and contractors.',
    summaryEs:
      'Una guia descargable para referencias de zonificacion, materiales de apoyo para permisos y la ruta estructurada de seguimiento para residentes y contratistas.',
    status: 'Published guide',
    statusEs: 'Guia publicada',
    updatedAtLabel: 'March 2026',
    updatedAtLabelEs: 'Marzo 2026',
    format: 'HTML reference',
    formatEs: 'Referencia HTML',
    href: '/documents/archive/zoning-and-permit-reference-guide.html',
    downloadFileName: 'zoning-and-permit-reference-guide.html',
    keywords: ['zoning', 'permit', 'contractor', 'land use', 'application'],
    displayOrder: 60,
  },
];
