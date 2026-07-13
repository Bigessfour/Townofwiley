#!/usr/bin/env node
/**
 * Point Town EmailAlias rows at the clerk's new ISP inbox and retire CenturyTel destinations.
 *
 * Public addresses stay @townofwiley.gov (SES ingress). destinationAddress is the staff
 * mailbox at SECOM (or any provider) — not clerk@townofwiley.gov (that would loop).
 *
 * Usage:
 *   TOWN_MAIL_DESTINATION=clerk-inbox@example.com npm run mail:forwarding:configure
 *   npm run mail:forwarding:configure -- --destination clerk-inbox@example.com --dry-run
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bindingsPath = join(repoRoot, 'infrastructure', 'gen1-production-bindings.json');

const PRIMARY_ALIAS = 'clerk@townofwiley.gov';
const SECONDARY_ALIASES = ['deb.dillon@townofwiley.gov'];
const RETIRED_DESTINATION_FRAGMENTS = ['centurytel.net', 'centurylink.net'];

function parseArgs(argv) {
  let destination = process.env.TOWN_MAIL_DESTINATION?.trim() ?? '';
  let dryRun = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--destination' && argv[i + 1]) {
      destination = argv[++i].trim();
    } else if (argv[i] === '--dry-run') {
      dryRun = true;
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(
        'Usage: configure-town-mail-forwarding.mjs --destination <staff-inbox@isp> [--dry-run]',
      );
      process.exit(0);
    }
  }
  return { destination, dryRun };
}

function loadAliasTable() {
  const bindings = JSON.parse(readFileSync(bindingsPath, 'utf8'));
  const table = bindings.emailAliasRouter?.emailAliasTable;
  const region = bindings.emailAliasRouter?.emailAliasTableRegion ?? 'us-east-2';
  if (!table) {
    throw new Error('Missing emailAliasRouter.emailAliasTable in gen1-production-bindings.json');
  }
  return { table, region };
}

function awsJson(args, region) {
  const output = execFileSync('aws', [...args, '--region', region, '--output', 'json'], {
    encoding: 'utf8',
  });
  return JSON.parse(output || '{}');
}

function normalizeEmail(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function main() {
  const { destination, dryRun } = parseArgs(process.argv);
  if (!destination || !destination.includes('@')) {
    console.error(
      'Set TOWN_MAIL_DESTINATION or pass --destination with the SECOM (or new ISP) inbox where clerk mail should land.',
    );
    process.exit(1);
  }

  const { table, region } = loadAliasTable();
  const scan = awsJson(
    ['dynamodb', 'scan', '--table-name', table, '--projection-expression', 'id, aliasAddress, destinationAddress, active'],
    region,
  );
  const now = new Date().toISOString();
  const plans = [];

  for (const item of scan.Items ?? []) {
    const id = item.id?.S;
    const alias = normalizeEmail(item.aliasAddress?.S);
    const currentDest = normalizeEmail(item.destinationAddress?.S);
    if (!id || !alias) {
      continue;
    }

    const isPrimary = alias === PRIMARY_ALIAS;
    const isSecondary = SECONDARY_ALIASES.includes(alias);
    const isRetiredDest = RETIRED_DESTINATION_FRAGMENTS.some((frag) => currentDest.includes(frag));
    const isTypoSteve = alias === 'steve.mckirick@townofwiley.gov';

    if (isTypoSteve) {
      plans.push({ id, alias, action: 'deactivate', reason: 'typo alias; use steve.mckitrick@ if needed' });
      continue;
    }

    if (isPrimary || isSecondary || isRetiredDest) {
      plans.push({
        id,
        alias,
        action: 'forward',
        destination,
        active: true,
        notes: isPrimary
          ? 'Primary Town clerk ingress (public clerk@townofwiley.gov).'
          : 'Forwards to same clerk inbox as clerk@; original To preserved in X-Town-Alias.',
      });
    }
  }

  if (!plans.some((p) => p.alias === PRIMARY_ALIAS && p.action === 'forward')) {
    console.warn(
      `Warning: no EmailAlias row for ${PRIMARY_ALIAS}. Create it in /admin → Manage email forwarding before going live.`,
    );
  }

  console.log(JSON.stringify({ table, region, destination, dryRun, plans }, null, 2));

  if (dryRun) {
    return;
  }

  for (const plan of plans) {
    if (plan.action === 'deactivate') {
      execFileSync(
        'aws',
        [
          'dynamodb',
          'update-item',
          '--table-name',
          table,
          '--key',
          JSON.stringify({ id: { S: plan.id } }),
          '--update-expression',
          'SET active = :active, updatedAt = :now, notes = :notes',
          '--expression-attribute-values',
          JSON.stringify({
            ':active': { BOOL: false },
            ':now': { S: now },
            ':notes': { S: plan.reason },
          }),
        ],
        { stdio: 'inherit', encoding: 'utf8' },
      );
      continue;
    }

    execFileSync(
      'aws',
      [
        'dynamodb',
        'update-item',
        '--table-name',
        table,
        '--key',
        JSON.stringify({ id: { S: plan.id } }),
        '--update-expression',
        'SET destinationAddress = :dest, active = :active, updatedAt = :now, notes = :notes',
        '--expression-attribute-values',
        JSON.stringify({
          ':dest': { S: destination },
          ':active': { BOOL: true },
          ':now': { S: now },
          ':notes': { S: plan.notes },
        }),
      ],
      { stdio: 'inherit', encoding: 'utf8' },
    );
  }

  console.log('EmailAlias rows updated. Redeploy the router and re-enable SES ingress when ready.');
}

main();