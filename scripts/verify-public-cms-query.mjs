#!/usr/bin/env node
/**
 * Ensures public CMS GraphQL queries in site-cms-content.ts only list AppSync
 * models that grant public + apiKey + read in schema.graphql, and never EmailAlias.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
// Gen 2 schema is in TS (amplify/data/resource.ts); use the inventory (which records publicApiKeyRead per model) for verification.
// This removes any runtime dep on legacy gen1-amplify-backend/ or generated graphql.
const INVENTORY_PATH = join(repoRoot, 'infrastructure', 'gen2-cms-inventory.json');
const PUBLIC_INVENTORY_PATH = join(repoRoot, 'public', 'gen2-cms-inventory.json');
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
  listSiteCopies: 'SiteCopy',
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
  return PUBLIC_CMS_QUERY_CONSTANTS.map((constantName) =>
    extractQueryConstant(source, constantName),
  );
}

function modelAllowsPublicApiKeyReadFromInventory(inventory, modelName) {
  const models = inventory?.models || [];
  const entry = models.find((m) => m.model === modelName);
  if (!entry) {
    return { ok: false, reason: `model ${modelName} not found in gen2-cms-inventory.json` };
  }
  if (entry.publicApiKeyRead !== true) {
    return {
      ok: false,
      reason: `model ${modelName} publicApiKeyRead=${entry.publicApiKeyRead} (expected true for public CMS)`,
    };
  }
  return { ok: true };
}

function main() {
  const inventoryPath = existsSync(INVENTORY_PATH) ? INVENTORY_PATH : PUBLIC_INVENTORY_PATH;
  if (!existsSync(inventoryPath)) {
    console.error(
      `verify-public-cms-query: no gen2-cms-inventory.json found (tried ${INVENTORY_PATH} and public copy).`,
    );
    process.exit(1);
  }
  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
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
    const { ok, reason } = modelAllowsPublicApiKeyReadFromInventory(inventory, model);
    if (!ok) {
      console.error(
        `Public CMS queries use ${op} -> ${model}, but inventory check failed: ${reason}`,
      );
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
    `verify-public-cms-query: OK (${unique.length} list operations across ${PUBLIC_CMS_QUERY_CONSTANTS.length} queries match public apiKey read models from Gen2 inventory).`,
  );
}

main();
