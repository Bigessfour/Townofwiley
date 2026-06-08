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
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(repoRoot, 'infrastructure', 'aws-infrastructure.manifest.json');
const envManifestPath = join(repoRoot, 'infrastructure', 'amplify-branch-env.manifest.json');

const args = process.argv.slice(2);
const skipS3 = args.includes('--skip-s3');
const skipAmplify = args.includes('--skip-amplify');
const skipEnv = args.includes('--skip-amplify-env');
const skipLogRetention = args.includes('--skip-log-retention');
const offline = args.includes('--offline');

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

function tryAwsText(command, region) {
  try {
    return awsText(command, region);
  } catch {
    return null;
  }
}

function hasNoneAuthFunctionUrlPermissions(policyDocument) {
  const statements = policyDocument?.Statement ?? [];
  const hasInvokeUrl = statements.some((statement) => {
    const action = statement.Action;
    if (Array.isArray(action)) {
      return action.includes('lambda:InvokeFunctionUrl');
    }
    return action === 'lambda:InvokeFunctionUrl';
  });
  const hasInvokeFunction = statements.some((statement) => {
    const action = statement.Action;
    const matchesAction = Array.isArray(action)
      ? action.includes('lambda:InvokeFunction')
      : action === 'lambda:InvokeFunction';
    return matchesAction && statement.Condition?.Bool?.['lambda:InvokedViaFunctionUrl'] === 'true';
  });
  return hasInvokeUrl && hasInvokeFunction;
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const envManifest = JSON.parse(readFileSync(envManifestPath, 'utf8'));

const expectedLogRetentionDays = manifest.cloudWatch?.logRetentionDays ?? 90;
const appsyncApiId = manifest.appsync?.apiId ?? 'j7b2x3sh7rcezekekkxxiak7hi';
const amplifyBackendLogGroups = manifest.cloudWatch?.amplifyBackendLogGroups ?? [
  '/aws/lambda/amplify-townofwiley-main--UpdateRolesWithIDPFuncti-1Z2Jfsrc9zLF',
];

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

function checkLogGroupRetention(logGroupName, region) {
  const groups = tryAwsJson(
    `logs describe-log-groups --log-group-name-prefix ${logGroupName}`,
    region,
  );
  const group = groups?.logGroups?.find((g) => g.logGroupName === logGroupName);
  if (!group) {
    warn(`CloudWatch log group missing (may appear after first invoke): ${logGroupName}`);
    return;
  }
  const retention = group.retentionInDays;
  if (retention == null) {
    fail(
      `${logGroupName}: no retention policy (expected ${expectedLogRetentionDays}d) — run ${manifest.cloudWatch?.configureScript ?? 'npm run configure:cloudwatch-logging'}`,
    );
  } else if (retention < expectedLogRetentionDays) {
    fail(
      `${logGroupName}: retention ${retention}d < expected ${expectedLogRetentionDays}d — run ${manifest.cloudWatch?.configureScript ?? 'npm run configure:cloudwatch-logging'}`,
    );
  } else {
    pass(`${logGroupName}: retention ${retention}d`);
  }
}

console.log('== Town of Wiley AWS infrastructure verification ==\n');
console.log(`SSOT: ${manifestPath}\n`);

/** Contact Function URL auth matrix (SSOT / AP-05). */
const CONTACT_FUNCTION_URL_AUTH = {
  TownOfWileyContactUpdatesReview: 'AWS_IAM',
  TownOfWileyContactUpdate: 'NONE',
  TownOfWileyContactUpdatesReviewProxy: 'NONE',
};

if (offline) {
  const generatorPath = join(
    repoRoot,
    envManifest.generator ?? 'scripts/generate-runtime-config.mjs',
  );
  if (!existsSync(generatorPath)) {
    fail(`amplify-branch-env generator missing: ${envManifest.generator}`);
  } else {
    pass(`amplify-branch-env generator exists: ${envManifest.generator}`);
  }

  if (
    !Array.isArray(envManifest.requiredForProduction) ||
    envManifest.requiredForProduction.length === 0
  ) {
    fail('amplify-branch-env.manifest.json: requiredForProduction must be a non-empty array');
  } else {
    pass(
      `amplify-branch-env: ${envManifest.requiredForProduction.length} required production env vars`,
    );
  }

  const cspRegistryPath = join(repoRoot, 'docs', 'third-party-csp-registry.md');
  if (!existsSync(cspRegistryPath)) {
    fail('docs/third-party-csp-registry.md is missing (CSP third-party SSOT)');
  } else {
    const registry = readFileSync(cspRegistryPath, 'utf8');
    const requiredMarkers = [
      'execute-api',
      'googletagmanager',
      'easy-peasy',
      'appsync-api',
      'unsafe-inline',
    ];
    for (const marker of requiredMarkers) {
      if (!registry.includes(marker)) {
        fail(`third-party-csp-registry.md missing marker: ${marker}`);
      }
    }
    pass('third-party-csp-registry.md documents required CSP vendors');
  }

  for (const fn of manifest.lambdaFunctions) {
    if (fn.functionUrl?.required && !fn.functionUrl?.authType) {
      fail(`${fn.functionName}: missing functionUrl.authType in manifest`);
    }
  }

  for (const [name, expectedAuth] of Object.entries(CONTACT_FUNCTION_URL_AUTH)) {
    const entry = manifest.lambdaFunctions.find((fn) => fn.functionName === name);
    if (!entry) {
      fail(`${name}: missing from aws-infrastructure.manifest.json`);
      continue;
    }
    if (!entry.functionUrl?.required) {
      fail(`${name}: functionUrl.required must be true in manifest`);
    }
    const actual = entry.functionUrl?.authType;
    if (actual !== expectedAuth) {
      fail(
        `${name}: functionUrl.authType ${actual ?? '(missing)'} (expected ${expectedAuth} per SSOT)`,
      );
    } else if (name === 'TownOfWileyContactUpdatesReview' && actual === 'NONE') {
      fail(`${name}: review Lambda must not use public NONE auth (PII)`);
    } else {
      pass(`${name}: Function URL authType ${actual}`);
    }
  }

  const reviewDeployScript = join(repoRoot, 'scripts', 'deploy-contact-updates-review.py');
  const reviewDeploySource = readFileSync(reviewDeployScript, 'utf8');
  if (!/AWS_IAM/.test(reviewDeploySource)) {
    fail('deploy-contact-updates-review.py must enforce AWS_IAM Function URL auth (AP-05)');
  } else {
    pass('deploy-contact-updates-review.py enforces AWS_IAM');
  }

  printSummary();
  console.log(
    failures.length
      ? `FAILED: ${failures.length} issue(s)`
      : 'OK: manifest and contact security posture valid (offline)',
  );
  process.exit(failures.length ? 1 : 0);
}

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
  const cfg = tryAwsJson(
    `lambda get-function-configuration --function-name ${fn.functionName}`,
    region,
  );
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
    if (actual === 'NONE') {
      const policyRaw = tryAwsText(`lambda get-policy --function-name ${fn.functionName}`, region);
      if (!policyRaw) {
        fail(
          `${fn.functionName}: NONE auth Function URL missing resource policy (needs InvokeFunctionUrl + InvokeFunction)`,
        );
      } else {
        const policyJson = policyRaw.includes('\t') ? policyRaw.split('\t')[0] : policyRaw;
        const policy = JSON.parse(policyJson);
        if (!hasNoneAuthFunctionUrlPermissions(policy)) {
          fail(
            `${fn.functionName}: NONE auth Function URL missing lambda:InvokeFunction with lambda:InvokedViaFunctionUrl`,
          );
        } else {
          pass(`${fn.functionName}: Function URL public invoke policy complete`);
        }
      }
    }
  }
}

