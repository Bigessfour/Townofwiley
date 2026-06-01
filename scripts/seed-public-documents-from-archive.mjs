#!/usr/bin/env node
/**
 * Upserts PublicDocument rows from the former static document-archive manifest.
 *
 * Usage:
 *   APPSYNC_CMS_ENDPOINT=... APPSYNC_CMS_API_KEY=... node scripts/seed-public-documents-from-archive.mjs
 *   node scripts/seed-public-documents-from-archive.mjs --dry-run
 *
 * Requires IAM or API key auth that can create/update PublicDocument (staff deploy role).
 * After schema deploy, run once per environment, then verify /documents with CMS-only frontend.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

/** Inline seed rows (mirrors src/app/document-hub/document-archive-seed-data.ts). */
const SEED_DOCUMENTS = [
  {
    id: 'records-request-checklist',
    sectionId: 'records-requests',
    title: 'Public Records Request Checklist',
    titleEs: 'Lista para solicitudes de registros publicos',
    summary:
      'A downloadable checklist that tells residents what details to include when they need a public record, accessible copy, packet, or follow-up from the Clerk.',
    summaryEs:
      'Una lista descargable que indica que detalles debe incluir el residente cuando necesita un registro publico, una copia accesible, un paquete o seguimiento de la secretaria.',
    status: 'Published guide',
    statusEs: 'Guia publicada',
    format: 'HTML reference',
    href: '/documents/archive/public-records-request-checklist.html',
    downloadFileName: 'public-records-request-checklist.html',
    keywords: ['records', 'foia', 'checklist', 'clerk', 'accessible copy', 'public request'],
    displayOrder: 10,
  },
  {
    id: 'city-council-meeting-access-guide',
    sectionId: 'meeting-documents',
    title: 'City Council Meeting Access Guide',
    titleEs: 'Guia de acceso a reuniones del concejo municipal',
    summary:
      'A public meeting-reference file covering the second-Monday meeting schedule, agenda timing, packet follow-up, and approved-minute routing.',
    summaryEs:
      'Una guia publica sobre la reunion del segundo lunes, los tiempos de agenda, el seguimiento de paquetes y la ruta para minutas aprobadas.',
    status: 'Published guide',
    statusEs: 'Guia publicada',
    format: 'HTML reference',
    href: '/documents/archive/city-council-meeting-access-guide.html',
    downloadFileName: 'city-council-meeting-access-guide.html',
    keywords: ['city council', 'meeting', 'agenda', 'packet', 'minutes', 'second monday'],
    displayOrder: 20,
  },
  {
    id: 'planning-zoning-hearing-guide',
    sectionId: 'meeting-documents',
    title: 'Planning and Zoning Hearing Guide',
    titleEs: 'Guia de audiencias de planeacion y zonificacion',
    summary:
      'A public hearing-reference file covering the first-Thursday schedule, hearing support materials, map follow-up, and request routing.',
    summaryEs:
      'Una guia publica sobre el horario del primer jueves, los materiales de apoyo, los mapas y la ruta correcta de seguimiento.',
    status: 'Published guide',
    statusEs: 'Guia publicada',
    format: 'HTML reference',
    href: '/documents/archive/planning-zoning-hearing-guide.html',
    downloadFileName: 'planning-zoning-hearing-guide.html',
    keywords: ['planning', 'zoning', 'hearing', 'maps', 'staff report', 'first thursday'],
    displayOrder: 30,
  },
  {
    id: 'budget-and-annual-reports-guide',
    sectionId: 'financial-documents',
    title: 'Budget and Annual Reports Guide',
    titleEs: 'Guia de presupuestos e informes anuales',
    summary:
      'A resident-facing guide that explains where budget summaries and annual reports belong and how to request current finance documents.',
    summaryEs:
      'Una guia para residentes que explica donde deben publicarse los resumenes de presupuesto e informes anuales y como solicitar documentos financieros actuales.',
    status: 'Published guide',
    statusEs: 'Guia publicada',
    format: 'HTML reference',
    href: '/documents/archive/budget-and-annual-reports-guide.html',
    downloadFileName: 'budget-and-annual-reports-guide.html',
    keywords: ['budget', 'annual report', 'finance', 'audit', 'town budget'],
    displayOrder: 40,
  },
  {
    id: 'ordinance-and-code-reference-guide',
    sectionId: 'code-references',
    title: 'Ordinance and Code Reference Guide',
    titleEs: 'Guia de ordenanzas y referencias de codigo',
    summary:
      'A public reference file for ordinance lookups, code questions, and the best clerk follow-up path when a specific file is not posted yet.',
    summaryEs:
      'Una referencia publica para buscar ordenanzas, resolver preguntas sobre el codigo y dirigir el seguimiento correcto con la secretaria.',
    status: 'Published guide',
    statusEs: 'Guia publicada',
    format: 'HTML reference',
    href: '/documents/archive/ordinance-and-code-reference-guide.html',
    downloadFileName: 'ordinance-and-code-reference-guide.html',
    keywords: ['ordinance', 'code', 'municipal code', 'lookup', 'clerk'],
    displayOrder: 50,
  },
  {
    id: 'zoning-and-permit-reference-guide',
    sectionId: 'code-references',
    title: 'Zoning and Permit Reference Guide',
    titleEs: 'Guia de zonificacion y permisos',
    summary:
      'A downloadable guide for zoning references, permit support materials, and the structured follow-up path for residents and contractors.',
    summaryEs:
      'Una guia descargable para referencias de zonificacion, materiales de apoyo para permisos y la ruta estructurada de seguimiento para residentes y contratistas.',
    status: 'Published guide',
    statusEs: 'Guia publicada',
    format: 'HTML reference',
    href: '/documents/archive/zoning-and-permit-reference-guide.html',
    downloadFileName: 'zoning-and-permit-reference-guide.html',
    keywords: ['zoning', 'permit', 'contractor', 'land use', 'application'],
    displayOrder: 60,
  },
];

