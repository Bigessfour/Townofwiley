#!/usr/bin/env node
/**
 * Copy CMS DynamoDB items from Gen 1 AppSync tables to Gen 2 main branch tables.
 *
 *   npm run amplify:gen2:migrate-cms
 *   npm run amplify:gen2:migrate-cms -- --dry-run
 *
 * Requires AWS CLI + credentials (AWS_PROFILE=townofwiley).
 */
import { execFileSync } from 'node:child_process';

const GEN1_SUFFIX = 'j7b2x3sh7rcezekekkxxiak7hi-main';
const GEN2_MAIN_SUFFIX = 'x7poehudqvamneqni5s6e2cjxy-NONE';

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

const dryRun = process.argv.includes('--dry-run');

function awsJson(args) {
  const out = execFileSync('aws', args, {
    encoding: 'utf8',
    env: { ...process.env, AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION || 'us-east-2' },
  });
  return JSON.parse(out);
}

function tableName(model, suffix) {
  return `${model}-${suffix}`;
}

/** @param {string} tableName */
function scanAll(table) {
  /** @type {Array<Record<string, unknown>>} */
  const items = [];
  /** @type {Record<string, unknown> | undefined} */
  let startKey;
  do {
    const args = ['dynamodb', 'scan', '--table-name', table, '--output', 'json'];
    if (startKey) {
      args.push('--exclusive-start-key', JSON.stringify(startKey));
    }
    const page = awsJson(args);
    if (Array.isArray(page.Items)) {
      items.push(...page.Items);
    }
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return items;
}

/** @param {string} table @param {Array<Record<string, unknown>>} items */
function batchWrite(table, items) {
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    const requestItems = {
      [table]: chunk.map((Item) => ({ PutRequest: { Item } })),
    };
    awsJson(['dynamodb', 'batch-write-item', '--request-items', JSON.stringify(requestItems)]);
  }
}

let totalRead = 0;
let totalWritten = 0;

for (const model of CMS_MODELS) {
  const src = tableName(model, GEN1_SUFFIX);
  const dst = tableName(model, GEN2_MAIN_SUFFIX);
  let items;
  try {
    items = scanAll(src);
  } catch (error) {
    console.warn(`SKIP ${model}: ${error.message}`);
    continue;
  }
  totalRead += items.length;
  console.log(`${model}: ${items.length} item(s) ${src} → ${dst}`);

  if (dryRun || items.length === 0) {
    continue;
  }

  try {
    batchWrite(dst, items);
    totalWritten += items.length;
  } catch (error) {
    console.error(`FAIL ${model}: ${error.message}`);
    process.exitCode = 1;
  }
}

console.log(`Done. read=${totalRead} written=${totalWritten} dry_run=${dryRun}`);
