/**
 * Contract between the Angular app and the town-managed Paystar proxy (e.g. API Gateway + Lambda).
 * Embedded Session API types live in `paystar-embedded-contract.ts`.
 *
 * @see https://docs.paystar.io/
 * @see https://docs.paystar.io/api/embedded/
 */
import type { SiteLanguage } from '../site-language';

export {
  PAYSTAR_EMBEDDED_DOCS_URL,
  PAYSTAR_EMBEDDED_OPENAPI_URL,
  PAYSTAR_EMBEDDED_GATEWAY_BASES,
  PAYSTAR_EMBEDDED_SESSION_ROUTES,
  PAYSTAR_EMBEDDED_SESSION_PLAN,
  type PaystarEmbeddedSessionType,
  type PaystarProxyEmbeddedSessionRequest,
} from './paystar-embedded-contract';

/**
 * Public Paystar product documentation (no auth). Use for staff-facing links and proxy error payloads.
 * @see https://docs.paystar.io/
 */
export const PAYSTAR_PUBLIC_DOCS_URL = 'https://docs.paystar.io/';

/** Phases we implement on the town side; exact REST paths come from Paystar after credentials are issued. */
export const PAYSTAR_INTEGRATION_PHASES = [
  'hosted_portal',
  'town_proxy_launch',
  'paystar_embedded_sessions',
  'upstream_rest_launch_legacy',
  'receipt_query',
  'webhooks_ingest',
  'embedded_sdk_ui',
] as const;

export type PaystarIntegrationPhase = (typeof PAYSTAR_INTEGRATION_PHASES)[number];

/**
 * Body the browser sends to `payments.paystar.apiEndpoint` (POST).
 * For Embedded API, include `sessionType` (see `PaystarProxyEmbeddedSessionRequest`).
 */
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
