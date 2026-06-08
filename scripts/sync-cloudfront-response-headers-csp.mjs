#!/usr/bin/env node
/**
 * Sync Content-Security-Policy on the CloudFront Response Headers Policy from customHttp.yml.
 * S3+CloudFront hosting (Amplify Hosting deleted June 2026).
 *
 * Usage:
 *   AWS_PROFILE=townofwiley node scripts/sync-cloudfront-response-headers-csp.mjs
 *   node scripts/sync-cloudfront-response-headers-csp.mjs --dry-run
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCspValueFromCustomHttpFile } from './lib/custom-http-csp.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(repoRoot, 'infrastructure', 'aws-infrastructure.manifest.json');
const dryRun = process.argv.includes('--dry-run');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const policyId = manifest.hosting?.responseHeadersPolicyId;
if (!policyId) {
  console.error('error: hosting.responseHeadersPolicyId missing from aws-infrastructure.manifest.json');
  process.exit(1);
}

const csp = extractCspValueFromCustomHttpFile(repoRoot);
const region = 'us-east-1';
const awsEnv = {
  ...process.env,
  AWS_PROFILE: process.env.AWS_PROFILE ?? 'townofwiley',
  AWS_DEFAULT_REGION: region,
  AWS_REGION: region,
};

function awsJson(command) {
  const out = execSync(`aws ${command} --region ${region} --output json`, {
    encoding: 'utf8',
    env: awsEnv,
  });
  return JSON.parse(out);
}

const current = awsJson(`cloudfront get-response-headers-policy --id ${policyId}`);
const config = current.ResponseHeadersPolicy.ResponseHeadersPolicyConfig;
const headers = config.SecurityHeadersConfig?.ContentSecurityPolicy;
if (!headers) {
  console.error('error: policy has no SecurityHeadersConfig.ContentSecurityPolicy');
  process.exit(1);
}

if (headers.ContentSecurityPolicy === csp && headers.Override === true) {
  console.log(`OK: CloudFront policy ${policyId} CSP already matches customHttp.yml`);
  process.exit(0);
}

config.SecurityHeadersConfig.ContentSecurityPolicy = {
  Override: true,
  ContentSecurityPolicy: csp,
};

const payloadPath = join(tmpdir(), 'townofwiley-cf-response-headers-policy.json');
const updateBody = {
  Id: policyId,
  IfMatch: current.ETag,
  ResponseHeadersPolicyConfig: config,
};
writeFileSync(payloadPath, JSON.stringify(updateBody));

if (dryRun) {
  console.log(`dry-run: would update policy ${policyId} CSP (${csp.length} chars)`);
  process.exit(0);
}

execSync(
  `aws cloudfront update-response-headers-policy --cli-input-json file://${payloadPath.replace(/\\/g, '/')}`,
  { stdio: 'inherit', env: awsEnv },
);
console.log(`OK: updated CloudFront response headers policy ${policyId} CSP from customHttp.yml`);