#!/usr/bin/env node
/**
 * Ensures public CMS GraphQL queries in site-cms-content.ts only list AppSync
 * models that grant public + apiKey + read in schema.graphql, and never EmailAlias.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const schemaPath = join(repoRoot, 'amplify/backend/api/townofwiley/schema.graphql');
const siteCmsPath = join(repoRoot, 'src/app/site-cms-content.ts');

const LIST_OPERATION_TO_MODEL = {
  listSiteSettings: 'SiteSettings',
  listAlertBanners: 'AlertBanner',
  listAnnouncements: 'Announcement',
  listEvents: 'Event',
  listOfficialContacts: 'OfficialContact',
  listBusinesses: 'Business',
  listPublicDocuments: 'PublicDocument',
  listExternalNewsLinks: 'ExternalNewsLink',
  listLeadershipRosterEntries: 'LeadershipRosterEntry',
};

const PUBLIC_CMS_QUERY_CONSTANTS = ['PUBLIC_CMS_CORE_QUERY', 'PUBLIC_CMS_EXTENDED_QUERY'];

function extractQueryConstant(source, constantName) {
  const marker = `const ${constantName} = \``;
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`Could not find ${constantName} in site-cms-content.ts`);
  }

  const open = source.indexOf('`', start + marker.length - 1);
  const close = source.indexOf('`;', open + 1);
  if (open === -1 || close === -1) {
    throw new Error(`Could not parse ${constantName} string boundaries`);
  }

  return source.slice(open + 1, close);
}

function extractPublicCmsQueries(source) {
  return PUBLIC_CMS_QUERY_CONSTANTS.map((constantName) => extractQueryConstant(source, constantName));
}

function modelAllowsPublicApiKeyRead(schema, modelName) {
  const marker = `type ${modelName}`;
  const start = schema.indexOf(marker);
  if (start === -1) {
    return { ok: false, reason: `type ${modelName} not found` };
  }
  const nextType = schema.indexOf('\ntype ', start + marker.length);
  const block = nextType === -1 ? schema.slice(start) : schema.slice(start, nextType);
  const hasPublic = /allow:\s*public/.test(block);
  const hasApiKey = /provider:\s*apiKey/.test(block);
  const hasRead = /operations:\s*\[[^\]]*\bread\b/.test(block);
  if (!hasPublic || !hasApiKey || !hasRead) {
    return {
      ok: false,
      reason: `type ${modelName} missing public+apiKey+read (${JSON.stringify({ hasPublic, hasApiKey, hasRead })})`,
    };
  }
  return { ok: true };
}

function main() {
  const schema = readFileSync(schemaPath, 'utf8');
  const siteCms = readFileSync(siteCmsPath, 'utf8');
  const queries = extractPublicCmsQueries(siteCms);
  const query = queries.join('\n');

  if (/EmailAlias|listEmailAliases/i.test(query)) {
    console.error('Public CMS queries must not reference EmailAlias or listEmailAliases.');
    process.exit(1);
  }

  const listOps = [...query.matchAll(/\b(list[A-Za-z]+)\s*\(/g)].map((match) => match[1]);
  const unique = [...new Set(listOps)];

  for (const op of unique) {
    const model = LIST_OPERATION_TO_MODEL[op];
    if (!model) {
      console.error(`Unexpected list operation in public CMS queries: ${op}`);
      process.exit(1);
    }
    const { ok, reason } = modelAllowsPublicApiKeyRead(schema, model);
    if (!ok) {
      console.error(`Public CMS queries use ${op} -> ${model}, but schema check failed: ${reason}`);
      process.exit(1);
    }
  }

  for (const op of Object.keys(LIST_OPERATION_TO_MODEL)) {
    if (!unique.includes(op)) {
      console.error(
        `Expected public CMS queries to include ${op} (${LIST_OPERATION_TO_MODEL[op]}) — update script allowlist or restore query.`,
      );
      process.exit(1);
    }
  }

  console.log(
    `verify-public-cms-query: OK (${unique.length} list operations across ${PUBLIC_CMS_QUERY_CONSTANTS.length} queries match public apiKey read models).`,
  );
}

main();
