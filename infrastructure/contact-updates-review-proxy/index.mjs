/**
 * Contact Updates Review Proxy (AP-05b)
 *
 * Public Function URL (AuthType NONE) with CORS restricted to the town site.
 * Signs requests with the execution role and forwards GET to the IAM-protected
 * TownOfWileyContactUpdatesReview Function URL. Never expose the review URL to browsers.
 *
 * Environment:
 *   REVIEW_FUNCTION_URL – IAM Function URL of TownOfWileyContactUpdatesReview
 *   ALLOWED_ORIGIN      – e.g. https://www.townofwiley.gov
 */

import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { isAllowedOrigin } from './origin-check.mjs';

const REVIEW_FUNCTION_URL = process.env.REVIEW_FUNCTION_URL?.trim() ?? '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN?.trim() ?? 'https://www.townofwiley.gov';
const AWS_REGION = process.env.AWS_REGION?.trim() ?? 'us-east-2';

function corsHeaders(origin) {
  const allowOrigin =
    origin && (origin === ALLOWED_ORIGIN || origin.endsWith('.townofwiley.gov'))
      ? origin
      : ALLOWED_ORIGIN;
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

async function signedGetReview(url) {
  const parsed = new URL(url);
  const request = new HttpRequest({
    method: 'GET',
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    headers: {
      host: parsed.hostname,
    },
  });

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: AWS_REGION,
    service: 'lambda',
    sha256: Sha256,
  });

  const signed = await signer.sign(request);
  const response = await fetch(url, {
    method: 'GET',
    headers: signed.headers,
  });

  const body = await response.text();
  return { statusCode: response.status, body };
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method ?? 'GET';
  const origin = event.headers?.origin ?? event.headers?.Origin ?? '';

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin) };
  }

  const headers = corsHeaders(origin);

  if (!REVIEW_FUNCTION_URL) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Review proxy not configured' }),
    };
  }

  if (!isAllowedOrigin(origin, ALLOWED_ORIGIN)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden' }),
    };
  }

  if (method !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const upstream = await signedGetReview(REVIEW_FUNCTION_URL);
    return {
      statusCode: upstream.statusCode,
      headers,
      body: upstream.body,
    };
  } catch (err) {
    console.error('Signed review fetch failed', err);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Failed to load contact updates' }),
    };
  }
};
