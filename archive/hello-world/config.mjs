import { getBuiltInRatings } from 'web-codegen-scorer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(configDir, '../..');

/** @type {import("web-codegen-scorer").EnvironmentConfig} */
export default {
  displayName: 'Town of Wiley',
  clientSideFramework: 'angular',
  sourceDirectory: path.join(repoRoot, '.scorer-source'),
  ratings: [...getBuiltInRatings()],
  generationSystemPrompt: path.join(configDir, 'scorer-generation-prompt.md'),
  repairSystemPrompt: path.join(configDir, 'repair-system-prompt.md'),
  executablePrompts: [path.join(configDir, 'example-prompts/**/*.md')],
  packageManager: 'npm',
};