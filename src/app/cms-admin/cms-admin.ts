import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguage, SiteLanguageService } from '../site-language';

interface CmsAdminCopy {
  kicker: string;
  title: string;
  intro: string;
  returnHome: string;
  openAmplify: string;
  statusAriaLabel: string;
  loadingStatus: string;
  heroKicker: string;
  heroSummary: string;
  bannerKicker: string;
  bannerEnabled: string;
  bannerHidden: string;
  bannerSummary: string;
  noticesKicker: string;
  noticesSummary: string;
  noticesCountSuffix: string;
  contactsKicker: string;
  contactsSummary: string;
  contactsCountSuffix: string;
  publishingKicker: string;
  publishingTitle: string;
  publishingSteps: string[];
  modelMapKicker: string;
  modelMapTitle: string;
  modelMapItems: string[];
  routeKicker: string;
  routeTitle: string;
  routeBody: string;
  snapshotKicker: string;
  snapshotChecklist: string[];
}

const CMS_ADMIN_COPY: Record<SiteLanguage, CmsAdminCopy> = {
  en: {
    kicker: 'Amplify Studio CMS',
    title: 'Amplify Studio is the only CMS for homepage publishing',
    intro:
      'Browser-local editing has been disabled. Homepage text, the alert banner, notice cards, and public contact cards now come only from Amplify Studio and AppSync.',
    returnHome: 'Return to homepage',
    openAmplify: 'Open Amplify Console',
    statusAriaLabel: 'CMS status',
    loadingStatus: 'Refreshing the current homepage snapshot from Amplify Studio.',
    heroKicker: 'Hero',
    heroSummary: 'Current homepage title loaded from the shared CMS.',
    bannerKicker: 'Banner',
    bannerEnabled: 'Banner is enabled in Amplify Studio',
    bannerHidden: 'Banner is hidden in Amplify Studio',
    bannerSummary: 'Controlled by the AlertBanner model in Amplify Studio.',
    noticesKicker: 'Notices',
    noticesSummary: 'These come from the Announcement model.',
    noticesCountSuffix: 'notice cards',
    contactsKicker: 'Contacts',
    contactsSummary: 'These come from the OfficialContact model.',
    contactsCountSuffix: 'public contacts',
    publishingKicker: 'Publishing Flow',
    publishingTitle: 'How to update the homepage now',
    publishingSteps: [
      'Open Amplify Studio from the AWS console.',
      'Update the SiteSettings, AlertBanner, Announcement, or OfficialContact record.',
      'Save the record in Studio.',
      'Refresh the public homepage and confirm the change.',
    ],
    modelMapKicker: 'Model Map',
    modelMapTitle: 'Which Studio models control which parts of the homepage',
    modelMapItems: [
      'SiteSettings: homepage title, hero copy, welcome text',
      'AlertBanner: emergency banner visibility and text',
      'Announcement: notice cards on the homepage',
      'OfficialContact: public contact cards',
    ],
    routeKicker: 'Read-only Admin Route',
    routeTitle: 'This page is now a CMS operations guide, not an editor',
    routeBody:
      'The old browser-only CMS path has been removed so homepage content cannot drift by device or browser session.',
    snapshotKicker: 'Current Snapshot',
    snapshotChecklist: [
      'Refresh this page after Studio edits to confirm the latest public content.',
      'If content does not change, verify the AppSync runtime config and the saved Studio record.',
      'Use the public homepage as the final verification surface for residents.',
    ],
  },
  es: {
    kicker: 'CMS de Amplify Studio',
    title: 'Amplify Studio es el unico CMS para publicar la pagina principal',
    intro:
      'La edicion local en el navegador fue deshabilitada. El texto de la pagina principal, el banner de alerta, las tarjetas de avisos y las tarjetas de contacto publico ahora vienen solo de Amplify Studio y AppSync.',
    returnHome: 'Volver a la pagina principal',
    openAmplify: 'Abrir Amplify Console',
    statusAriaLabel: 'Estado del CMS',
    loadingStatus: 'Actualizando la captura actual de la pagina principal desde Amplify Studio.',
    heroKicker: 'Hero',
    heroSummary: 'Titulo actual de la pagina principal cargado desde el CMS compartido.',
    bannerKicker: 'Banner',
    bannerEnabled: 'El banner esta habilitado en Amplify Studio',
    bannerHidden: 'El banner esta oculto en Amplify Studio',
    bannerSummary: 'Controlado por el modelo AlertBanner en Amplify Studio.',
    noticesKicker: 'Avisos',
    noticesSummary: 'Estos provienen del modelo Announcement.',
    noticesCountSuffix: 'tarjetas de avisos',
    contactsKicker: 'Contactos',
    contactsSummary: 'Estos provienen del modelo OfficialContact.',
    contactsCountSuffix: 'contactos publicos',
    publishingKicker: 'Flujo de publicacion',
    publishingTitle: 'Como actualizar ahora la pagina principal',
    publishingSteps: [
      'Abra Amplify Studio desde la consola de AWS.',
      'Actualice el registro de SiteSettings, AlertBanner, Announcement u OfficialContact.',
      'Guarde el registro en Studio.',
      'Actualice la pagina principal publica y confirme el cambio.',
    ],
    modelMapKicker: 'Mapa de modelos',
    modelMapTitle: 'Que modelos de Studio controlan cada parte de la pagina principal',
    modelMapItems: [
      'SiteSettings: titulo de la pagina principal, texto hero y bienvenida',
      'AlertBanner: visibilidad y texto del banner de emergencia',
      'Announcement: tarjetas de avisos en la pagina principal',
      'OfficialContact: tarjetas de contacto publico',
    ],
    routeKicker: 'Ruta administrativa de solo lectura',
    routeTitle: 'Esta pagina ahora es una guia operativa del CMS, no un editor',
    routeBody:
      'La antigua ruta del CMS solo en el navegador fue eliminada para que el contenido de la pagina principal no cambie por dispositivo o sesion.',
    snapshotKicker: 'Captura actual',
    snapshotChecklist: [
      'Actualice esta pagina despues de editar en Studio para confirmar el contenido publico mas reciente.',
      'Si el contenido no cambia, verifique la configuracion de tiempo de ejecucion de AppSync y el registro guardado en Studio.',
      'Use la pagina principal publica como superficie final de verificacion para residentes.',
    ],
  },
};

@Component({
  selector: 'app-cms-admin',
  templateUrl: './cms-admin.html',
  styleUrl: './cms-admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsAdmin {
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);

  protected readonly persistenceSummary = this.cmsStore.persistenceSummary;
  protected readonly isLoading = this.cmsStore.isLoading;
  protected readonly loadError = this.cmsStore.loadError;
  protected readonly copy = computed(
    () => CMS_ADMIN_COPY[this.siteLanguageService.currentLanguage()],
  );
  protected readonly heroTitle = computed(() => this.cmsStore.hero().title);
  protected readonly heroMessage = computed(() => this.cmsStore.hero().message);
  protected readonly noticeCount = computed(() => this.cmsStore.notices().length);
  protected readonly contactCount = computed(() => this.cmsStore.contacts().length);
  protected readonly alertStatusLabel = computed(() =>
    this.cmsStore.alertBanner().enabled ? this.copy().bannerEnabled : this.copy().bannerHidden,
  );
  protected readonly studioUrl =
    'https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir';
}
