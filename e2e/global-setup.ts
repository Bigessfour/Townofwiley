import { resolveE2eEnv } from './support/resolve-e2e-env';

/**
 * Fails fast with a clear message if env resolution breaks before browsers start.
 * Logs resolved URL in CI so misconfigured repo/org variables are obvious in the log.
 */
export default function globalSetup(): void {
  const { baseURL, useRemoteBaseUrl, e2ePort } = resolveE2eEnv();

  if (process.env.CI) {
    console.log(
      `[playwright] CI serving: baseURL=${baseURL} remote=${String(useRemoteBaseUrl)} e2ePort=${e2ePort}`,
    );
  }
}
