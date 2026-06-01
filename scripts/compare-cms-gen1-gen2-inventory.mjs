#!/usr/bin/env node
/**
 * Compare DynamoDB item counts: Gen 1 (legacy Studio) vs Gen 2 (main branch Data manager).
 *
 *   AWS_PROFILE=townofwiley npm run amplify:gen2:compare-cms
 *
 * If Gen 1 counts are higher, run: npm run amplify:gen2:migrate-cms
 * Then: npm run amplify:gen2:discover-cms
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bindingsPath = join(repoRoot, 'infrastructure', 'gen2-production-bindings.json');

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
  } catch (error) {
    return { error: error.message };
  }
}

function main() {
  const bindings = JSON.parse(readFileSync(bindingsPath, 'utf8'));
  const gen1Suffix = bindings.appSyncGen1Legacy.dynamoDbSuffix;
  const gen2Suffix = bindings.appSyncGen2.dynamoDbSuffix;

  console.log('Gen 1 (legacy Studio / old API)');
  console.log(`  API: ${bindings.appSyncGen1Legacy.graphqlEndpoint}`);
  console.log(`  Suffix: ${gen1Suffix}`);
  console.log('');
  console.log('Gen 2 (production Data manager — Amplify branch main)');
  console.log(`  API: ${bindings.appSyncGen2.graphqlEndpoint}`);
  console.log(`  Suffix: ${gen2Suffix}`);
  console.log(`  Console: ${bindings.amplify ? `https://us-east-2.console.aws.amazon.com/amplify/apps/${bindings.amplify.appId}/branches/main/data` : '(see gen2-cms-inventory.json)'}`);
  console.log('');
  console.log('Model'.padEnd(24), 'Gen1'.padStart(6), 'Gen2'.padStart(6), '  Note');
  console.log('-'.repeat(60));

  let gen1Higher = 0;

  for (const model of CMS_MODELS) {
    const gen1Table = `${model}-${gen1Suffix}`;
    const gen2Table = `${model}-${gen2Suffix}`;
    const gen1 = tableCount(gen1Table);
    const gen2 = tableCount(gen2Table);
    const g1n = typeof gen1 === 'number' ? gen1 : -1;
    const g2n = typeof gen2 === 'number' ? gen2 : -1;

    let note = '';
    if (typeof gen1 === 'object' && gen1.error) {
      note = 'Gen1 table missing?';
    } else if (typeof gen2 === 'object' && gen2.error) {
      note = 'Gen2 table missing?';
    } else if (g1n > g2n) {
      note = '← migrate';
      gen1Higher += 1;
    } else if (g1n < g2n) {
      note = 'Gen2 only';
    }

    const g1s = typeof gen1 === 'number' ? String(gen1) : 'ERR';
    const g2s = typeof gen2 === 'number' ? String(gen2) : 'ERR';
    console.log(model.padEnd(24), g1s.padStart(6), g2s.padStart(6), `  ${note}`);
  }

  console.log('');
  if (gen1Higher > 0) {
    console.log(
      `${gen1Higher} model(s) have more rows in Gen 1 than Gen 2. Run: npm run amplify:gen2:migrate-cms`,
    );
    process.exitCode = 1;
  } else {
    console.log('No Gen1-only surplus detected (or Gen1 tables are empty).');
  }
}

main();
