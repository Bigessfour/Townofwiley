import { HttpErrorResponse } from '@angular/common/http';
import { isAmplifyAuthFailure } from './auth/staff-auth-error';
import { isExpectedNetworkDegradation } from './network-degradation';

/** HTTP statuses that features handle inline (no global toast). */
const CLIENT_HTTP_STATUSES = new Set([400, 401, 403, 404, 409, 422]);

const BENIGN_ERROR_NAMES = new Set([
  'AbortError',
  'CanceledError',
  'ChunkLoadError',
  'ExpressionChangedAfterItHasBeenCheckedError',
]);

const BENIGN_MESSAGE_SNIPPETS = [
  'loading chunk',
  'failed to fetch dynamically imported module',
  'dynamically imported module',
  'resizeobserver loop',
  'script error',
  'cancelled',
  'canceled',
  'navigation canceling',
  'navigation was canceled',
] as const;

const THIRD_PARTY_STACK_SNIPPETS = [
  'googletagmanager.com',
  'google-analytics.com',
  'easy-peasy',
  'chrome-extension://',
  'moz-extension://',
] as const;

const OPERATIONAL_ERROR_NAMES = new Set([
  'TypeError',
  'ReferenceError',
  'RangeError',
  'InternalError',
  'EvalError',
]);

/**
 * Whether an uncaught error should surface the global PrimeNG error toast.
 * Default is suppress; only clearly operational application faults toast.
 */
export function shouldShowGlobalErrorToast(error: unknown, route = ''): boolean {
  if (shouldSuppressGlobalErrorToast(error, route)) {
    return false;
  }

  return isLikelyOperationalFault(error);
}

/** Log-only paths: expected degradation, auth, HTTP client errors, browser noise, third parties. */
export function shouldSuppressGlobalErrorToast(error: unknown, route = ''): boolean {
  if (isExpectedNetworkDegradation(error)) {
    return true;
  }

  if (isAmplifyAuthFailure(error)) {
    return true;
  }

  if (error instanceof HttpErrorResponse) {
    if (CLIENT_HTTP_STATUSES.has(error.status)) {
      return true;
    }
    if (error.status >= 500 && error.status < 600) {
      return isExpectedNetworkDegradation(error);
    }
  }

  if (route.startsWith('/admin/login') || route.startsWith('/admin')) {
    if (isHandledAdminError(error)) {
      return true;
    }
  }

  if (!(error instanceof Error)) {
    return true;
  }

  if (BENIGN_ERROR_NAMES.has(error.name)) {
    return true;
  }

  if (isBenignMessage(error.message)) {
    return true;
  }

  if (isThirdPartyStack(error.stack)) {
    return true;
  }

  if (isAngularStabilityNoise(error)) {
    return true;
  }

  return false;
}

function isHandledAdminError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return true;
  }

  const message = error.message.toLowerCase();
  return (
    isAmplifyAuthFailure(error) ||
    message.includes('not authorized') ||
    message.includes('incorrect username') ||
    message.includes('password')
  );
}

function isLikelyOperationalFault(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (OPERATIONAL_ERROR_NAMES.has(error.name)) {
    return hasTownAppStackTrace(error);
  }

  if (error.name === 'Error' && hasTownAppStackTrace(error)) {
    return !isBenignMessage(error.message);
  }

  return false;
}

function isBenignMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  if (!normalized || normalized === 'script error.') {
    return true;
  }

  return BENIGN_MESSAGE_SNIPPETS.some((snippet) => normalized.includes(snippet));
}

function isThirdPartyStack(stack: string | undefined): boolean {
  if (!stack) {
    return false;
  }

  return THIRD_PARTY_STACK_SNIPPETS.some((snippet) => stack.includes(snippet));
}

function isAngularStabilityNoise(error: Error): boolean {
  const combined = `${error.name} ${error.message}`;
  return /^NG\d{4}/.test(combined) || combined.includes('NG0');
}

function hasTownAppStackTrace(error: Error): boolean {
  const stack = error.stack ?? '';
  if (!stack) {
    return typeof window !== 'undefined' && window.location.hostname.includes('townofwiley');
  }

  return (
    /townofwiley\.gov/i.test(stack) ||
    /\/src\//i.test(stack) ||
    /main-[A-Z0-9]+\.js/i.test(stack) ||
    /chunk-[A-Z0-9]+\.js/i.test(stack) ||
    /\/main\.js/i.test(stack)
  );
}
