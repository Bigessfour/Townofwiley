#!/usr/bin/env node
/**
 * Point clerk/admin dependencies at Gen 2 production (Cognito Staff, EmailAlias table).
 *
 *   AWS_PROFILE=townofwiley node scripts/configure-gen2-clerk-cms.mjs
 *   AWS_PROFILE=townofwiley node scripts/configure-gen2-clerk-cms.mjs --invite-staff
 *
 * --invite-staff: create Gen2 Cognito users for each Gen1 staff email (temp password flow).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const bindingsPath = join(repoRoot, 'infrastructure', 'gen2-production-bindings.json');

/** @returns {import('../infrastructure/gen2-production-bindings.json')} */
function loadBindings() {
  return JSON.parse(readFileSync(bindingsPath, 'utf8'));
}

function awsJson(region, args) {
  const out = execFileSync('aws', ['--region', region, ...args], {
    encoding: 'utf8',
    env: process.env,
  });
  return out.trim() ? JSON.parse(out) : null;
}

function aws(region, args) {
  execFileSync('aws', ['--region', region, ...args], {
    stdio: 'inherit',
    env: process.env,
  });
}

function updateEmailAliasTable(bindings) {
  const { functionName, region, emailAliasTable, emailAliasTableRegion } = bindings.emailAliasRouter;
  const current = awsJson(region, [
    'lambda',
    'get-function-configuration',
    '--function-name',
    functionName,
    '--query',
    'Environment.Variables',
    '--output',
    'json',
  ]);
  const merged = {
    ...current,
    EMAIL_ALIAS_TABLE: emailAliasTable,
    EMAIL_ALIAS_TABLE_REGION: emailAliasTableRegion,
  };
  console.log(`Updating ${functionName} EMAIL_ALIAS_TABLE → ${emailAliasTable}`);
  const envDir = mkdtempSync(join(tmpdir(), 'tow-lambda-env-'));
  const envPath = join(envDir, 'environment.json');
  writeFileSync(envPath, JSON.stringify({ Variables: merged }));
  aws(region, [
    'lambda',
    'update-function-configuration',
    '--function-name',
    functionName,
    '--environment',
    `file://${envPath}`,
  ]);
}

function configureCognitoStaff(bindings, inviteStaff) {
  const c = bindings.cognitoGen2;
  const env = {
    ...process.env,
    COGNITO_USER_POOL_ID: c.userPoolId,
    COGNITO_USER_POOL_CLIENT_ID: c.userPoolClientId,
    COGNITO_IDENTITY_POOL_ID: c.identityPoolId,
    COGNITO_AUTH_ROLE_ARN: c.authenticatedRoleArn,
    COGNITO_UNAUTH_ROLE_ARN: c.unauthenticatedRoleArn,
    STAFF_COGNITO_GROUP: c.staffGroup,
  };
  console.log('Configuring Cognito Staff group for Gen 2 pool…');
  const base = spawnSync(
    'python3',
    [join(repoRoot, 'scripts', 'setup-cognito-staff-group.py')],
    { cwd: repoRoot, env, stdio: 'inherit' },
  );
  if (base.status !== 0) {
    process.exit(base.status ?? 1);
  }

  if (!inviteStaff) {
    console.log('Skip staff user invite (pass --invite-staff to create Gen2 users from Gen1 emails).');
    return;
  }

  const legacyPool = bindings.cognitoGen1Legacy.userPoolId;
  const listed = awsJson('us-east-2', [
    'cognito-idp',
    'list-users',
    '--user-pool-id',
    legacyPool,
    '--output',
    'json',
  ]);
  const emails = (listed?.Users ?? [])
    .map((user) => user.Attributes?.find((a) => a.Name === 'email')?.Value)
    .filter((e) => typeof e === 'string' && e.includes('@'));
  for (const email of emails) {
    console.log(`Inviting staff user ${email} in Gen 2 pool…`);
    const invite = spawnSync(
      'python3',
      [
        join(repoRoot, 'scripts', 'setup-cognito-staff-group.py'),
        '--create-user',
        email,
        '--set-temp-password',
      ],
      { cwd: repoRoot, env, stdio: 'inherit' },
    );
    if (invite.status !== 0) {
      console.warn(`Warning: could not create ${email} (may already exist).`);
    }
  }
}

const inviteStaff = process.argv.includes('--invite-staff');
const bindings = loadBindings();
updateEmailAliasTable(bindings);
configureCognitoStaff(bindings, inviteStaff);
console.log('Gen 2 clerk/CMS wiring complete.');
