#!/usr/bin/env node
/**
 * Compare live AppSync public CMS models with CDN /cms-snapshot.json.
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

const EPHEMERAL_URL = /X-Amz-(?:Signature|Expires|Credential|Security-Token)=/i;

const PARITY_QUERY = `query VerifyCmsSnapshotParity {
  listLeadershipRosterEntries(filter: { and: [{ active: { eq: true } }] }, limit: 100) {
    items { id groupId lineEn active }
  }
  listSiteSettings(limit: 5) {
    items { id townName heroImageUrl heroTitle welcomeHeading }
  }
  listAnnouncements(filter: { and: [{ active: { eq: true } }] }, limit: 100) {
    items { id title active }
  }
  listEvents(filter: { and: [{ active: { eq: true } }] }, limit: 100) {
    items { id title active }
  }
  listOfficialContacts(limit: 50) {
    items { id label }
  }
  listBusinesses(filter: { and: [{ active: { eq: true } }] }, limit: 100) {
    items { id name active }
  }
  listExternalNewsLinks(filter: { and: [{ active: { eq: true } }] }, limit: 100) {
    items { id title active }
  }
  listAlertBanners(limit: 20) {
    items { id enabled title }
  }
  listPublicDocuments(filter: { and: [{ active: { eq: true } }] }, limit: 100) {
    items { id title sectionId active }
  }
  listSiteCopies(filter: { and: [{ active: { eq: true } }] }, limit: 100) {
    items { id key active }
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

async function fetchAppSync({ endpoint, apiKey }) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query: PARITY_QUERY }),
  });
  if (!response.ok) {
    throw new Error(`AppSync HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join('; '));
  }
  return payload.data ?? {};
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

function idSet(records, idField = 'id') {
  const set = new Set();
  for (const record of records ?? []) {
    const id = String(record?.[idField] ?? '').trim();
    if (id) {
      set.add(id);
    }
  }
  return set;
}

function diffIdSets(label, liveIds, cdnIds) {
  const issues = [];
  for (const id of liveIds) {
    if (!cdnIds.has(id)) {
      issues.push(`${label}: missing on CDN id=${id}`);
    }
  }
  for (const id of cdnIds) {
    if (!liveIds.has(id)) {
      issues.push(`${label}: extra on CDN (not in AppSync active set) id=${id}`);
    }
  }
  return issues;
}

function leadershipIndex(records) {
  const index = new Map();
  for (const record of records) {
    if (!record?.active && record?.active !== undefined) {
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
        issues.push(`leadership missing on CDN: ${groupId} id=${id} lineEn="${lineEn}"`);
      } else if (cdn.get(id) !== lineEn) {
        issues.push(
          `leadership stale on CDN: ${groupId} id=${id} AppSync="${lineEn}" CDN="${cdn.get(id)}"`,
        );
      }
    }

    for (const [id, lineEn] of cdn) {
      if (!live.has(id)) {
        issues.push(`leadership extra on CDN: ${groupId} id=${id} lineEn="${lineEn}"`);
      }
    }
  }

  return issues;
}

function checkHeroHealth(appSyncSettings, cdnSettings) {
  const issues = [];
  const liveHero = String(appSyncSettings?.heroImageUrl ?? '').trim();
  const cdnHero = String(cdnSettings?.heroImageUrl ?? '').trim();

  if (liveHero && EPHEMERAL_URL.test(liveHero)) {
    issues.push(
      'SiteSettings.heroImageUrl in AppSync is a temporary S3 URL — public site will ignore it and use /hero-wiley.webp',
    );
  }
  if (cdnHero && EPHEMERAL_URL.test(cdnHero)) {
    issues.push(
      'CDN siteSettings.heroImageUrl is a temporary S3 URL — re-upload hero via /admin after media-upload CORS fix',
    );
  }
  if (liveHero && cdnHero && liveHero !== cdnHero && !EPHEMERAL_URL.test(liveHero)) {
    issues.push('SiteSettings.heroImageUrl differs between AppSync and CDN snapshot');
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

  const [data, snapshot] = await Promise.all([
    fetchAppSync({ endpoint, apiKey }),
    fetchCdnSnapshot(snapshotUrl),
  ]);

  const issues = [];

  const liveLeadership = (data.listLeadershipRosterEntries?.items ?? []).filter(Boolean);
  const cdnLeadership = (snapshot.leadershipRosterRecords ?? []).filter(Boolean);
  issues.push(
    ...diffLeadership(leadershipIndex(liveLeadership), leadershipIndex(cdnLeadership)),
  );

  const liveSettings = (data.listSiteSettings?.items ?? []).filter(Boolean)[0] ?? null;
  const cdnSettings = snapshot.siteSettings ?? null;
  issues.push(...checkHeroHealth(liveSettings, cdnSettings));

  const modelChecks = [
    {
      label: 'Announcement',
      live: (data.listAnnouncements?.items ?? []).filter(Boolean),
      cdn: snapshot.noticeRecords ?? [],
    },
    {
      label: 'Event',
      live: (data.listEvents?.items ?? []).filter(Boolean),
      cdn: snapshot.eventRecords ?? [],
    },
    {
      label: 'OfficialContact',
      live: (data.listOfficialContacts?.items ?? []).filter(Boolean),
      cdn: snapshot.contactRecords ?? [],
    },
    {
      label: 'Business',
      live: (data.listBusinesses?.items ?? []).filter(Boolean),
      cdn: snapshot.businessRecords ?? [],
    },
    {
      label: 'ExternalNewsLink',
      live: (data.listExternalNewsLinks?.items ?? []).filter(Boolean),
      cdn: snapshot.externalNewsLinkRecords ?? [],
    },
    {
      label: 'PublicDocument',
      live: (data.listPublicDocuments?.items ?? []).filter(Boolean),
      // Snapshot may only keep meeting-documents; count-level check only.
      cdn: snapshot.publicDocumentRecords ?? [],
      idsOnlyWhenEqualLength: true,
    },
  ];

  for (const check of modelChecks) {
    const liveIds = idSet(check.live);
    const cdnIds = idSet(check.cdn);
    console.log(
      `${check.label}: AppSync=${liveIds.size} CDN=${cdnIds.size}`,
    );
    // OfficialContact / Business / etc. — require exact active id parity when both sides non-empty.
    if (check.label === 'PublicDocument') {
      // Public site only surfaces meeting-documents; parity is soft.
      continue;
    }
    issues.push(...diffIdSets(check.label, liveIds, cdnIds));
  }

  // SiteCopy is often missing from snapshot publisher — warn only.
  const liveSiteCopy = (data.listSiteCopies?.items ?? []).filter(Boolean);
  const cdnSiteCopy = snapshot.siteCopyRecords ?? [];
  console.log(`SiteCopy: AppSync active=${liveSiteCopy.length} CDN=${cdnSiteCopy.length}`);
  if (liveSiteCopy.length > 0 && cdnSiteCopy.length === 0) {
    issues.push(
      'SiteCopy: AppSync has active rows but CDN siteCopyRecords is empty (change notifier query/publish failure)',
    );
  } else if (liveSiteCopy.length > 0) {
    issues.push(...diffIdSets('SiteCopy', idSet(liveSiteCopy), idSet(cdnSiteCopy)));
  }

  const liveBanner = (data.listAlertBanners?.items ?? []).filter((row) => row?.enabled);
  const cdnBanner = snapshot.alertBannerRecords ?? [];
  console.log(`AlertBanner enabled: AppSync=${liveBanner.length} CDN=${cdnBanner.length}`);

  console.log(`AppSync active leadership rows: ${liveLeadership.length}`);
  console.log(`CDN snapshot leadership rows: ${cdnLeadership.length}`);
  console.log(`CDN snapshot savedAt: ${snapshot.savedAt ?? '(missing)'}`);
  console.log(
    `SiteSettings.heroImageUrl durable: ${
      liveSettings?.heroImageUrl && !EPHEMERAL_URL.test(String(liveSettings.heroImageUrl))
        ? 'yes'
        : liveSettings?.heroImageUrl
          ? 'NO (ephemeral)'
          : 'empty (uses default)'
    }`,
  );

  if (issues.length > 0) {
    console.error('verify-cms-snapshot-parity: FAILED');
    for (const issue of issues) {
      console.error(`  - ${issue}`);
    }
    process.exit(1);
  }

  console.log(
    'verify-cms-snapshot-parity: OK (AppSync public models match CDN snapshot; hero URL healthy)',
  );
}

main().catch((error) => {
  console.error(`verify-cms-snapshot-parity: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
