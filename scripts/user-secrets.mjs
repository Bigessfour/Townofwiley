import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const paths = {
  localDir: join(repoRoot, 'secrets', 'local'),
  encryptedDir: join(repoRoot, 'secrets', 'encrypted'),
  templateDir: join(repoRoot, 'secrets', 'templates'),
  localSecrets: join(repoRoot, 'secrets', 'local', 'user-secrets.json'),
  localPassphrase: join(repoRoot, 'secrets', 'local', '.passphrase'),
  localGitignore: join(repoRoot, 'secrets', 'local', '.gitignore'),
  encryptedSecrets: join(repoRoot, 'secrets', 'encrypted', 'user-secrets.lockbox.json'),
  template: join(repoRoot, 'secrets', 'templates', 'user-secrets.template.json'),
};

const args = process.argv.slice(2);
const command = args[0] ?? 'status';
const flags = new Set(args.slice(1));

const templateSecrets = {
  cloudflare: {
    zone: 'townofwiley.gov',
    apiBaseUrl: 'https://api.cloudflare.com/client/v4',
    apiToken: '',
  },
  aws: {
    region: 'us-east-2',
    accountId: '570912405222',
    amplifyAppId: 'd331voxr1fhoir',
    accessKeyId: '',
    secretAccessKey: '',
    sessionToken: '',
  },
  xai: {
    username: '',
    password: '',
    apiKey: '',
  },
  chatbot: {
    easyPeasy: {
      apiKey: '',
      publicUrl: '',
      apiEndpoint: '',
      chatUrl: '',
      buttonPosition: 'bottom-right',
    },
  },
  weather: {
    nws: {
      apiEndpoint: '',
      allowBrowserFallback: true,
      userAgent: '',
      apiKey: '',
    },
    alertSignup: {
      enabled: false,
      apiEndpoint: '',
      senderEmail: '',
    },
  },
  cms: {
    appSync: {
      region: 'us-east-2',
      apiEndpoint: '',
      apiKey: '',
    },
  },
};

const envMappings = [
  { env: 'CLOUDFLARE_API_TOKEN', path: ['cloudflare', 'apiToken'] },
  { env: 'AWS_ACCESS_KEY_ID', path: ['aws', 'accessKeyId'] },
  { env: 'AWS_SECRET_ACCESS_KEY', path: ['aws', 'secretAccessKey'] },
  { env: 'AWS_SESSION_TOKEN', path: ['aws', 'sessionToken'] },
  { env: 'AWS_REGION', path: ['aws', 'region'] },
  { env: 'XAI_USERNAME', path: ['xai', 'username'] },
  { env: 'XAI_PASSWORD', path: ['xai', 'password'] },
  { env: 'XAI_API_KEY', path: ['xai', 'apiKey'] },
  { env: 'EASYPEASY_API_KEY', path: ['chatbot', 'easyPeasy', 'apiKey'] },
  { env: 'EASYPEASY_BOT_PUBLIC_URL', path: ['chatbot', 'easyPeasy', 'publicUrl'] },
  { env: 'EASYPEASY_API_ENDPOINT', path: ['chatbot', 'easyPeasy', 'apiEndpoint'] },
  { env: 'EASYPEASY_CHAT_URL', path: ['chatbot', 'easyPeasy', 'chatUrl'] },
  { env: 'EASYPEASY_BUTTON_POSITION', path: ['chatbot', 'easyPeasy', 'buttonPosition'] },
  { env: 'NWS_PROXY_ENDPOINT', path: ['weather', 'nws', 'apiEndpoint'] },
  {
    env: 'NWS_ALLOW_BROWSER_FALLBACK',
    path: ['weather', 'nws', 'allowBrowserFallback'],
    transform: (value) => value.trim().toLowerCase() !== 'false',
  },
  { env: 'NWS_USER_AGENT', path: ['weather', 'nws', 'userAgent'] },
  { env: 'NWS_API_KEY', path: ['weather', 'nws', 'apiKey'] },
  {
    env: 'SEVERE_WEATHER_SIGNUP_ENABLED',
    path: ['weather', 'alertSignup', 'enabled'],
    transform: (value) => value.trim().toLowerCase() === 'true',
  },
  {
    env: 'SEVERE_WEATHER_SIGNUP_API_ENDPOINT',
    path: ['weather', 'alertSignup', 'apiEndpoint'],
  },
  {
    env: 'SEVERE_WEATHER_SIGNUP_SENDER_EMAIL',
    path: ['weather', 'alertSignup', 'senderEmail'],
  },
  { env: 'APPSYNC_CMS_REGION', path: ['cms', 'appSync', 'region'] },
  { env: 'APPSYNC_CMS_ENDPOINT', path: ['cms', 'appSync', 'apiEndpoint'] },
  { env: 'APPSYNC_CMS_API_KEY', path: ['cms', 'appSync', 'apiKey'] },
];

