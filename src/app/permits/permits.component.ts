import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import {
  LocalizedCmsContentStore,
  OFFICIAL_CONTACT_ID_CITY_CLERK,
  OFFICIAL_CONTACT_ID_TOWN_INFORMATION,
} from '../site-cms-content';
import { type SiteLanguage, SiteLanguageService } from '../site-language';

interface PermitsCopy {
  kicker: string;
  heading: string;
  intro: string;
  clerkSectionHeading: string;
  emailLabel: string;
  emailAriaLabel: string;
  callLabel: string;
  callAriaLabel: string;
  noClerkFallback: string;
  backToServicesLabel: string;
  backToServicesAriaLabel: string;
}

const PERMITS_COPY: Record<SiteLanguage, PermitsCopy> = {
  en: {
    kicker: 'Town Hall services',
    heading: 'Permits & Inquiries',
    intro:
      "The Town of Wiley does not currently process permits online. For questions about building permits, zoning, or licenses, please contact the city or Town Clerk's office directly.",
    clerkSectionHeading: 'Town Clerk',
    emailLabel: 'Email Clerk',
    emailAriaLabel: 'Email the Town Clerk',
    callLabel: 'Call',
    callAriaLabel: 'Call Town Hall',
    noClerkFallback:
      'Town Clerk contact information is being updated. Please call Town Hall at (719) 829-4974 for permit, zoning, or license questions.',
    backToServicesLabel: 'Back to Services',
    backToServicesAriaLabel: 'Back to Resident Services',
  },
  es: {
    kicker: 'Servicios del Ayuntamiento',
    heading: 'Permisos e Indagaciones',
    intro:
      'El Pueblo de Wiley no procesa permisos en linea actualmente. Para preguntas sobre permisos de construccion, zonificacion o licencias, por favor contacte directamente al Secretario del Pueblo.',
    clerkSectionHeading: 'Secretario del Pueblo',
    emailLabel: 'Email al Secretario',
    emailAriaLabel: 'Enviar correo al Secretario',
    callLabel: 'Llamar',
    callAriaLabel: 'Llamar al Ayuntamiento',
    noClerkFallback:
      'La informacion de contacto del Secretario se esta actualizando. Llame al Ayuntamiento al (719) 829-4974 para preguntas sobre permisos, zonificacion o licencias.',
    backToServicesLabel: 'Volver a Servicios',
    backToServicesAriaLabel: 'Volver a Servicios para residentes',
  },
};

@Component({
  selector: 'app-permits',
  imports: [RouterModule, CardModule],
  templateUrl: './permits.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermitsComponent {
  private cmsStore = inject(LocalizedCmsContentStore);
  private langService = inject(SiteLanguageService);

  protected readonly copy = computed(
    () => PERMITS_COPY[this.langService.currentLanguage() || 'en'],
  );
  protected readonly contacts = computed(() => this.cmsStore.contacts());
  protected readonly clerkContact = computed(() =>
    this.contacts().find((c) => c.id === OFFICIAL_CONTACT_ID_CITY_CLERK),
  );
  protected readonly clerkEmail = computed(() =>
    this.clerkContact()?.href?.replace('mailto:', ''),
  );
  protected readonly townPhone = computed(() =>
    this.contacts()
      .find((c) => c.id === OFFICIAL_CONTACT_ID_TOWN_INFORMATION)
      ?.href?.replace('tel:', ''),
  );
}
