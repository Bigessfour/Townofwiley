import { HttpErrorResponse } from '@angular/common/http';

const RETRIABLE_HTTP_STATUSES = new Set([0, 408, 429, 502, 503, 504]);

export function isExpectedNetworkDegradation(error: unknown): boolean {
  if (error instanceof HttpErrorResponse) {
    return RETRIABLE_HTTP_STATUSES.has(error.status);
  }

  if (
    error &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name: string }).name === 'TimeoutError'
  ) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('gateway timeout') ||
      message.includes('timed out') ||
      message.includes('network error') ||
      message.includes('failed to fetch')
    );
  }

  return false;
}
