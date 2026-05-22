import { describe, expect, it } from 'vitest';
import {
  PAYSTAR_EMBEDDED_SESSION_ROUTES,
  PAYSTAR_EMBEDDED_SESSION_PLAN,
  PAYSTAR_EMBEDDED_GATEWAY_BASES,
} from './paystar-embedded-contract';

describe('paystar-embedded-contract', () => {
  it('documents all seven embedded session routes from Paystar spec', () => {
    expect(PAYSTAR_EMBEDDED_SESSION_ROUTES.payment).toBe('/integrations/embedded/initiate');
    expect(PAYSTAR_EMBEDDED_SESSION_ROUTES.autopay).toBe(
      '/integrations/embedded/initiate-manage-autopay',
    );
    expect(PAYSTAR_EMBEDDED_SESSION_ROUTES.paperless).toBe(
      '/integrations/embedded/initiate-manage-paperless',
    );
    expect(PAYSTAR_EMBEDDED_SESSION_ROUTES.oneTimeScheduledPayment).toBe(
      '/integrations/embedded/initiate-schedule-payment-session',
    );
    expect(PAYSTAR_EMBEDDED_SESSION_ROUTES.manageScheduledPayments).toBe(
      '/integrations/embedded/initiate-manage-schedule-payments',
    );
    expect(PAYSTAR_EMBEDDED_SESSION_ROUTES.wallet).toBe(
      '/integrations/embedded/initiate-manage-wallet',
    );
    expect(PAYSTAR_EMBEDDED_SESSION_ROUTES.notifications).toBe(
      '/integrations/embedded/initiate-manage-notifications',
    );
  });

  it('marks payment as planned-imminent for Town rollout', () => {
    expect(PAYSTAR_EMBEDDED_SESSION_PLAN.payment.status).toBe('planned-imminent');
  });

  it('lists official gateway base URLs', () => {
    expect(PAYSTAR_EMBEDDED_GATEWAY_BASES.staging).toBe('https://stage-gateway.paystar.io');
    expect(PAYSTAR_EMBEDDED_GATEWAY_BASES.production).toBe('https://gateway.paystar.io');
  });
});