function ensureStructure() {
  mkdirSync(paths.localDir, { recursive: true });
  mkdirSync(paths.encryptedDir, { recursive: true });
  mkdirSync(paths.templateDir, { recursive: true });

  if (!existsSync(paths.localGitignore)) {
    writeFileSync(paths.localGitignore, '*\n!.gitignore\n');
  }

  if (!existsSync(paths.template)) {
    writeJson(paths.template, templateSecrets);
  }
}

function seedLocalSecrets() {
  if (!existsSync(paths.localSecrets)) {
    const template = existsSync(paths.template) ? readJson(paths.template) : templateSecrets;
    writeJson(paths.localSecrets, template);
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function setDeepValue(target, pathSegments, value) {
  let current = target;

  for (let index = 0; index < pathSegments.length - 1; index += 1) {
    const segment = pathSegments[index];
    current[segment] ??= {};
    current = current[segment];
  }

  current[pathSegments[pathSegments.length - 1]] = value;
}

function collectFilledSecretSlots(value, pathSegments = []) {
  if (typeof value === 'string') {
    return value.trim() ? [pathSegments.join('.')] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectFilledSecretSlots(item, [...pathSegments, `${index}`]),
    );
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, childValue]) => {
      return collectFilledSecretSlots(childValue, [...pathSegments, key]);
    });
  }

  return value ? [pathSegments.join('.')] : [];
}

function pruneLocalSecrets() {
  if (!existsSync(paths.localSecrets)) {
    console.log('Local plaintext secrets file is already absent.');
    return;
  }

  unlinkSync(paths.localSecrets);
  console.log('Local plaintext secrets file removed.');
}

function getPassphrase({ allowGenerate = false } = {}) {
  const envPassphrase = process.env.TOW_SECRETS_PASSPHRASE?.trim();

  if (envPassphrase) {
    return envPassphrase;
  }

  if (existsSync(paths.localPassphrase)) {
    const storedPassphrase = readFileSync(paths.localPassphrase, 'utf8').trim();

    if (storedPassphrase) {
      return storedPassphrase;
    }
  }

  if (allowGenerate) {
    const generatedPassphrase = randomBytes(24).toString('base64url');
    writeFileSync(paths.localPassphrase, `${generatedPassphrase}\n`);
    return generatedPassphrase;
  }

  throw new Error(
    'No passphrase found. Set TOW_SECRETS_PASSPHRASE or create secrets/local/.passphrase.',
  );
}

function encryptSecrets(plaintext, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    format: 'townofwiley.user-secrets.v1',
    cipher: 'aes-256-gcm',
    kdf: {
      name: 'scrypt',
      salt: salt.toString('base64'),
    },
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    updatedAt: new Date().toISOString(),
    ciphertext: ciphertext.toString('base64'),
  };
}

function decryptSecrets(lockbox, passphrase) {
  if (lockbox.format !== 'townofwiley.user-secrets.v1') {
    throw new Error(`Unsupported lockbox format: ${lockbox.format ?? 'unknown'}`);
  }

  const salt = Buffer.from(lockbox.kdf.salt, 'base64');
  const iv = Buffer.from(lockbox.iv, 'base64');
  const tag = Buffer.from(lockbox.tag, 'base64');
  const ciphertext = Buffer.from(lockbox.ciphertext, 'base64');
  const key = scryptSync(passphrase, salt, 32);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);

  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

function initLocker() {
  ensureStructure();
  seedLocalSecrets();

  if (flags.has('--generate-passphrase')) {
    getPassphrase({ allowGenerate: true });
  }

  if (!existsSync(paths.encryptedSecrets)) {
    lockSecrets();
  }

  console.log('User secrets locker initialized.');
}

