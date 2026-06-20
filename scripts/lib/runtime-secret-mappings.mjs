/**
 * Maps amplify-branch-env manifest env var names ↔ user-secrets.json paths.
 * Shared by user-secrets.mjs, sync-runtime-secrets.mjs, and strict runtime-config checks.
 */

/** @typedef {{ env: string; path: string[]; transform?: (value: string) => string; secret?: boolean }} RuntimeSecretMapping */

/** @type {RuntimeSecretMapping[]} */
export const runtimeSecretEnvMappings = [
  { env: 'APPSYNC_CMS_REGION', path: ['cms', 'appSync', 'region'] },
  { env: 'APPSYNC_CMS_ENDPOINT', path: ['cms', 'appSync', 'apiEndpoint'] },
  { env: 'APPSYNC_CMS_API_KEY', path: ['cms', 'appSync', 'apiKey'], secret: true },
  { env: 'NWS_PROXY_ENDPOINT', path: ['weather', 'nws', 'apiEndpoint'] },
  {
    env: 'NWS_ALLOW_BROWSER_FALLBACK',
    path: ['weather', 'nws', 'allowBrowserFallback'],
    transform: (value) => (value.trim().toLowerCase() === 'false' ? 'false' : 'true'),
  },
  {
    env: 'SEVERE_WEATHER_SIGNUP_ENABLED',
    path: ['weather', 'alertSignup', 'enabled'],
    transform: (value) => (value.trim().toLowerCase() === 'true' ? 'true' : 'false'),
  },
  {
    env: 'SEVERE_WEATHER_SIGNUP_API_ENDPOINT',
    path: ['weather', 'alertSignup', 'apiEndpoint'],
  },
  { env: 'EASYPEASY_API_ENDPOINT', path: ['chatbot', 'easyPeasy', 'apiEndpoint'] },
  { env: 'EASYPEASY_CHAT_URL', path: ['chatbot', 'easyPeasy', 'chatUrl'] },
  { env: 'EASYPEASY_BOT_PUBLIC_URL', path: ['chatbot', 'easyPeasy', 'publicUrl'] },
  { env: 'EASYPEASY_API_KEY', path: ['chatbot', 'easyPeasy', 'apiKey'], secret: true },
  { env: 'GUESTBOOK_API_ENDPOINT', path: ['guestbook', 'apiEndpoint'] },
  { env: 'PAYSTAR_PORTAL_URL', path: ['payments', 'paystar', 'portalUrl'] },
  { env: 'LOG_ENDPOINT', path: ['logging', 'endpoint'] },
  { env: 'COGNITO_USER_POOL_ID', path: ['auth', 'cognito', 'userPoolId'] },
  { env: 'COGNITO_USER_POOL_CLIENT_ID', path: ['auth', 'cognito', 'userPoolClientId'] },
  { env: 'COGNITO_IDENTITY_POOL_ID', path: ['auth', 'cognito', 'identityPoolId'] },
  { env: 'COGNITO_HOSTED_UI_DOMAIN', path: ['auth', 'cognito', 'hostedUiDomain'] },
  { env: 'STORAGE_S3_BUCKET', path: ['storage', 's3', 'bucket'] },
  { env: 'STORAGE_S3_REGION', path: ['storage', 's3', 'region'] },
];

/**
 * @param {unknown} target
 * @param {string[]} pathSegments
 */
export function getDeepValue(target, pathSegments) {
  let current = target;
  for (const segment of pathSegments) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = /** @type {Record<string, unknown>} */ (current)[segment];
  }
  return current;
}

/**
 * @param {unknown} target
 * @param {string[]} pathSegments
 * @param {unknown} value
 */
export function setDeepValue(target, pathSegments, value) {
  let current = /** @type {Record<string, unknown>} */ (target);
  for (let index = 0; index < pathSegments.length - 1; index += 1) {
    const segment = pathSegments[index];
    if (current[segment] == null || typeof current[segment] !== 'object') {
      current[segment] = {};
    }
    current = /** @type {Record<string, unknown>} */ (current[segment]);
  }
  current[pathSegments[pathSegments.length - 1]] = value;
}

/**
 * @param {Record<string, unknown>} localSecrets
 * @returns {Record<string, string>}
 */
export function envFromLocalSecrets(localSecrets) {
  /** @type {Record<string, string>} */
  const out = {};

  for (const mapping of runtimeSecretEnvMappings) {
    const raw = getDeepValue(localSecrets, mapping.path);
    if (raw === undefined || raw === null) {
      continue;
    }

    if (typeof raw === 'boolean') {
      out[mapping.env] = mapping.transform ? mapping.transform(String(raw)) : String(raw);
      continue;
    }

    const trimmed = String(raw).trim();
    if (!trimmed) {
      continue;
    }

    out[mapping.env] = mapping.transform ? mapping.transform(trimmed) : trimmed;
  }

  return out;
}

/**
 * @param {Record<string, string>} envVars
 * @param {Record<string, unknown>} localSecrets
 * @returns {string[]}
 */
export function applyEnvVarsToLocalSecrets(envVars, localSecrets) {
  const updated = [];

  for (const mapping of runtimeSecretEnvMappings) {
    const value = envVars[mapping.env];
    if (typeof value !== 'string' || !value.trim()) {
      continue;
    }

    let stored = mapping.transform ? mapping.transform(value.trim()) : value.trim();
    if (mapping.path.at(-1) === 'enabled') {
      stored = stored === 'true';
    }
    if (mapping.path.at(-1) === 'allowBrowserFallback') {
      stored = stored !== 'false';
    }

    setDeepValue(localSecrets, mapping.path, stored);
    updated.push(mapping.env);
  }

  return updated;
}
