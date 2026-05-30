#!/usr/bin/env node
/**
 * Discover Gen 2 CMS tables, record counts, AppSync API, and storage from AWS CLI.
 *
 *   npm run amplify:gen2:discover-cms
 *   npm run amplify:gen2:discover-cms -- --write-public   # also copies to public/ for /admin
 *
 * Requires AWS_PROFILE (townofwiley or steve) and us-east-2.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bindingsPath = join(repoRoot, 'infrastructure', 'gen2-production-bindings.json');
const outInfra = join(repoRoot, 'infrastructure', 'gen2-cms-inventory.json');
const outPublic = join(repoRoot, 'public', 'gen2-cms-inventory.json');

const CMS_MODELS = [
  'SiteSettings',
  'AlertBanner',
  'Announcement',
  'Event',
  'OfficialContact',
  'LeadershipRosterEntry',
  'EmailAlias',
  'Business',
  'PublicDocument',
  'ExternalNewsLink',
];

const PUBLIC_READ_MODELS = new Set(CMS_MODELS.filter((m) => m !== 'EmailAlias'));

const writePublic = process.argv.includes('--write-public');

function awsJson(args) {
  const out = execFileSync('aws', args, {
    encoding: 'utf8',
    env: { ...process.env, AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION || 'us-east-2' },
  });
  return JSON.parse(out);
}

function tableCount(tableName) {
  try {
    const result = awsJson([
      'dynamodb',
      'scan',
      '--table-name',
      tableName,
      '--select',
      'COUNT',
      '--output',
      'json',
    ]);
    return result.Count ?? 0;
  } catch {
    return null;
  }
}

function main() {
  const bindings = JSON.parse(readFileSync(bindingsPath, 'utf8'));
  const suffix = bindings.appSyncGen2.dynamoDbSuffix;
  const apiId = bindings.appSyncGen2.apiId;
  const region = bindings.storageGen2?.region || 'us-east-2';

  const api = awsJson(['appsync', 'get-graphql-api', '--api-id', apiId, '--region', region, '--output', 'json'])
    .graphqlApi;

  const models = CMS_MODELS.map((model) => {
    const tableName = `${model}-${suffix}`;
    const itemCount = tableCount(tableName);
    return {
      model,
      tableName,
      itemCount,
      publicApiKeyRead: PUBLIC_READ_MODELS.has(model),
    };
  });

  const inventory = {
    version: 1,
    discoveredAt: new Date().toISOString(),
    amplify: bindings.amplify,
    appSync: {
      apiId,
      name: api.name,
      graphqlEndpoint: api.uris?.GRAPHQL ?? bindings.appSyncGen2.graphqlEndpoint,
      authenticationType: api.authenticationType,
      additionalAuth: (api.additionalAuthenticationProviders ?? []).map((p) => p.authenticationType),
    },
    cognito: bindings.cognitoGen2,
    storage: bindings.storageGen2,
    models,
    capabilities: {
      dataManagerUrl: `https://${region}.console.aws.amazon.com/amplify/apps/${bindings.amplify.appId}/branches/${bindings.amplify.branch}/data`,
      publicSiteModels: [...PUBLIC_READ_MODELS],
      staffOnlyModels: ['EmailAlias'],
      heroFields: [
        'heroEyebrow',
        'heroStatus',
        'heroTitle',
        'heroMessage',
        'heroSubtext',
        'heroImageUrl',
        'welcomeLabel',
        'welcomeHeading',
        'welcomeBody',
        'welcomeCaption',
      ],
    },
  };

  writeFileSync(outInfra, `${JSON.stringify(inventory, null, 2)}\n`);
  console.log(`Wrote ${outInfra}`);

  if (writePublic) {
    mkdirSync(dirname(outPublic), { recursive: true });
    copyFileSync(outInfra, outPublic);
    console.log(`Copied to ${outPublic}`);
  }

  for (const row of models) {
    console.log(`${row.model}: ${row.itemCount ?? 'n/a'} (${row.tableName})`);
  }
}

main();
