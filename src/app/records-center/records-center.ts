import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SiteLanguage, SiteLanguageService } from '../site-language';

interface RecordsGuide {
  id: string;
  kicker: string;
  title: string;
  detail: string;
  cta: string;
  href: string;
}

interface RecordsCenterCopy {
  kicker: string;
  title: string;
  guides: RecordsGuide[];
}

const RECORDS_CENTER_COPY: Record<SiteLanguage, RecordsCenterCopy> = {
  en: {
    kicker: 'Document Center',
    title: 'Use clear document guides while the full archive is still growing',
    guides: [
      {
        id: 'records-guide-foia',
        kicker: 'Records Requests',
        title: 'Public records and FOIA guide',
        detail:
          'Start with the records request workflow when you need specific documents, date ranges, accessible copies, or a reply from the clerk.',
        cta: 'Open the records request form',
        href: '#records-request',
      },
      {
        id: 'records-guide-packets',
        kicker: 'Meeting Documents',
        title: 'Meeting packets and approved minutes',
        detail:
          'Use the calendar section for recurring meetings, then route packet and approved-minute follow-up through the clerk if the posting is not available yet.',
        cta: 'Open calendar and meeting access',
        href: '#calendar',
      },
      {
        id: 'records-guide-budgets',
        kicker: 'Financial Documents',
        title: 'Budget summaries and annual reports',
        detail:
          'Until a searchable archive is published, request budget summaries, annual reports, and related finance documents through the clerk intake path.',
        cta: 'Request budget or annual report help',
        href: '#records-request',
      },
      {
        id: 'records-guide-ordinances',
        kicker: 'Code and Zoning',
        title: 'Ordinances, zoning, and permit references',
        detail:
          'Use the records and permit workflow for ordinance lookups, zoning references, and supporting forms when the code library is not posted online yet.',
        cta: 'Open ordinance and permit help',
        href: '#records-request',
      },
    ],
  },
  es: {
    kicker: 'Centro de documentos',
    title: 'Use guias claras de documentos mientras el archivo completo sigue creciendo',
    guides: [
      {
        id: 'records-guide-foia',
        kicker: 'Solicitudes de registros',
        title: 'Guia de registros publicos y FOIA',
        detail:
          'Empiece con el flujo de solicitud de registros cuando necesite documentos especificos, rangos de fechas, copias accesibles o una respuesta de la secretaria.',
        cta: 'Abrir el formulario de registros',
        href: '#records-request',
      },
      {
        id: 'records-guide-packets',
        kicker: 'Documentos de reuniones',
        title: 'Paquetes de reuniones y minutas aprobadas',
        detail:
          'Use la seccion del calendario para reuniones recurrentes y despues canalice con la secretaria la solicitud de paquetes o minutas aprobadas si la publicacion todavia no aparece.',
        cta: 'Abrir calendario y acceso a reuniones',
        href: '#calendar',
      },
      {
        id: 'records-guide-budgets',
        kicker: 'Documentos financieros',
        title: 'Resumenes de presupuesto e informes anuales',
        detail:
          'Mientras no exista un archivo buscable, solicite resumenes de presupuesto, informes anuales y documentos financieros relacionados por medio de la ruta de secretaria.',
        cta: 'Solicitar ayuda sobre presupuesto o informe anual',
        href: '#records-request',
      },
      {
        id: 'records-guide-ordinances',
        kicker: 'Codigo y zonificacion',
        title: 'Ordenanzas, zonificacion y referencias para permisos',
        detail:
          'Use el flujo de registros y permisos para buscar ordenanzas, referencias de zonificacion y formularios de apoyo cuando la biblioteca del codigo aun no este publicada.',
        cta: 'Abrir ayuda sobre ordenanzas y permisos',
        href: '#records-request',
      },
    ],
  },
};

@Component({
  selector: 'app-records-center',
  templateUrl: './records-center.html',
  styleUrl: './records-center.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordsCenter {
  private readonly siteLanguageService = inject(SiteLanguageService);

  protected readonly copy = computed(
    () => RECORDS_CENTER_COPY[this.siteLanguageService.currentLanguage()],
  );
}
