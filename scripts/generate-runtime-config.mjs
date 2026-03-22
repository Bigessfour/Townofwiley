import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localSecretsPath = join(repoRoot, 'secrets', 'local', 'user-secrets.json');
const runtimeConfigPath = join(repoRoot, 'public', 'runtime-config.js');

function readLocalSecrets() {
  if (!existsSync(localSecretsPath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(localSecretsPath, 'utf8'));
  } catch (error) {
    console.warn(`Unable to parse local secrets from ${localSecretsPath}: ${error.message}`);
    return {};
  }
}

const localSecrets = readLocalSecrets();
const chatUrl =
  process.env.EASYPEASY_CHAT_URL?.trim() || localSecrets.chatbot?.easyPeasy?.chatUrl?.trim() || '';
const apiEndpoint =
  process.env.EASYPEASY_API_ENDPOINT?.trim() ||
  localSecrets.chatbot?.easyPeasy?.apiEndpoint?.trim() ||
  '';
const buttonPosition =
  process.env.EASYPEASY_BUTTON_POSITION?.trim() ||
  localSecrets.chatbot?.easyPeasy?.buttonPosition?.trim() ||
  'bottom-right';
const mode = apiEndpoint ? 'api' : chatUrl ? 'embed' : 'none';

const runtimeConfig = {
  chatbot: {
    provider: 'easyPeasy',
    mode,
    chatUrl,
    buttonPosition,
    apiEndpoint,
  },
};

writeFileSync(
  runtimeConfigPath,
  `window.__TOW_RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig, null, 2)};\n`,
);

console.log(`Runtime config written to ${runtimeConfigPath}`);
