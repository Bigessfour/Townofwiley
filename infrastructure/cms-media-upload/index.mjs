/**
 * Staff CMS media upload — presigned S3 PUT + CloudFront cache invalidation.
 *
 * POST /presign  — Cognito Staff access token → presigned upload URL
 * POST /complete — after client PUT → invalidate CloudFront paths for section
 *
 * Env: DOCUMENTS_BUCKET, STATIC_SITE_BUCKET, CF_DISTRIBUTION_ID,
 *      COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, STAFF_GROUP, PUBLIC_SITE_ORIGIN
 */

import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import {
    buildStorageKey,
    resolveBucketForKey,
    resolveSectionRule,
} from './cms-media-lib.mjs';

const CF_DISTRIBUTION_ID = process.env.CF_DISTRIBUTION_ID ?? 'E1NZ3XCY5CYR1J';
const STAFF_GROUP = process.env.STAFF_GROUP ?? 'Staff';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? '';
const CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? '';
const PUBLIC_SITE_ORIGIN = (process.env.PUBLIC_SITE_ORIGIN ?? 'https://townofwiley.gov').replace(
  /\/$/,
  '',
);
const PRESIGN_TTL_SECONDS = Number.parseInt(process.env.PRESIGN_TTL_SECONDS ?? '900', 10);

const s3 = new S3Client({});
const cloudfront = new CloudFrontClient({});

/** @type {import('aws-jwt-verify').CognitoJwtVerifier | null} */
let jwtVerifier = null;

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function getJwtVerifier() {
  if (!USER_POOL_ID || !CLIENT_ID) {
    return null;
  }
  if (!jwtVerifier) {
    jwtVerifier = CognitoJwtVerifier.create({
      userPoolId: USER_POOL_ID,
      tokenUse: 'access',
      clientId: CLIENT_ID,
    });
  }
  return jwtVerifier;
}

const DEFAULT_ALLOWED_ORIGIN = 'https://www.townofwiley.gov';

function corsHeaders(origin, methods = 'POST, OPTIONS') {
  const allowOrigin =
    origin && (origin === DEFAULT_ALLOWED_ORIGIN || origin.endsWith('.townofwiley.gov'))
      ? origin
      : DEFAULT_ALLOWED_ORIGIN;
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
}

function jsonResponse(statusCode, body, origin) {
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: JSON.stringify(body),
  };
}

/**
 * @param {Record<string, string | undefined>} headers
 */
function headerMap(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    out[key.toLowerCase()] = value;
  }
  return out;
}

function normalizePath(event) {
  const raw = event.requestContext?.http?.path ?? event.rawPath ?? '/';
  const path = raw.replace(/\/+$/, '') || '/';
  return path.endsWith('/default') ? '/' : path.replace(/^\/default/, '') || '/';
}

async function assertStaff(event) {
  const verifier = getJwtVerifier();
  if (!verifier) {
    return false;
  }
  const headers = headerMap(event.headers);
  const auth = headers.authorization ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    return false;
  }
  try {
    const payload = await verifier.verify(token);
    const groups = payload['cognito:groups'];
    return Array.isArray(groups) && groups.includes(STAFF_GROUP);
  } catch {
    return false;
  }
}

export async function createPresignedUpload({ sectionId, fileName, contentType }) {
  const normalizedType = String(contentType ?? '').trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(normalizedType)) {
    throw new Error(`Unsupported content type: ${contentType || '(missing)'}`);
  }

  const rule = resolveSectionRule(sectionId);
  const storageKey = buildStorageKey(sectionId, fileName);
  const bucket = rule.bucket;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    ContentType: normalizedType,
    Metadata: {
      sectionid: rule.sectionId,
      originalname: String(fileName ?? '').slice(0, 200),
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: PRESIGN_TTL_SECONDS });

  const publicUrl = rule.usePublicSiteUrl
    ? `${PUBLIC_SITE_ORIGIN}/${storageKey}`
    : undefined;

  return {
    storageKey,
    uploadUrl,
    bucket,
    sectionId: rule.sectionId,
    publicUrl,
    cfPaths: rule.cfPaths,
  };
}

export async function invalidateCloudFrontPaths(paths) {
  const uniquePaths = [...new Set((paths ?? []).map((path) => String(path).trim()).filter(Boolean))];
  if (!CF_DISTRIBUTION_ID || uniquePaths.length === 0) {
    return null;
  }

  const result = await cloudfront.send(
    new CreateInvalidationCommand({
      DistributionId: CF_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: `cms-media-${Date.now()}`,
        Paths: {
          Quantity: uniquePaths.length,
          Items: uniquePaths,
        },
      },
    }),
  );

  return result.Invalidation?.Id ?? null;
}

export async function completeUpload({ storageKey, sectionId }) {
  const rule = resolveSectionRule(sectionId);
  const bucket = resolveBucketForKey(storageKey);
  const invalidationId = await invalidateCloudFrontPaths(rule.cfPaths);

  return {
    storageKey,
    bucket,
    sectionId: rule.sectionId,
    invalidationId,
    cfPaths: rule.cfPaths,
  };
}

function parseJsonBody(event) {
  if (!event.body) {
    return {};
  }
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  return JSON.parse(raw);
}

export async function handler(event) {
  const origin = headerMap(event.headers).origin ?? '';
  const method = event.requestContext?.http?.method ?? event.httpMethod ?? 'GET';
  const path = normalizePath(event);

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(origin),
      body: '',
    };
  }

  if (!(await assertStaff(event))) {
    return jsonResponse(401, { error: 'Staff sign-in required.' }, origin);
  }

  let body;
  try {
    body = parseJsonBody(event);
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' }, origin);
  }

  try {
    if (method === 'POST' && (path === '/presign' || path.endsWith('/presign'))) {
      const result = await createPresignedUpload({
        sectionId: body.sectionId,
        fileName: body.fileName,
        contentType: body.contentType,
      });
      return jsonResponse(200, result, origin);
    }

    if (method === 'POST' && (path === '/complete' || path.endsWith('/complete'))) {
      const storageKey = String(body.storageKey ?? '').trim();
      if (!storageKey || storageKey.includes('..')) {
        return jsonResponse(400, { error: 'storageKey is required.' }, origin);
      }
      const result = await completeUpload({
        storageKey,
        sectionId: body.sectionId,
      });
      return jsonResponse(200, result, origin);
    }

    return jsonResponse(404, { error: 'Not found.' }, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload request failed.';
    return jsonResponse(400, { error: message }, origin);
  }
}
