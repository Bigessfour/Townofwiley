#!/usr/bin/env node
/**
 * Verify live AWS resources against infrastructure/aws-infrastructure.manifest.json (SSOT).
 * Cross-platform (Windows/macOS/Linux). Requires AWS CLI v2 and credentials for account 570912405222.
 *
 * Usage:
 *   AWS_PROFILE=townofwiley AWS_REGION=us-east-2 npm run verify:aws-infra
 *   npm run verify:aws-infra -- --skip-s3
 *
 * Docs: docs/AWS_INFRASTRUCTURE_SOT.md
 * AWS Lambda Function URL auth: https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(repoRoot, 'infrastructure', 'aws-infrastructure.manifest.json');
const envManifestPath = join(
  repoRoot,
  'infrastructure',
  'amplify-branch-env.manifest.json',
);

const args = process.argv.slice(2);
const skipS3 = args.includes('--skip-s3');
const skipAmplify = args.includes('--skip-amplify');
const skipEnv = args.includes('--skip-amplify-env');

function awsJson(command, region) {
  const out = execSync(`aws ${command} --region ${region} --output json`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return JSON.parse(out);
}

function awsText(command, region) {
  return execSync(`aws ${command} --region ${region} --output text`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function tryAwsJson(command, region) {
  try {
    return awsJson(command, region);
  } catch {
    return null;
  }
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const envManifest = JSON.parse(readFileSync(envManifestPath, 'utf8'));

const failures = [];
const warnings = [];
const ok = [];

function pass(msg) {
  ok.push(msg);
}

function fail(msg) {
  failures.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

console.log('== Town of Wiley AWS infrastructure verification ==\n');
console.log(`SSOT: ${manifestPath}\n`);

let account;
try {
  account = awsJson('sts get-caller-identity', manifest.primaryRegion).Account;
  console.log(`Caller account: ${account}`);
  if (account !== manifest.accountId) {
    fail(
      `Wrong AWS account ${account} (expected ${manifest.accountId}). Set AWS_PROFILE=townofwiley.`,
    );
  } else {
    pass(`Account ${manifest.accountId}`);
  }
} catch (e) {
  fail(`AWS CLI not configured: ${e.message}`);
  printSummary();
  process.exit(1);
}

if (!skipAmplify) {
  const appId = manifest.amplify.appId;
  const region = manifest.primaryRegion;
  const app = tryAwsJson(`amplify get-app --app-id ${appId}`, region);
  if (!app?.app) {
    fail(`Amplify app ${appId} not found in ${region}`);
  } else {
    pass(`Amplify app ${appId}`);
    const buildSpec = app.app.buildSpec ?? '';
    if (!buildSpec.includes(manifest.amplify.nodeVersion)) {
      fail(
        `Amplify buildSpec missing Node ${manifest.amplify.nodeVersion} — run npm run amplify:sync-buildspec`,
      );
    } else {
      pass(`Amplify buildSpec pins Node ${manifest.amplify.nodeVersion}`);
    }
    const headers = app.app.customHeaders ?? '';
    if (!headers.includes('townofwiley-documents-storage-main')) {
      warn(
        'Amplify customHeaders CSP missing townofwiley-documents-storage-main — run npm run amplify:sync-headers',
      );
    } else {
      pass('Amplify customHeaders include live documents bucket hostname');
    }
  }
}

if (!skipEnv) {
  const branch = envManifest.branch;
  const appId = envManifest.amplifyAppId;
  const region = manifest.primaryRegion;
  const branchData = tryAwsJson(
    `amplify get-branch --app-id ${appId} --branch-name ${branch}`,
    region,
  );
  const envVars = branchData?.branch?.environmentVariables ?? {};
  for (const entry of envManifest.requiredForProduction) {
    const val = envVars[entry.name];
    if (!val || String(val).trim() === '') {
      fail(`Amplify branch ${branch} missing env: ${entry.name} → ${entry.runtimePath}`);
    } else if (entry.secret) {
      pass(`Amplify env ${entry.name} is set (value not shown)`);
    } else {
      pass(`Amplify env ${entry.name} is set`);
    }
  }
}

for (const table of manifest.dynamodbTables ?? []) {
  const region = table.region ?? manifest.primaryRegion;
  const desc = tryAwsJson(`dynamodb describe-table --table-name ${table.name}`, region);
  if (!desc?.Table) {
    if (table.required) {
      fail(`DynamoDB table missing (required): ${table.name} (${region})`);
    } else {
      warn(`DynamoDB table missing (optional): ${table.name}`);
    }
  } else {
    const status = desc.Table.TableStatus;
    if (status !== 'ACTIVE') {
      warn(`DynamoDB ${table.name} status: ${status}`);
    } else {
      pass(`DynamoDB ${table.name} ACTIVE`);
    }
  }
}

for (const fn of manifest.lambdaFunctions) {
  const region = fn.region ?? manifest.primaryRegion;
  const cfg = tryAwsJson(`lambda get-function-configuration --function-name ${fn.functionName}`, region);
  if (!cfg) {
    if (fn.required) {
      fail(`Lambda missing (required): ${fn.functionName}`);
    } else {
      warn(`Lambda missing (optional): ${fn.functionName} — ${fn.notes ?? fn.deployScript ?? ''}`);
    }
    continue;
  }
  pass(`Lambda exists: ${fn.functionName}`);
  const urlCfg = tryAwsJson(
    `lambda list-function-url-configs --function-name ${fn.functionName}`,
    region,
  );
  const expectedAuth = fn.functionUrl?.authType;
  const urlRequired = fn.functionUrl?.required;
  const configs = urlCfg?.FunctionUrlConfigs ?? [];
  if (urlRequired && configs.length === 0) {
    fail(`${fn.functionName}: Function URL required but none configured`);
    continue;
  }
  if (configs.length > 0 && expectedAuth) {
    const actual = configs[0].AuthType;
    if (actual !== expectedAuth) {
      fail(
        `${fn.functionName}: Function URL AuthType ${actual} (expected ${expectedAuth} per SSOT)`,
      );
    } else {
      pass(`${fn.functionName}: Function URL AuthType ${actual}`);
    }
  }
}

if (!skipS3) {
  for (const bucket of manifest.s3Buckets ?? []) {
    const region = bucket.region ?? manifest.primaryRegion;
    const bpa = tryAwsJson(
      `s3api get-public-access-block --bucket ${bucket.name}`,
      region,
    );
    if (!bpa?.PublicAccessBlockConfiguration) {
      fail(`S3 bucket not found or no BPA API: ${bucket.name}`);
      continue;
    }
    const c = bpa.PublicAccessBlockConfiguration;
    const allOn =
      c.BlockPublicAcls &&
      c.IgnorePublicAcls &&
      c.BlockPublicPolicy &&
      c.RestrictPublicBuckets;
    if (bucket.requireBlockPublicAccess && !allOn) {
      fail(`S3 ${bucket.name}: Block Public Access not fully enabled`);
    } else {
      pass(`S3 ${bucket.name}: Block Public Access OK`);
    }
  }
}

printSummary();
process.exit(failures.length > 0 ? 1 : 0);

function printSummary() {
  console.log('\n-- Summary --');
  console.log(`OK: ${ok.length}`);
  if (warnings.length) {
    console.log(`Warnings: ${warnings.length}`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }
  if (failures.length) {
    console.log(`Failures: ${failures.length}`);
    for (const f of failures) console.log(`  ✖ ${f}`);
    console.log('\nSee docs/AWS_INFRASTRUCTURE_SOT.md for deployment order and sync commands.');
  } else {
    console.log('All required checks passed.');
  }
}
