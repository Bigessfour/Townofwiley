#!/usr/bin/env node
/**
 * Production static site deploy: build → S3 sync (bucket root) → CloudFront invalidation.
 *
 * Usage (from repo root):
 *   AWS_PROFILE=townofwiley npm run deploy:static-site
 *   npm run deploy:static-site -- --skip-build
 *   npm run deploy:static-site -- --dry-run
 *   npm run deploy:static-site -- --wait-invalidation
 *
 * SSOT: infrastructure/aws-infrastructure.manifest.json → hosting
 * Docs: README.md § Deployment Record
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(repoRoot, 'infrastructure', 'aws-infrastructure.manifest.json');

const argv = process.argv.slice(2);
const skipBuild = argv.includes('--skip-build');
const dryRun = argv.includes('--dry-run');
const waitInvalidation = argv.includes('--wait-invalidation');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const hosting = manifest.hosting ?? {};
const bucket = hosting.s3Bucket ?? 'townofwiley-static-site';
const region = hosting.region ?? manifest.primaryRegion ?? 'us-east-2';
const distributionId = hosting.cloudFrontDistributionId ?? 'E1NZ3XCY5CYR1J';
const distDir = join(repoRoot, 'dist', 'townofwiley-app', 'browser');

/** Short TTL at origin so future edge misses pick up fresh HTML/config sooner. */
const NO_CACHE = 'no-cache, no-store, must-revalidate';

const awsEnv = {
  ...process.env,
  AWS_PROFILE: process.env.AWS_PROFILE ?? 'townofwiley',
  AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION ?? region,
  AWS_REGION: process.env.AWS_REGION ?? region,
};

function run(command, options = {}) {
  console.log(`\n> ${command}`);
  if (dryRun) {
    return '';
  }
  return execSync(command, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'inherit',
    env: awsEnv,
    ...options,
  });
}

function runCapture(command) {
  console.log(`\n> ${command}`);
  if (dryRun) {
    return 'dry-run-invalidation-id';
  }
  return execSync(command, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: awsEnv,
  }).trim();
}

function assertDistReady() {
  const indexPath = join(distDir, 'index.html');
  if (!existsSync(indexPath)) {
    console.error(
      `error: missing ${indexPath}\n` +
        'Run npm run build first. Output must land at dist/townofwiley-app/browser (S3 bucket root, not a browser/ prefix).',
    );
    process.exit(1);
  }
}

function applyNoCacheKeys() {
  const keys = ['index.html', 'runtime-config.js', '404.html'];
  for (const key of keys) {
    const localPath = join(distDir, key);
    if (!existsSync(localPath)) {
      continue;
    }
    run(
      `aws s3 cp "${localPath.replace(/\\/g, '/')}" s3://${bucket}/${key} ` +
        `--cache-control "${NO_CACHE}" --content-type ${
          key.endsWith('.js') ? 'application/javascript' : 'text/html'
        }`,
    );
  }
}

function waitForInvalidation(invalidationId) {
  if (dryRun || !waitInvalidation) {
    return;
  }
  console.log(`\nWaiting for CloudFront invalidation ${invalidationId}…`);
  const result = spawnSync(
    'aws',
    [
      'cloudfront',
      'wait',
      'invalidation-completed',
      '--distribution-id',
      distributionId,
      '--id',
      invalidationId,
    ],
    { cwd: repoRoot, stdio: 'inherit', env: awsEnv },
  );
  if (result.status !== 0) {
    console.warn('warning: invalidation wait failed or timed out; edge cache may still be clearing.');
  }
}

console.log('Town of Wiley — S3 + CloudFront deploy');
console.log(`  bucket: ${bucket} (${region})`);
console.log(`  distribution: ${distributionId}`);
console.log(`  profile: ${awsEnv.AWS_PROFILE}`);
if (dryRun) {
  console.log('  mode: dry-run (commands printed only)');
}

if (!skipBuild) {
  run('npm run build');
} else {
  console.log('\n(skipping build — using existing dist/)');
}

assertDistReady();

run(
  `aws s3 sync "${distDir.replace(/\\/g, '/')}" s3://${bucket} --delete --region ${region}`,
);

applyNoCacheKeys();

const invalidationId = runCapture(
  `aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/*" --query Invalidation.Id --output text`,
) || 'unknown';

waitForInvalidation(invalidationId);

console.log('\nDeploy steps finished.');
console.log('Verify: hard-refresh https://www.townofwiley.gov/ and check /runtime-config.js gitSha.');
if (!dryRun) {
  console.log(`CloudFront invalidation: ${invalidationId}`);
}
