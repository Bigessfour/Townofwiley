#!/usr/bin/env node
/**
 * Ensures every clerk-editable CMS model (from cms-clerk-tasks.ts) is listed in
 * cms-inventory.json with staffUserPoolCrud and clerkEditorModel metadata.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const INVENTORY_PATH = join(repoRoot, 'infrastructure', 'cms-inventory.json');
const PUBLIC_INVENTORY_PATH = join(repoRoot, 'public', 'cms-inventory.json');
const CLERK_TASKS_PATH = join(repoRoot, 'src/app/cms-admin/cms-clerk-tasks.ts');
const MODEL_FIELDS_PATH = join(repoRoot, 'src/app/cms-admin/cms-model-admin-fields.ts');

/** Models edited via dedicated admin components (still require staff userPool CRUD). */
const DEDICATED_EDITOR_MODELS = new Set(['EmailAlias']);

function extractClerkEditorModels(clerkTasksSource) {
  const models = new Set();
  const pattern = /model:\s*'([A-Za-z][A-Za-z0-9]*)'/g;
  for (const match of clerkTasksSource.matchAll(pattern)) {
    models.add(match[1]);
  }
  return [...models].sort();
}

function extractGenericAdminModels(modelFieldsSource) {
  const marker = 'export const CMS_MODEL_LIST_FIELDS';
  const start = modelFieldsSource.indexOf(marker);
  if (start === -1) {
    throw new Error('Could not find CMS_MODEL_LIST_FIELDS in cms-model-admin-fields.ts');
  }
  const blockStart = modelFieldsSource.indexOf('{', start);
  const blockEnd = modelFieldsSource.indexOf('} as const', blockStart);
  const block = modelFieldsSource.slice(blockStart + 1, blockEnd);
  return [...block.matchAll(/^\s*([A-Za-z][A-Za-z0-9]*):/gm)].map((m) => m[1]);
}

function loadInventory(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function assertInventoryFlags(inventory, clerkModels, genericModels) {
  const failures = [];
  const inventoryModels = new Map((inventory.models ?? []).map((entry) => [entry.model, entry]));

  for (const model of clerkModels) {
    const entry = inventoryModels.get(model);
    if (!entry) {
      failures.push(`missing inventory row for clerk model ${model}`);
      continue;
    }
    if (entry.clerkEditorModel !== true) {
      failures.push(`${model}: clerkEditorModel must be true (clerk task uses this model)`);
    }
    if (entry.staffUserPoolCrud !== true) {
      failures.push(`${model}: staffUserPoolCrud must be true (admin editor uses authMode userPool)`);
    }
  }

  if (!inventoryModels.has('SiteCopy')) {
    failures.push('SiteCopy must exist in cms-inventory.json');
  } else {
    const siteCopy = inventoryModels.get('SiteCopy');
    if (siteCopy.clerkEditorModel !== true) {
      failures.push('SiteCopy: clerkEditorModel must be true');
    }
    if (siteCopy.staffUserPoolCrud !== true) {
      failures.push('SiteCopy: staffUserPoolCrud must be true');
    }
    if (siteCopy.publicApiKeyRead !== true) {
      failures.push('SiteCopy: publicApiKeyRead must be true (public site reads via API key)');
    }
  }

  for (const model of genericModels) {
    if (!clerkModels.includes(model)) {
      continue;
    }
    if (DEDICATED_EDITOR_MODELS.has(model)) {
      continue;
    }
    if (!inventoryModels.has(model)) {
      failures.push(`generic admin model ${model} missing from inventory`);
    }
  }

  return failures;
}

function main() {
  const inventoryPath = existsSync(INVENTORY_PATH) ? INVENTORY_PATH : PUBLIC_INVENTORY_PATH;
  if (!existsSync(inventoryPath)) {
    console.error(
      `verify-staff-cms-editor-models: no cms-inventory.json found (tried ${INVENTORY_PATH}).`,
    );
    process.exit(1);
  }

  const clerkTasks = readFileSync(CLERK_TASKS_PATH, 'utf8');
  const modelFields = readFileSync(MODEL_FIELDS_PATH, 'utf8');
  const inventory = loadInventory(inventoryPath);
  const publicInventory = existsSync(PUBLIC_INVENTORY_PATH)
    ? loadInventory(PUBLIC_INVENTORY_PATH)
    : null;

  const clerkModels = extractClerkEditorModels(clerkTasks);
  const genericModels = extractGenericAdminModels(modelFields);

  const failures = [
    ...assertInventoryFlags(inventory, clerkModels, genericModels),
    ...(publicInventory
      ? assertInventoryFlags(publicInventory, clerkModels, genericModels).map(
          (msg) => `public/cms-inventory.json: ${msg}`,
        )
      : []),
  ];

  if (failures.length > 0) {
    console.error('verify-staff-cms-editor-models: FAILED');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `verify-staff-cms-editor-models: OK (${clerkModels.length} clerk models, SiteCopy flagged)`,
  );
}

main();
