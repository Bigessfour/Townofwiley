import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localSecretsPath = join(repoRoot, 'secrets', 'local', 'user-secrets.json');
const snapshotPath = join(repoRoot, 'public', 'cms-snapshot.json');

const PUBLIC_CMS_CORE_QUERY = `query GetPublicCmsCoreContent {
  listSiteSettings(limit: 1) {
    items {
      townName
      pageTitle
      heroEyebrow
      heroStatus
      heroTitle
      heroMessage
      heroSubtext
      heroImageUrl
      welcomeLabel
      welcomeHeading
      welcomeBody
      welcomeCaption
    }
  }
  listAlertBanners(limit: 20) {
    items {
      id
      enabled
      label
      title
      detail
      linkLabel
      linkHref
      updatedAt
    }
  }
  listAnnouncements(filter: { active: { eq: true } }, limit: 50) {
    items {
      id
      title
      date
      detail
      announcementKind
      attachmentKey
      priority
      imageUrl
      active
    }
  }
  listEvents(filter: { active: { eq: true } }, limit: 50) {
    items {
      id
      title
      description
      location
      start
      end
      active
    }
  }
  listOfficialContacts(limit: 50) {
    items {
      id
      label
      value
      detail
      href
      linkLabel
      displayOrder
    }
  }
}`;

const PUBLIC_DOCUMENT_FIELDS_LEGACY = `      id
      title
      summary
      sectionId
      status
      format
      href
      downloadFileName
      keywords
      active
      displayOrder`;

const PUBLIC_DOCUMENT_FIELDS_BILINGUAL = `      id
      title
      titleEs
      summary
      summaryEs
      sectionId
      status
      statusEs
      format
      href
      downloadFileName
      keywords
      active
      displayOrder`;

function buildExtendedCmsQuery(publicDocumentFields) {
  return `query GetPublicCmsExtendedContent {
  listBusinesses(filter: { active: { eq: true } }, limit: 100) {
    items {
      id
      name
      phone
      address
      website
      description
      imageUrl
      active
      displayOrder
    }
  }
  listPublicDocuments(filter: { active: { eq: true } }, limit: 100) {
    items {
${publicDocumentFields}
    }
  }
  listExternalNewsLinks(filter: { active: { eq: true } }, limit: 50) {
    items {
      id
      title
      url
      source
      active
      displayOrder
    }
  }
}`;
}

const PUBLIC_CMS_EXTENDED_QUERY_BILINGUAL = buildExtendedCmsQuery(PUBLIC_DOCUMENT_FIELDS_BILINGUAL);
const PUBLIC_CMS_EXTENDED_QUERY_LEGACY = buildExtendedCmsQuery(PUBLIC_DOCUMENT_FIELDS_LEGACY);

function readLocalSecrets() {
  if (!existsSync(localSecretsPath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(localSecretsPath, 'utf8'));
  } catch (error) {
    console.warn(`Unable to parse local secrets from ${localSecretsPath}: ${error.message}`);
    return {};
  }
}

function resolveGitSha() {
  if (process.env.GITHUB_SHA?.trim()) {
    return process.env.GITHUB_SHA.trim();
  }

  try {
    return execSync('git rev-parse HEAD', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
}

async function postGraphql(endpoint, apiKey, query) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`AppSync request failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(' '));
  }

  return payload.data ?? {};
}

function isPublicDocumentBilingualSchemaError(message) {
  return /FieldUndefined|titleEs|summaryEs|statusEs/.test(message);
}

async function fetchExtendedCmsData(endpoint, apiKey) {
  try {
    return await postGraphql(endpoint, apiKey, PUBLIC_CMS_EXTENDED_QUERY_BILINGUAL);
  } catch (error) {
    if (!isPublicDocumentBilingualSchemaError(error.message)) {
      throw error;
    }
    console.warn(
      'Live AppSync schema lacks PublicDocument titleEs/summaryEs/statusEs; snapshot uses legacy document fields until amplify push.',
    );
    return postGraphql(endpoint, apiKey, PUBLIC_CMS_EXTENDED_QUERY_LEGACY);
  }
}

function buildSnapshot(coreData, extendedData, buildSha) {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    buildSha,
    siteSettings: coreData.listSiteSettings?.items?.[0],
    alertBannerRecords: coreData.listAlertBanners?.items ?? [],
    noticeRecords: coreData.listAnnouncements?.items ?? [],
    eventRecords: coreData.listEvents?.items ?? [],
    contactRecords: coreData.listOfficialContacts?.items ?? [],
    businessRecords: extendedData.listBusinesses?.items ?? [],
    publicDocumentRecords: extendedData.listPublicDocuments?.items ?? [],
    externalNewsLinkRecords: extendedData.listExternalNewsLinks?.items ?? [],
  };
}

async function main() {
  const localSecrets = readLocalSecrets();
  const endpoint =
    process.env.APPSYNC_CMS_ENDPOINT?.trim() ||
    localSecrets.cms?.appSync?.apiEndpoint?.trim() ||
    '';
  const apiKey =
    process.env.APPSYNC_CMS_API_KEY?.trim() || localSecrets.cms?.appSync?.apiKey?.trim() || '';

  if (!endpoint || !apiKey) {
    console.warn('CMS AppSync credentials missing; skipping cms-snapshot.json generation.');
    return;
  }

  const [coreData, extendedData] = await Promise.all([
    postGraphql(endpoint, apiKey, PUBLIC_CMS_CORE_QUERY),
    fetchExtendedCmsData(endpoint, apiKey),
  ]);

  const snapshot = buildSnapshot(coreData, extendedData, resolveGitSha());
  writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`CMS snapshot written to ${snapshotPath}`);
}

main().catch((error) => {
  console.error(`Failed to generate CMS snapshot: ${error.message}`);
  process.exitCode = 1;
});
