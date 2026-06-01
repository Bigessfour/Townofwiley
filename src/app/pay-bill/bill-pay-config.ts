import { getContactUpdateRuntimeConfig } from '../contact-update/contact-update-config';

interface RuntimeBillPayConfig {
  apiEndpoint: string;
}

/** @deprecated Use contactUpdate.apiEndpoint — billing intake shares the contact-update Lambda. */
export function getBillPayRuntimeConfig(): RuntimeBillPayConfig {
  return getContactUpdateRuntimeConfig();
}
