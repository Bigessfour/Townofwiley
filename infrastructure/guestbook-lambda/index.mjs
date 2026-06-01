/**
 * Hello-from guestbook Lambda
 *
 * Public:
 *   POST /visit    – log page visit with coarse geo
 *   POST /message  – publish a "Hello from …" message
 *   GET  /messages – list published messages
 *
 * Staff (Cognito access token, Staff group):
 *   GET  /admin/logs – all visits and messages
 *
 * Env:
 *   TABLE_NAME, IP_HASH_SALT, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, STAFF_GROUP
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { randomUUID } from 'node:crypto';
import {
    extractClientIp,
    hashIp,
    lookupGeoFromIp,
    readCloudFrontGeo,
} from './geo-lookup.mjs';
import { sanitizeMessageBody, sanitizeVisitBody } from './sanitize.mjs';

const TABLE_NAME = process.env.TABLE_NAME ?? 'TownOfWileyGuestbook';
const IP_HASH_SALT = process.env.IP_HASH_SALT ?? 'townofwiley-guestbook';
const STAFF_GROUP = process.env.STAFF_GROUP ?? 'Staff';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? '';
const CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? '';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** @type {import('aws-jwt-verify').CognitoJwtVerifier | null} */
let jwtVerifier = null;

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

function corsHeaders(origin, methods = 'GET, POST, OPTIONS') {
  const allowOrigin =
    origin && (origin === DEFAULT_ALLOWED_ORIGIN || origin.endsWith('.townofwiley.gov'))
      ? origin
      : DEFAULT_ALLOWED_ORIGIN;
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function normalizePath(event) {
  const raw = event.requestContext?.http?.path ?? event.rawPath ?? '/';
  const path = raw.replace(/\/+$/, '') || '/';
  return path.endsWith('/default') ? '/' : path.replace(/^\/default/, '') || '/';
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
    if (!Array.isArray(groups)) {
      return false;
    }
    return groups.includes(STAFF_GROUP);
  } catch {
    return false;
  }
}

async function scanAll() {
  let items = [];
  let lastKey;

  do {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      }),
    );
    items = items.concat(result.Items ?? []);
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  items.sort((a, b) => String(b.timestamp ?? '').localeCompare(String(a.timestamp ?? '')));
  return items;
}

/**
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event
 */
async function resolveGeo(event) {
  const headers = headerMap(event.headers);
  const cf = readCloudFrontGeo(headers);
  if (cf?.countryCode) {
    return { ...cf, geoSource: 'cloudfront' };
  }
  const ip = extractClientIp(headers['x-forwarded-for']);
  const geo = await lookupGeoFromIp(ip);
  if (geo) {
    return { ...geo, geoSource: 'ip-api' };
  }
  return {
    countryCode: '',
    countryName: '',
    region: '',
    city: '',
    lat: 0,
    lng: 0,
    geoSource: 'unknown',
  };
}

async function handleVisit(event, headers) {
  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const sanitized = sanitizeVisitBody(body);
  const h = headerMap(event.headers);
  const ip = extractClientIp(h['x-forwarded-for']);
  const geo = await resolveGeo(event);

  const item = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...sanitized,
    ipHash: hashIp(ip, IP_HASH_SALT),
    countryCode: geo.countryCode,
    countryName: geo.countryName,
    region: geo.region,
    city: geo.city,
    lat: geo.lat,
    lng: geo.lng,
    geoSource: geo.geoSource,
    userAgent: String(h['user-agent'] ?? '').slice(0, 240),
  };

  await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ ok: true, id: item.id }),
  };
}

async function handleMessage(event, headers) {
  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const sanitized = sanitizeMessageBody(body);
  if ('error' in sanitized) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: sanitized.error }) };
  }

  const item = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...sanitized,
  };

  await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ ok: true, id: item.id }),
  };
}

async function handlePublicMessages(headers) {
  const items = await scanAll();
  const messages = items
    .filter((row) => row.kind === 'message' && row.status === 'published')
    .map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      message: row.message,
      displayName: row.displayName,
      placeLabel: row.placeLabel,
      countryCode: row.countryCode,
      lat: row.lat,
      lng: row.lng,
      locale: row.locale,
    }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(messages),
  };
}

async function handleAdminLogs(event, headers) {
  const isStaff = await assertStaff(event);
  if (!isStaff) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Staff sign-in required.' }),
    };
  }

  const items = await scanAll();
  const logs = items.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    kind: row.kind,
    message: row.message ?? '',
    displayName: row.displayName ?? '',
    placeLabel: row.placeLabel ?? '',
    countryCode: row.countryCode ?? '',
    countryName: row.countryName ?? '',
    region: row.region ?? '',
    city: row.city ?? '',
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    geoSource: row.geoSource ?? '',
    pagePath: row.pagePath ?? '',
    source: row.source ?? '',
    locale: row.locale ?? '',
    ipHash: row.ipHash ?? '',
    userAgent: row.userAgent ?? '',
    status: row.status ?? '',
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(logs),
  };
}

export const handler = async (event) => {
  const origin = event.headers?.origin ?? event.headers?.Origin ?? '';
  const method = event.requestContext?.http?.method ?? 'GET';
  const path = normalizePath(event);

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin) };
  }

  const headers = corsHeaders(origin);

  try {
    if (method === 'POST' && (path === '/visit' || path.endsWith('/visit'))) {
      return await handleVisit(event, headers);
    }
    if (method === 'POST' && (path === '/message' || path.endsWith('/message'))) {
      return await handleMessage(event, headers);
    }
    if (method === 'GET' && (path === '/messages' || path.endsWith('/messages'))) {
      return await handlePublicMessages(headers);
    }
    if (method === 'GET' && (path === '/admin/logs' || path.endsWith('/admin/logs'))) {
      return await handleAdminLogs(event, headers);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (err) {
    console.error('Guestbook handler failed', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error' }),
    };
  }
};
