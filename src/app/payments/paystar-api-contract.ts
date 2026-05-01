/**
 * Contract between the Angular app and the town-managed Paystar proxy (e.g. API Gateway + Lambda).
 * This is not the vendor’s private OpenAPI — shapes follow our UX and can be remapped inside the proxy
 * once Paystar documents request/response fields for your tenant.
 *
 * Public product overview (hosted portal, REST, webhooks, Embedded SDK): https://docs.paystar.io/
 */
import type { SiteLanguage } from '../site-language';

/**
 * Public Paystar product documentation (no auth). Use for staff-facing links and proxy error payloads.
 * @see https://docs.paystar.io/
 */
export const PAYSTAR_PUBLIC_DOCS_URL = 'https://docs.paystar.io/';

/** Phases we implement on the town side; exact REST paths come from Paystar after credentials are issued. */
export const PAYSTAR_INTEGRATION_PHASES = [
  'hosted_portal',
  'town_proxy_launch',
  'upstream_rest_launch',
  'receipt_query',
  'webhooks_ingest',
  'embedded_sdk',
] as const;

export type PaystarIntegrationPhase = (typeof PAYSTAR_INTEGRATION_PHASES)[number];

/** Body the browser sends to `payments.paystar.apiEndpoint` (POST). */
export interface PaystarProxyLaunchPayload {
  residentName: string;
  serviceAddress: string;
  accountNumber?: string;
  amount?: number;
  /** Whole dollars from the form; Lambda/proxy may convert to cents for Paystar. */
  amountInCents?: number;
  preferredContact: string;
  accountQuestion?: string;
  locale: SiteLanguage;
  source: 'resident-services' | 'payments-page';
  dueDate?: string;
  invoiceNumber?: string;
  billSummary?: string;
}

/** Normalized response from the town proxy after a successful launch/session create. */
export interface PaystarProxyLaunchResponse {
  provider: 'paystar';
  mode: 'hosted' | 'api';
  launchUrl: string;
  referenceId?: string;
  expiresAt?: string;
}
