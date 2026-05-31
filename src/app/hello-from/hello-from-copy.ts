import type { SiteLanguage } from '../site-language';

export interface HelloFromCopy {
  kicker: string;
  title: string;
  intro: string;
  mapHeading: string;
  mapHint: string;
  formHeading: string;
  countryLabel: string;
  countryPlaceholder: string;
  nameLabel: string;
  namePlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  consentLabel: string;
  submitLabel: string;
  submittingLabel: string;
  successTitle: string;
  successDetail: string;
  emptyMessages: string;
  notConfigured: string;
  anonymous: string;
  viewOnMap: string;
  honeypotLabel: string;
}

export const HELLO_FROM_COPY: Record<SiteLanguage, HelloFromCopy> = {
  en: {
    kicker: 'Visitors worldwide',
    title: 'Hello from…',
    intro:
      'Far from Wiley, Colorado? Leave a short greeting and tell us where you are visiting from. Messages appear on this page after you submit (subject to automated safety checks).',
    mapHeading: 'Greetings on the map',
    mapHint: 'Each pin is a message someone chose to share publicly.',
    formHeading: 'Add your greeting',
    countryLabel: 'I am visiting from',
    countryPlaceholder: 'Choose a country or region',
    nameLabel: 'Your name (optional)',
    namePlaceholder: 'First name or nickname',
    messageLabel: 'Your message',
    messagePlaceholder: 'Hello from Ireland — glad to explore Wiley online!',
    consentLabel:
      'I agree this greeting may be shown publicly on townofwiley.gov (see our privacy notice).',
    submitLabel: 'Share greeting',
    submittingLabel: 'Sending…',
    successTitle: 'Thank you',
    successDetail: 'Your greeting was added to the map.',
    emptyMessages: 'Be the first to say hello from your part of the world.',
    notConfigured: 'The guestbook is not available on this environment yet.',
    anonymous: 'Anonymous',
    viewOnMap: 'View on map',
    honeypotLabel: 'Leave blank',
  },
  es: {
    kicker: 'Visitantes de todo el mundo',
    title: 'Saludos desde…',
    intro:
      '¿Lejos de Wiley, Colorado? Deje un saludo breve y díganos desde dónde nos visita. Los mensajes aparecen en esta página después de enviarlos (con controles automáticos de seguridad).',
    mapHeading: 'Saludos en el mapa',
    mapHint: 'Cada pin es un mensaje que alguien eligió compartir en público.',
    formHeading: 'Agregue su saludo',
    countryLabel: 'Visito desde',
    countryPlaceholder: 'Elija un país o región',
    nameLabel: 'Su nombre (opcional)',
    namePlaceholder: 'Nombre o apodo',
    messageLabel: 'Su mensaje',
    messagePlaceholder: '¡Saludos desde Irlanda — me alegra conocer Wiley en línea!',
    consentLabel:
      'Acepto que este saludo se muestre en público en townofwiley.gov (consulte el aviso de privacidad).',
    submitLabel: 'Compartir saludo',
    submittingLabel: 'Enviando…',
    successTitle: 'Gracias',
    successDetail: 'Su saludo se agregó al mapa.',
    emptyMessages: 'Sea la primera persona en saludar desde su rincón del mundo.',
    notConfigured: 'El libro de visitas aún no está disponible en este entorno.',
    anonymous: 'Anónimo',
    viewOnMap: 'Ver en el mapa',
    honeypotLabel: 'Dejar en blanco',
  },
};

export const HELLO_FROM_ADMIN_COPY = {
  en: {
    kicker: 'Staff only',
    title: 'Hello-from visitor log',
    intro:
      'Page visits and public greetings stored by the guestbook service. Locations are coarse (country or region from network routing), not GPS.',
    signInHint: 'Sign in at /admin/login to load logs.',
    loadError: 'Could not load visitor logs.',
    empty: 'No visits logged yet.',
    kindVisit: 'Page visit',
    kindMessage: 'Greeting',
    columns: {
      when: 'When',
      kind: 'Type',
      location: 'Location',
      message: 'Message',
      page: 'Page',
      source: 'Geo source',
    },
    backToAdmin: 'Town admin hub',
    refresh: 'Refresh',
    exportCsv: 'Download CSV',
  },
  es: {
    kicker: 'Solo personal',
    title: 'Registro de visitantes (Hello-from)',
    intro:
      'Visitas a la página y saludos públicos guardados por el servicio. La ubicación es aproximada (país o región de la red), no GPS.',
    signInHint: 'Inicie sesión en /admin/login para cargar registros.',
    loadError: 'No se pudieron cargar los registros.',
    empty: 'Aún no hay visitas registradas.',
    kindVisit: 'Visita',
    kindMessage: 'Saludo',
    columns: {
      when: 'Fecha',
      kind: 'Tipo',
      location: 'Ubicación',
      message: 'Mensaje',
      page: 'Página',
      source: 'Fuente geo',
    },
    backToAdmin: 'Centro administrativo',
    refresh: 'Actualizar',
    exportCsv: 'Descargar CSV',
  },
} as const;
