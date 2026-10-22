import type { SiteLanguage } from '../site-language';
import type { PolicyPageCopy } from './app-copy.types';

export const WEATHER_ALERT_POLICY_COPY: Record<
  SiteLanguage,
  { privacy: PolicyPageCopy; terms: PolicyPageCopy }
> = {
  en: {
    privacy: {
      lastUpdatedLabel: 'Last updated',
      lastUpdatedDate: 'May 6, 2026',
      kicker: 'Privacy',
      title: 'Weather alert privacy notice',
      intro:
        'This notice explains how the Town of Wiley uses the phone numbers and email addresses submitted through the severe weather alert signup form.',
      items: [
        {
          title: 'Information we collect',
          detail:
            'We collect the destination you enter, your preferred language, ZIP code 81092, and any optional name you provide when you request weather alerts.',
        },
        {
          title: 'How the information is used',
          detail:
            'The Town uses this information only to send signup confirmations, severe weather alerts, and alert-management links related to Wiley weather notifications.',
        },
        {
          title: 'Storage and sharing',
          detail:
            'Subscriber data is stored in AWS services that support the weather alert program. The Town does not sell this information or use it for unrelated marketing.',
        },
        {
          title: 'How to remove your information',
          detail:
            'You can unsubscribe at any time from the alert management link after signup. You can also contact Town Hall at (719) 829-4974 for assistance.',
        },
      ],
    },
    terms: {
      lastUpdatedLabel: 'Last updated',
      lastUpdatedDate: 'May 6, 2026',
      kicker: 'SMS Terms',
      title: 'Weather alert SMS terms',
      intro:
        'These terms apply when you sign up for Town of Wiley severe weather alerts by text message.',
      items: [
        {
          title: 'Consent to receive messages',
          detail:
            'By submitting your mobile number, you agree to receive transactional severe weather alerts and signup confirmations for ZIP code 81092.',
        },
        {
          title: 'Message frequency and charges',
          detail:
            'Message frequency varies with National Weather Service activity, confirmation steps, and account changes. Message and data rates may apply.',
        },
        {
          title: 'How to opt out or get help',
          detail:
            'Reply STOP to end text alerts. Reply HELP for help, or contact Town Hall at (719) 829-4974.',
        },
        {
          title: 'Program scope',
          detail:
            'These messages are public-safety and service-impact alerts for Wiley weather conditions. They are not promotional marketing texts.',
        },
      ],
    },
  },
  es: {
    privacy: {
      lastUpdatedLabel: 'Ultima actualizacion',
      lastUpdatedDate: '6 de mayo de 2026',
      kicker: 'Privacidad',
      title: 'Aviso de privacidad para alertas del clima',
      intro:
        'Este aviso explica como el Pueblo de Wiley usa los numeros de telefono y correos electronicos enviados mediante el formulario de alertas de clima severo.',
      items: [
        {
          title: 'Informacion que recopilamos',
          detail:
            'Recopilamos el destino que usted ingresa, su idioma preferido, el codigo postal 81092 y cualquier nombre opcional que proporcione al solicitar alertas del clima.',
        },
        {
          title: 'Como se usa la informacion',
          detail:
            'El Pueblo usa esta informacion solo para enviar confirmaciones de registro, alertas de clima severo y enlaces para administrar alertas relacionadas con notificaciones meteorologicas de Wiley.',
        },
        {
          title: 'Almacenamiento y uso compartido',
          detail:
            'Los datos de suscriptores se almacenan en servicios de AWS que respaldan el programa de alertas del clima. El Pueblo no vende esta informacion ni la usa para mercadotecnia no relacionada.',
        },
        {
          title: 'Como eliminar su informacion',
          detail:
            'Puede cancelar la suscripcion en cualquier momento desde el enlace de administracion de alertas despues del registro. Tambien puede llamar al Ayuntamiento al (719) 829-4974 para obtener ayuda.',
        },
      ],
    },
    terms: {
      lastUpdatedLabel: 'Ultima actualizacion',
      lastUpdatedDate: '6 de mayo de 2026',
      kicker: 'Terminos SMS',
      title: 'Terminos de SMS para alertas del clima',
      intro:
        'Estos terminos se aplican cuando usted se suscribe por mensaje de texto a las alertas de clima severo del Pueblo de Wiley.',
      items: [
        {
          title: 'Consentimiento para recibir mensajes',
          detail:
            'Al enviar su numero celular, usted acepta recibir alertas transaccionales de clima severo y confirmaciones de registro para el codigo postal 81092.',
        },
        {
          title: 'Frecuencia y cargos',
          detail:
            'La frecuencia de mensajes varia segun la actividad del Servicio Nacional de Meteorologia, los pasos de confirmacion y los cambios en su cuenta. Pueden aplicarse tarifas de mensajes y datos.',
        },
        {
          title: 'Como cancelar o pedir ayuda',
          detail:
            'Responda STOP para terminar las alertas por texto. Responda HELP para obtener ayuda, o llame al Ayuntamiento al (719) 829-4974.',
        },
        {
          title: 'Alcance del programa',
          detail:
            'Estos mensajes son alertas de seguridad publica e impacto en servicios por condiciones meteorologicas de Wiley. No son mensajes promocionales.',
        },
      ],
    },
  },
};
