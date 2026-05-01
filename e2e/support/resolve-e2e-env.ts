export interface ResolvedE2eEnv {
  readonly baseURL: string;
  readonly useRemoteBaseUrl: boolean;
  readonly e2ePort: string;
}

/** Full absolute URL for remote / deployed runs (http or https). */
const REMOTE_URL = /^https?:\/\/.+/i;

/**
 * Single source of truth for Playwright base URL and local dev server port.
 * Hardens against empty or typo env values that previously produced broken baseURL
 * and made every test fail (e.g. E2E_BASE_URL="", E2E_PORT="").
 */
export function resolveE2eEnv(): ResolvedE2eEnv {
  const rawBase = process.env.E2E_BASE_URL;
  const trimmedBase = (rawBase ?? '').trim();
  const useRemoteBaseUrl = trimmedBase.length > 0 && REMOTE_URL.test(trimmedBase);

  if (trimmedBase.length > 0 && !useRemoteBaseUrl) {
    const msg = [
      'E2E_BASE_URL must be a full http(s) URL when set.',
      `Received: ${JSON.stringify(rawBase)}.`,
      'Unset E2E_BASE_URL to use the local Angular dev server (CI default).',
    ].join(' ');
    if (process.env.CI) {
      throw new Error(`[e2e] ${msg}`);
    }
    console.warn(`[e2e] ${msg} Falling back to local server.`);
  }

  const rawPort = (process.env.E2E_PORT ?? '').trim();
  const e2ePort = rawPort === '' ? '4300' : /^\d{1,5}$/.test(rawPort) ? rawPort : 'INVALID';

  if (e2ePort === 'INVALID') {
    throw new Error(
      `[e2e] E2E_PORT must be empty (default 4300) or a numeric port; got ${JSON.stringify(process.env.E2E_PORT)}`,
    );
  }

  const portNum = Number(e2ePort);
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    throw new Error(`[e2e] E2E_PORT out of range 1–65535: ${JSON.stringify(e2ePort)}`);
  }

  const baseURL = useRemoteBaseUrl ? trimmedBase : `http://127.0.0.1:${e2ePort}`;

  if (!/^https?:\/\/.+/i.test(baseURL)) {
    throw new Error(`[e2e] Internal error: rejected baseURL ${JSON.stringify(baseURL)}`);
  }

  return { baseURL, useRemoteBaseUrl, e2ePort };
}