function lockSecrets() {
  ensureStructure();

  if (!existsSync(paths.localSecrets)) {
    throw new Error(
      'Local plaintext secrets file not found. Run npm run secrets:init or npm run secrets:unlock first.',
    );
  }

  const passphrase = getPassphrase({ allowGenerate: flags.has('--generate-passphrase') });
  const plaintext = readFileSync(paths.localSecrets, 'utf8');
  const lockbox = encryptSecrets(plaintext, passphrase);

  writeJson(paths.encryptedSecrets, lockbox);

  if (flags.has('--prune-local')) {
    pruneLocalSecrets();
  }

  console.log('Encrypted lockbox updated.');
}

function unlockSecrets() {
  ensureStructure();

  if (!existsSync(paths.encryptedSecrets)) {
    throw new Error(
      'Encrypted lockbox not found. Run npm run secrets:init or npm run secrets:lock first.',
    );
  }

  const passphrase = getPassphrase();
  const lockbox = readJson(paths.encryptedSecrets);
  const plaintext = decryptSecrets(lockbox, passphrase);

  writeFileSync(paths.localSecrets, `${plaintext.trimEnd()}\n`);
  console.log('Local plaintext secrets refreshed behind the gitignore shield.');
}

function importEnvSecrets() {
  ensureStructure();

  if (!existsSync(paths.localSecrets)) {
    seedLocalSecrets();
  }

  const secrets = existsSync(paths.localSecrets)
    ? readJson(paths.localSecrets)
    : structuredClone(templateSecrets);
  const imported = [];

  for (const mapping of envMappings) {
    const value = process.env[mapping.env];

    if (!value) {
      continue;
    }

    setDeepValue(secrets, mapping.path, mapping.transform ? mapping.transform(value) : value);
    imported.push(mapping.env);
  }

  writeJson(paths.localSecrets, secrets);

  if (flags.has('--lock')) {
    lockSecrets();
  }

  if (imported.length === 0) {
    console.log('No matching environment variables were available to import.');
    return;
  }

  console.log(`Imported ${imported.length} environment variable(s): ${imported.join(', ')}`);
}

function status() {
  ensureStructure();

  const presentEnvNames = envMappings
    .filter((mapping) => Boolean(process.env[mapping.env]))
    .map((mapping) => mapping.env);

  const lockboxMetadata = existsSync(paths.encryptedSecrets)
    ? readJson(paths.encryptedSecrets)
    : null;
  let secretsSnapshot = existsSync(paths.localSecrets) ? readJson(paths.localSecrets) : null;
  let filledSecretSlotSource = secretsSnapshot ? 'local' : 'none';

  if (!secretsSnapshot && lockboxMetadata) {
    try {
      const passphrase = getPassphrase();
      const decryptedSecrets = decryptSecrets(lockboxMetadata, passphrase);
      secretsSnapshot = JSON.parse(decryptedSecrets);
      filledSecretSlotSource = 'encrypted';
    } catch {
      filledSecretSlotSource = 'unavailable';
    }
  }

  const filledSecretSlots = secretsSnapshot ? collectFilledSecretSlots(secretsSnapshot).sort() : [];

  const report = {
    localSecretsExists: existsSync(paths.localSecrets),
    encryptedLockboxExists: existsSync(paths.encryptedSecrets),
    localPassphraseExists: existsSync(paths.localPassphrase),
    envPassphrasePresent: Boolean(process.env.TOW_SECRETS_PASSPHRASE),
    encryptedUpdatedAt: lockboxMetadata?.updatedAt ?? null,
    filledSecretSlotSource,
    filledSecretSlotCount: filledSecretSlots.length,
    filledSecretSlots,
    importableEnvironmentVariables: presentEnvNames,
  };

  console.log(JSON.stringify(report, null, 2));
}

try {
  switch (command) {
    case 'init':
      initLocker();
      break;
    case 'lock':
      lockSecrets();
      break;
    case 'unlock':
      unlockSecrets();
      break;
    case 'import-env':
      importEnvSecrets();
      break;
    case 'prune-local':
      pruneLocalSecrets();
      break;
    case 'status':
      status();
      break;
    default:
      throw new Error(`Unsupported command: ${command}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