if (!offline && !skipLogRetention) {
  const primaryRegion = manifest.primaryRegion ?? 'us-east-2';
  for (const fn of manifest.lambdaFunctions ?? []) {
    const region = fn.region ?? primaryRegion;
    const name = String(fn.functionName ?? '').trim();
    if (name) {
      checkLogGroupRetention(`/aws/lambda/${name}`, region);
    }
  }
  for (const logGroup of amplifyBackendLogGroups) {
    checkLogGroupRetention(logGroup, primaryRegion);
  }
  checkLogGroupRetention(`/aws/appsync/apis/${appsyncApiId}`, primaryRegion);
}

if (!skipS3) {
  for (const bucket of manifest.s3Buckets ?? []) {
    const region = bucket.region ?? manifest.primaryRegion;
    const bpa = tryAwsJson(`s3api get-public-access-block --bucket ${bucket.name}`, region);
    if (!bpa?.PublicAccessBlockConfiguration) {
      fail(`S3 bucket not found or no BPA API: ${bucket.name}`);
      continue;
    }
    const c = bpa.PublicAccessBlockConfiguration;
    const allOn =
      c.BlockPublicAcls && c.IgnorePublicAcls && c.BlockPublicPolicy && c.RestrictPublicBuckets;
    if (bucket.requireBlockPublicAccess && !allOn) {
      fail(`S3 ${bucket.name}: Block Public Access not fully enabled`);
    } else {
      pass(`S3 ${bucket.name}: Block Public Access OK`);
    }
  }
}

