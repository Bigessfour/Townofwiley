import type { SiteLanguage } from '../site-language';

export const PREFERRED_BILL_PAY_CONTACT_VALUES = ['email', 'phone', 'sms', 'mail'] as const;

export type PreferredBillPayContact = (typeof PREFERRED_BILL_PAY_CONTACT_VALUES)[number];

export type BillPayIntakeSource = 'pay-bill-page' | 'resident-services';

export interface BillPayRequest {
  fullName: string;
  serviceAddress: string;
  accountNumber: string;
  email: string;
  phone: string;
  preferredContactMethod: PreferredBillPayContact;
  notes: string;
  consentToContact: boolean;
  locale: SiteLanguage;
  source: BillPayIntakeSource;
}

export type BillPaySubmitResult =
  | { outcome: 'api-success' }
  | { outcome: 'mailto'; href: string }
  | { outcome: 'api-failure-mailto'; href: string };

/**
 * Default Quick Pay target when `__TOW_RUNTIME_CONFIG__.payments.paystar.portalUrl` is unset.
 * Replace with the final hosted Paystar URL via runtime config when Paystar provides it.
 */
export const PAY_BILL_QUICK_PAY_PORTAL_PLACEHOLDER_URL =
  'https://secure.paystar.io/pay/townofwiley-utility';