const CREATE_MUTATION = /* GraphQL */ `
  mutation CreatePublicDocument($input: CreatePublicDocumentInput!) {
    createPublicDocument(input: $input) {
      id
    }
  }
`;

const UPDATE_MUTATION = /* GraphQL */ `
  mutation UpdatePublicDocument($input: UpdatePublicDocumentInput!) {
    updatePublicDocument(input: $input) {
      id
    }
  }
`;

const GET_QUERY = /* GraphQL */ `
  query GetPublicDocument($id: ID!) {
    getPublicDocument(id: $id) {
      id
    }
  }
`;

function readLocalSecrets() {
  const secretsPath = join(repoRoot, '.local-secrets.json');
  try {
    return JSON.parse(readFileSync(secretsPath, 'utf8'));
  } catch {
    return {};
  }
}

function toInput(doc) {
  return {
    id: doc.id,
    title: doc.title,
    titleEs: doc.titleEs,
    summary: doc.summary,
    summaryEs: doc.summaryEs,
    sectionId: doc.sectionId,
    status: doc.status,
    statusEs: doc.statusEs,
    format: doc.format,
    href: doc.href,
    downloadFileName: doc.downloadFileName,
    keywords: doc.keywords,
    active: true,
    displayOrder: doc.displayOrder,
  };
}

async function postGraphql(endpoint, apiKey, query, variables) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`AppSync HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(' '));
  }

  return payload.data;
}

async function documentExists(endpoint, apiKey, id) {
  const data = await postGraphql(endpoint, apiKey, GET_QUERY, { id });
  return Boolean(data?.getPublicDocument?.id);
}

async function upsertDocument(endpoint, apiKey, doc, dryRun) {
  const input = toInput(doc);
  if (dryRun) {
    console.log(`[dry-run] would upsert ${doc.id}`);
    return;
  }

  const exists = await documentExists(endpoint, apiKey, doc.id);
  const mutation = exists ? UPDATE_MUTATION : CREATE_MUTATION;
  const variableKey = exists ? 'input' : 'input';
  await postGraphql(endpoint, apiKey, mutation, { [variableKey]: input });
  console.log(`${exists ? 'Updated' : 'Created'} PublicDocument ${doc.id}`);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const exportOnly = process.argv.includes('--export-json');
  const localSecrets = readLocalSecrets();
  const endpoint =
    process.env.APPSYNC_CMS_ENDPOINT?.trim() ||
    localSecrets.cms?.appSync?.apiEndpoint?.trim() ||
    '';
  const apiKey =
    process.env.APPSYNC_CMS_API_KEY?.trim() || localSecrets.cms?.appSync?.apiKey?.trim() || '';

  const exportPath = join(repoRoot, 'docs/public-document-seed-export.json');
  const payload = SEED_DOCUMENTS.map(toInput);
  writeFileSync(exportPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${exportPath} (${payload.length} rows)`);

  if (exportOnly) {
    return;
  }

  if (!endpoint || !apiKey) {
    console.warn(
      'APPSYNC_CMS_ENDPOINT and APPSYNC_CMS_API_KEY required to upsert Studio rows. Use --export-json for manual import.',
    );
    process.exitCode = dryRun ? 0 : 1;
    return;
  }

  for (const doc of SEED_DOCUMENTS) {
    await upsertDocument(endpoint, apiKey, doc, dryRun);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