// Hosting (S3 + CloudFront) best-practice checks (current post-migration config)
const h = manifest.hosting;
if (h && h.cloudFrontDistributionId && !skipS3) {
  const dist = tryAwsJson(
    `cloudfront get-distribution --id ${h.cloudFrontDistributionId}`,
    'us-east-1',
  );
  if (!dist?.Distribution) {
    fail(`CloudFront dist ${h.cloudFrontDistributionId} not found`);
  } else {
    const dc = dist.Distribution.DistributionConfig || {};
    const db = dc.DefaultCacheBehavior || {};
    pass(`CloudFront ${h.cloudFrontDistributionId} exists and enabled=${dc.Enabled}`);
    if (
      dc.Aliases?.Items?.includes('townofwiley.gov') &&
      dc.Aliases?.Items?.includes('www.townofwiley.gov')
    ) {
      pass('CloudFront aliases include townofwiley.gov + www');
    } else {
      warn('CloudFront aliases missing expected custom domains');
    }
    if (db.CachePolicyId === h.cachePolicyId) {
      pass(`CloudFront using managed CachePolicy ${h.cachePolicyId}`);
    } else {
      warn(`CloudFront CachePolicyId ${db.CachePolicyId} (expected ${h.cachePolicyId})`);
    }
    if (db.ResponseHeadersPolicyId === h.responseHeadersPolicyId) {
      pass(`CloudFront using ResponseHeadersPolicy ${h.responseHeadersPolicyId}`);
    } else {
      warn(
        `CloudFront ResponseHeadersPolicyId ${db.ResponseHeadersPolicyId} (expected ${h.responseHeadersPolicyId})`,
      );
    }
    if (dc.Logging?.Enabled) {
      pass(`CloudFront logging enabled to ${dc.Logging.Bucket}`);
    } else {
      warn('CloudFront logging not enabled');
    }
    const origin = (dc.Origins?.Items || [])[0] || {};
    if (origin.OriginAccessControlId) {
      pass(`CloudFront origin using OAC ${origin.OriginAccessControlId}`);
    } else if (origin.S3OriginConfig?.OriginAccessIdentity) {
      pass('CloudFront origin using legacy OAI (OAC migration prepared)');
    }
  }

  // Static bucket hosting checks (beyond the generic s3Buckets list)
  const staticBpa = tryAwsJson(`s3api get-public-access-block --bucket ${h.s3Bucket}`, h.region);
  if (staticBpa?.PublicAccessBlockConfiguration) {
    const c = staticBpa.PublicAccessBlockConfiguration;
    if (c.BlockPublicAcls && c.IgnorePublicAcls && c.BlockPublicPolicy && c.RestrictPublicBuckets) {
      pass(`Static site bucket ${h.s3Bucket} full BPA OK`);
    } else {
      fail(`Static site bucket ${h.s3Bucket} missing full public access blocks`);
    }
  }
  const policy = tryAwsJson(`s3api get-bucket-policy --bucket ${h.s3Bucket}`, h.region);
  if (policy?.Policy) {
    const polStr =
      typeof policy.Policy === 'string' ? policy.Policy : JSON.stringify(policy.Policy);
    if (polStr.includes('cloudfront.amazonaws.com') || polStr.includes('Origin Access Control')) {
      pass(`Static site bucket policy grants CloudFront (OAC/OAI)`);
    } else {
      warn('Static site bucket policy may not grant CF access');
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
