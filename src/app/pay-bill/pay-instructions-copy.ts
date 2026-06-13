export interface PayInstructionsCopy {
  imageSrc: string;
  imageAlt: string;
}

const PAY_INSTRUCTIONS_EN: PayInstructionsCopy = {
  imageSrc: '/pay-bill-instructions-en.jpg',
  imageAlt:
    'How to Pay Your Utility Bill via Paystar: find your account number on your mailed bill; click Pay Your Bill on townofwiley.gov; a secure Paystar window opens; enter your account number; enter the first three letters of your first or business name; pay with card or ACH; save your receipt. You are leaving townofwiley.gov. Paystar is a secure third-party service. Convenience fees may apply.',
};

const PAY_INSTRUCTIONS_ES: PayInstructionsCopy = {
  imageSrc: '/pay-bill-instructions-es.jpg',
  imageAlt:
    'Cómo Pagar Su Factura de Servicios Públicos con Paystar: encuentre su número de cuenta en la factura por correo; haga clic en Pague Su Factura en townofwiley.gov; se abre una ventana segura de Paystar; ingrese su número de cuenta; ingrese las primeras tres letras de su nombre o empresa; pague con tarjeta o ACH; guarde su recibo. Está saliendo de townofwiley.gov. Paystar es un servicio seguro de terceros. Pueden aplicarse tarifas de conveniencia.',
};

export function payInstructionsCopy(lang: 'en' | 'es'): PayInstructionsCopy {
  return lang === 'es' ? PAY_INSTRUCTIONS_ES : PAY_INSTRUCTIONS_EN;
}
