#!/usr/bin/env node
/**
 * Compare live AppSync leadership roster rows with the public CDN cms-snapshot.json.
 * Catches clerk saves that reached DynamoDB but never appeared on the static snapshot
 * (stale deploy overwrite, Lambda publish failure, etc.).
 *
 * Usage:
 *   npm run verify:cms-snapshot-parity
 *   CMS_SNAPSHOT_URL=https://townofwiley.gov/cms-snapshot.json npm run verify:cms-snapshot-parity
 *
 * Requires APPSYNC_CMS_ENDPOINT + APPSYNC_CMS_API_KEY (or secrets/local/user-secrets.json).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localSecretsPath = join(repoRoot, 'secrets', 'local', 'user-secrets.json');

const LEADERSHIP_QUERY = `query VerifyLeadershipRoster {
  listLeadershipRosterEntries(filter: { and: [{ active: { eq: true } }] }, limit: 50) {
    items { id groupId lineEn active }
  }
}`;

function readSecrets() {
  if (!existsSync(localSecretsPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(localSecretsPath, 'utf8'));
  } catch {
    return {};
  }
}

function resolveAppSyncConfig() {
  const secrets = readSecrets();
  const endpoint =
    process.env.APPSYNC_CMS_ENDPOINT?.trim() ||
    secrets.APPSYNC_CMS_ENDPOINT?.trim() ||
    secrets.APPSYNC_GRAPHQL_ENDPOINT?.trim() ||
    '';
  const apiKey =
    process.env.APPSYNC_CMS_API_KEY?.trim() ||
    secrets.APPSYNC_CMS_API_KEY?.trim() ||
    secrets.APPSYNC_API_KEY?.trim() ||
    '';
  return { endpoint, apiKey };
}

async function fetchAppSyncLeadership({ endpoint, apiKey }) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query: LEADERSHIP_QUERY }),
  });
  if (!response.ok) {
    throw new Error(`AppSync HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join('; '));
  }
  return payload.data?.listLeadershipRosterEntries?.items ?? [];
}

async function fetchCdnSnapshot(snapshotUrl) {
  const response = await fetch(snapshotUrl, {
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) {
    throw new Error(`CDN snapshot HTTP ${response.status}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) {
    throw new Error(`CDN snapshot Content-Type is "${contentType}" (expected JSON, not SPA HTML)`);
  }
  return response.json();
}

function leadershipIndex(records) {
  const index = new Map();
  for (const record of records) {
    if (!record?.active) {
      continue;
    }
    const groupId = String(record.groupId ?? '').trim();
    const id = String(record.id ?? '').trim();
    const lineEn = String(record.lineEn ?? '').trim();
    if (!groupId || !id) {
      continue;
    }
    const bucket = index.get(groupId) ?? new Map();
    bucket.set(id, lineEn);
    index.set(groupId, bucket);
  }
  return index;
}

function diffLeadership(appSyncIndex, cdnIndex) {
  const issues = [];
  const groups = new Set([...appSyncIndex.keys(), ...cdnIndex.keys()]);

  for (const groupId of [...groups].sort()) {
    const live = appSyncIndex.get(groupId) ?? new Map();
    const cdn = cdnIndex.get(groupId) ?? new Map();

    for (const [id, lineEn] of live) {
      if (!cdn.has(id)) {
        issues.push(`missing on CDN: ${groupId} id=${id} lineEn="${lineEn}"`);
      } else if (cdn.get(id) !== lineEn) {
        issues.push(`stale on CDN: ${groupId} id=${id} AppSync="${lineEn}" CDN="${cdn.get(id)}"`);
      }
    }

    for (const [id, lineEn] of cdn) {
      if (!live.has(id)) {
        issues.push(`extra on CDN (not in AppSync): ${groupId} id=${id} lineEn="${lineEn}"`);
      }
    }
  }

  return issues;
}

async function main() {
  const snapshotUrl =
    process.env.CMS_SNAPSHOT_URL?.trim() || 'https://townofwiley.gov/cms-snapshot.json';
  const { endpoint, apiKey } = resolveAppSyncConfig();

  if (!endpoint || !apiKey) {
    console.warn(
      'verify-cms-snapshot-parity: skip — set APPSYNC_CMS_ENDPOINT and APPSYNC_CMS_API_KEY',
    );
    process.exit(0);
  }

  const [appSyncItems, snapshot] = await Promise.all([
    fetchAppSyncLeadership({ endpoint, apiKey }),
    fetchCdnSnapshot(snapshotUrl),
  ]);

  const appSyncRecords = appSyncItems.filter(Boolean);
  const cdnRecords = (snapshot.leadershipRosterRecords ?? []).filter(Boolean);
  const issues = diffLeadership(leadershipIndex(appSyncRecords), leadershipIndex(cdnRecords));

  console.log(`AppSync active leadership rows: ${appSyncRecords.length}`);
  console.log(`CDN snapshot leadership rows: ${cdnRecords.length}`);
  console.log(`CDN snapshot savedAt: ${snapshot.savedAt ?? '(missing)'}`);

  if (issues.length > 0) {
    console.error('verify-cms-snapshot-parity: FAILED');
    for (const issue of issues) {
      console.error(`  - ${issue}`);
    }
    process.exit(1);
  }

  console.log('verify-cms-snapshot-parity: OK (AppSync leadership roster matches CDN snapshot)');
}

main().catch((error) => {
  console.error(`verify-cms-snapshot-parity: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
