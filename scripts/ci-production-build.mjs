import { execSync } from 'node:child_process';
import { shouldRunStrictProductionBuild, repoRoot } from './lib/runtime-config-env.mjs';

const strict = shouldRunStrictProductionBuild(process.env);

/**
 * @param {string} command
 */
function run(command) {
  execSync(command, { cwd: repoRoot, stdio: 'inherit', env: process.env });
}

if (strict) {
  run('npm run generate:runtime-config:strict');
} else {
  run('npm run generate:runtime-config');
}
run('npm run generate:cms-snapshot');
run('node scripts/verify-public-cms-query.mjs');
run('npx ng build');