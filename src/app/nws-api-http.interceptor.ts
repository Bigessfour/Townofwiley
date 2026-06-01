import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { timer, throwError } from 'rxjs';
import { mergeMap, retryWhen } from 'rxjs/operators';

/** Origin for National Weather Service api.weather.gov (see https://www.weather.gov/documentation/services-web-api). */
const NWS_API_ORIGIN = 'https://api.weather.gov';

/** Initial try plus retries (aligned with `NWS_RETRY_MAX_ATTEMPTS` on the AWS proxy). */
const NWS_CLIENT_MAX_ATTEMPTS = 4;

const NWS_CLIENT_RETRY_BASE_MS = 1000;
const NWS_CLIENT_RETRY_MAX_DELAY_MS = 20_000;

function addJitterMs(baseMs: number): number {
  const cap = Math.min(500, Math.floor(baseMs * 0.2));
  const jitter = cap > 0 ? Math.floor(Math.random() * (cap + 1)) : 0;
  return baseMs + jitter;
}

function parseRetryAfterMs(headers: { get(name: string): string | null }): number | null {
  const raw = headers.get('Retry-After');
  if (!raw) return null;
  const trimmed = raw.trim();
  const asInt = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(asInt) && String(asInt) === trimmed) {
    return Math.min(Math.max(0, asInt) * 1000, NWS_CLIENT_RETRY_MAX_DELAY_MS);
  }
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    return Math.min(Math.max(0, dateMs - Date.now()), NWS_CLIENT_RETRY_MAX_DELAY_MS);
  }
  return null;
}

function isTransientNwsStatus(status: number): boolean {
  return (
    status === 0 ||
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function exponentialBackoffMs(attemptIndex: number): number {
  const raw = NWS_CLIENT_RETRY_BASE_MS * 2 ** Math.max(0, attemptIndex);
  const capped = Math.min(raw, NWS_CLIENT_RETRY_MAX_DELAY_MS);
  return addJitterMs(capped);
}

function computeRetryDelayMs(error: HttpErrorResponse, retryCountZeroBased: number): number {
  if (error.status === 429) {
    const fromHeader = parseRetryAfterMs(error.headers);
    if (fromHeader != null) {
      return addJitterMs(Math.max(NWS_CLIENT_RETRY_BASE_MS, fromHeader));
    }
  }
  return exponentialBackoffMs(retryCountZeroBased);
}

/**
 * Sends `Accept: application/geo+json` on browser-direct NWS calls so content negotiation
 * matches the AWS proxy (`infrastructure/nws-weather-proxy/index.mjs`) and NWS “Formats”.
 */
export const nwsApiHttpInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(NWS_API_ORIGIN)) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Accept: 'application/geo+json',
      },
    }),
  );
};

/**
 * Retries transient NWS failures (429, 5xx, unknown status) with exponential backoff and
 * optional `Retry-After` for 429, matching proxy behavior for browser fallback traffic.
 */
export const nwsApiRetryInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(NWS_API_ORIGIN)) {
    return next(req);
  }

  return next(req).pipe(
    retryWhen((errors) =>
      errors.pipe(
        mergeMap((error: unknown, failureIndex) => {
          if (failureIndex >= NWS_CLIENT_MAX_ATTEMPTS - 1) {
            return throwError(() => error);
          }
          if (!(error instanceof HttpErrorResponse)) {
            return throwError(() => error);
          }
          if (!isTransientNwsStatus(error.status)) {
            return throwError(() => error);
          }
          const delayMs = computeRetryDelayMs(error, failureIndex);
          return timer(delayMs);
        }),
      ),
    ),
  );
};
