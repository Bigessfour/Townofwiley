import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const libDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(libDir, '..', '..');
export const manifestPath = join(repoRoot, 'infrastructure', 'aws-infrastructure.manifest.json');

/** @returns {{ accountId: string; hosting: { s3Bucket: string; region: string; cloudFrontDistributionId: string } }} */
export function readHostingManifest() {
  const raw = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const hosting = raw?.hosting ?? {};
  const s3Bucket = typeof hosting.s3Bucket === 'string' ? hosting.s3Bucket.trim() : '';
  const region = typeof hosting.region === 'string' ? hosting.region.trim() : '';
  const cloudFrontDistributionId =
    typeof hosting.cloudFrontDistributionId === 'string'
      ? hosting.cloudFrontDistributionId.trim()
      : '';
  const accountId = typeof raw.accountId === 'string' ? raw.accountId.trim() : '';

  if (!s3Bucket || !region || !cloudFrontDistributionId || !accountId) {
    throw new Error(
      `Incomplete hosting manifest at ${manifestPath} (need accountId, hosting.s3Bucket, hosting.region, hosting.cloudFrontDistributionId)`,
    );
  }

  return { accountId, hosting: { s3Bucket, region, cloudFrontDistributionId } };
}

/**
 * @param {string} distDir absolute or relative path to dist/townofwiley-app/browser
 */
export function assertBrowserDistLayout(distDir) {
  const normalized = distDir.replace(/\\/g, '/');
  if (normalized.includes('/browser/browser/') || normalized.endsWith('/browser/browser')) {
    throw new Error(
      `Dist path looks like a double browser/ prefix (${distDir}). Sync must use dist/townofwiley-app/browser at the S3 bucket root.`,
    );
  }
}
