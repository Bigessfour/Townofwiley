/**
 * Paystar Embedded Session API (v1.0.0) — types and route constants for Town of Wiley.
 * Vendor docs: https://docs.paystar.io/api/embedded/
 * OpenAPI: https://docs.paystar.io/redocusaurus/embedded-openapi.yaml
 * SDK (frontend, after session create): https://docs.paystar.io/api-docs/embedded/sdk-reference
 *
 * Server-side only: API key must never ship in Angular bundles. The town proxy
 * (`infrastructure/paystar-proxy/`) calls these endpoints with `X-Paystar-Api-Key`.
 */
import type { SiteLanguage } from '../site-language';

export const PAYSTAR_EMBEDDED_DOCS_URL = 'https://docs.paystar.io/api/embedded/';
export const PAYSTAR_EMBEDDED_OPENAPI_URL =
  'https://docs.paystar.io/redocusaurus/embedded-openapi.yaml';

/** Paystar gateway bases (from official docs). Proxy uses PAYSTAR_EMBEDDED_GATEWAY_BASE_URL env. */
export const PAYSTAR_EMBEDDED_GATEWAY_BASES = {
  development: 'https://dev-gateway.paystar.io',
  staging: 'https://stage-gateway.paystar.io',
  production: 'https://gateway.paystar.io',
} as const;

/**
 * Embedded session operations we may call from the town proxy.
 * Paths are relative to the gateway base (no trailing slash on base).
 */
export const PAYSTAR_EMBEDDED_SESSION_ROUTES = {
  payment: '/integrations/embedded/initiate',
  autopay: '/integrations/embedded/initiate-manage-autopay',
  paperless: '/integrations/embedded/initiate-manage-paperless',
  oneTimeScheduledPayment: '/integrations/embedded/initiate-schedule-payment-session',
  manageScheduledPayments: '/integrations/embedded/initiate-manage-schedule-payments',
  wallet: '/integrations/embedded/initiate-manage-wallet',
  notifications: '/integrations/embedded/initiate-manage-notifications',
} as const;

export type PaystarEmbeddedSessionType = keyof typeof PAYSTAR_EMBEDDED_SESSION_ROUTES;

/** Town rollout plan for each session type (update when Paystar tenant config is issued). */
export const PAYSTAR_EMBEDDED_SESSION_PLAN: Record<
  PaystarEmbeddedSessionType,
  { status: 'planned-imminent' | 'planned-future' | 'deferred'; notes: string }
> = {
  payment: {
    status: 'planned-imminent',
    notes:
      'QuickPay one-time utility payment from /pay-bill and /services. Primary integration path.',
  },
  autopay: {
    status: 'planned-future',
    notes: 'AutoPay enrollment; requires account + ClientUser with SyncAccount.',
  },
  paperless: {
    status: 'planned-future',
    notes: 'Paperless billing enrollment.',
  },
  oneTimeScheduledPayment: {
    status: 'planned-future',
    notes: 'Schedule a single future payment.',
  },
  manageScheduledPayments: {
    status: 'planned-future',
    notes: 'View/cancel scheduled payments.',
  },
  wallet: {
    status: 'deferred',
    notes: 'Saved payment methods; no ClientAccount. Evaluate after core pay flow.',
  },
  notifications: {
    status: 'deferred',
    notes: 'Email/SMS prefs in Paystar; town has separate severe-weather signup.',
  },
};

/** QuickPay vs POS — Town site uses QuickPay only unless clerk POS is added later. */
export type PaystarEmbeddedChannel = 'QuickPay' | 'POS';

export type PaystarEmbeddedPaymentMethod = 'Credit Card' | 'ACH';

export interface PaystarEmbeddedClientAccount {
  AccountNumber: string;
  SubAccountNumber?: string;
  Name?: string;
  Address?: string;
  Note?: string;
}

export interface PaystarEmbeddedClientUser {
  EmailAddress: string;
  FirstName: string;
  LastName: string;
}

export interface PaystarEmbeddedCharge {
  Amount: number;
  Description: string;
  ClientAccount?: PaystarEmbeddedClientAccount;
  CustomMeta?: Record<string, string>;
}

/** POST /integrations/embedded/initiate — https://docs.paystar.io/api/embedded/ */
export interface PaystarEmbeddedPaymentSessionRequest {
  BusinessUnitSlug: string;
  Channel: PaystarEmbeddedChannel;
  Charges: PaystarEmbeddedCharge[];
  PaymentDescriptor?: string;
  ClientReference?: string;
  PaymentMethods?: PaystarEmbeddedPaymentMethod[];
  PaymentFields?: Record<string, string>;
  CustomMeta?: Record<string, string>;
  ClientUser?: PaystarEmbeddedClientUser;
  ReturnUrl?: string;
  SuccessUrl?: string;
}

/** Shared shape for manage-* sessions (AutoPay, Paperless, schedule, etc.). */
export interface PaystarEmbeddedAccountSessionRequest {
  BusinessUnitSlug: string;
  SyncAccount: boolean;
  ClientAccount: PaystarEmbeddedClientAccount;
  ClientUser: PaystarEmbeddedClientUser;
}

export interface PaystarEmbeddedWalletSessionRequest {
  BusinessUnitSlug: string;
  ClientUser: PaystarEmbeddedClientUser;
}

export interface PaystarEmbeddedNotificationSessionRequest {
  BusinessUnitSlug: string;
  ClientUser: PaystarEmbeddedClientUser;
}

/** Standard Paystar API envelope. */
export interface PaystarEmbeddedApiEnvelope<T> {
  hasErrors: boolean;
  errors: unknown;
  data: T | null;
}

/** Payment session 200 data — field names from official spec. */
export interface PaystarEmbeddedPaymentSessionData {
  PaymentSessionIdentifier: string;
  PaymentLogInLink: string;
  Status: string;
}

/** Manage-* session 200 data. */
export interface PaystarEmbeddedManageSessionData {
  SessionLink: string;
  SessionStatus: string;
  ValidUntil: string;
}

/**
 * Browser → town proxy: extends launch payload with embedded session discriminator.
 * Implemented in `infrastructure/paystar-proxy/paystar-embedded.mjs`.
 */
export interface PaystarProxyEmbeddedSessionRequest {
  sessionType: PaystarEmbeddedSessionType;
  residentName: string;
  serviceAddress: string;
  accountNumber?: string;
  amount?: number;
  amountInCents?: number;
  preferredContact: string;
  email?: string;
  locale: SiteLanguage;
  source: 'resident-services' | 'payments-page' | 'pay-bill-page';
  returnUrl?: string;
  successUrl?: string;
}
