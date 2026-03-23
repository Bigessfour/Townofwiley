import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DOCUMENT_HUB_LINKS } from '../document-hub/document-links';
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

export const RECORDS_CENTER_COPY: Record<SiteLanguage, RecordsCenterCopy> = {
  en: {
    kicker: 'Document Center',
    title: 'Open stable public document destinations while the full archive keeps growing',
    guides: [
      {
        id: 'records-guide-foia',
        kicker: 'Records Requests',
        title: 'Public records and FOIA guide',
        detail:
          'Use the public document hub for records-request instructions, accessible-copy follow-up, and the clerk route for files that are not posted yet.',
        cta: 'Open records request destination',
        href: DOCUMENT_HUB_LINKS.requests,
      },
      {
        id: 'records-guide-packets',
        kicker: 'Meeting Documents',
        title: 'Find meeting packets and approved minutes',
        detail:
          'Open the meeting-documents destination for council packets, approved minutes, agenda timing, and recurring calendar access in one public place.',
        cta: 'Open meeting documents destination',
        href: DOCUMENT_HUB_LINKS.meetings,
      },
      {
        id: 'records-guide-budgets',
        kicker: 'Financial Documents',
        title: 'Find budget summaries and annual reports',
        detail:
          'Open the finance-document destination for budget summaries, annual reports, and the clerk follow-up path for files that are still being posted.',
        cta: 'Open finance documents destination',
        href: DOCUMENT_HUB_LINKS.finance,
      },
      {
        id: 'records-guide-ordinances',
        kicker: 'Code and Zoning',
        title: 'Locate ordinances and zoning guidance',
        detail:
          'Open the ordinance and code destination for municipal-code lookups, zoning references, and permit-support follow-up instead of falling back to email-only guidance.',
        cta: 'Open ordinance and code destination',
        href: DOCUMENT_HUB_LINKS.code,
      },
    ],
  },
  es: {
    kicker: 'Centro de documentos',
    title: 'Abra destinos publicos estables mientras el archivo completo sigue creciendo',
    guides: [
      {
        id: 'records-guide-foia',
        kicker: 'Solicitudes de registros',
        title: 'Guia de registros publicos y FOIA',
        detail:
          'Use el centro publico de documentos para instrucciones de solicitud, copias accesibles y la ruta de secretaria para archivos que todavia no estan publicados.',
        cta: 'Abrir destino de solicitud de registros',
        href: DOCUMENT_HUB_LINKS.requests,
      },
      {
        id: 'records-guide-packets',
        kicker: 'Documentos de reuniones',
        title: 'Encontrar paquetes de reuniones y minutas aprobadas',
        detail:
          'Abra el destino de documentos de reuniones para paquetes del concejo, minutas aprobadas, tiempos de agenda y acceso recurrente al calendario en un solo lugar publico.',
        cta: 'Abrir destino de documentos de reuniones',
        href: DOCUMENT_HUB_LINKS.meetings,
      },
      {
        id: 'records-guide-budgets',
        kicker: 'Documentos financieros',
        title: 'Encontrar resumenes de presupuesto e informes anuales',
        detail:
          'Abra el destino de documentos financieros para resumenes de presupuesto, informes anuales y la ruta de secretaria para archivos que todavia se estan publicando.',
        cta: 'Abrir destino de documentos financieros',
        href: DOCUMENT_HUB_LINKS.finance,
      },
      {
        id: 'records-guide-ordinances',
        kicker: 'Codigo y zonificacion',
        title: 'Ubicar ordenanzas y orientacion de zonificacion',
        detail:
          'Abra el destino de ordenanzas y codigo para busquedas de codigo municipal, referencias de zonificacion y apoyo para permisos sin depender solo del correo electronico.',
        cta: 'Abrir destino de ordenanzas y codigo',
        href: DOCUMENT_HUB_LINKS.code,
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
