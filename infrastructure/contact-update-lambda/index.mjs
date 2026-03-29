/**
 * Contact Update Lambda – Phase 2 backend
 *
 * Receives a JSON body from the frontend ContactUpdateService, stores the
 * record in DynamoDB ("TownOfWileyContactUpdates"), and sends a formatted
 * email to the Clerk via SES.
 *
 * Required environment variables:
 *   TABLE_NAME   – DynamoDB table name (default: TownOfWileyContactUpdates)
 *   FROM_ADDRESS – Verified SES sender (e.g. noreply@townofwiley.gov)
 *   TO_ADDRESS   – Clerk recipient (e.g. clerk@townofwiley.gov)
 *
 * Deployment:
 *   - Runtime: Node.js 20.x
 *   - Handler: index.handler
 *   - Memory: 128 MB  |  Timeout: 10 s
 *   - IAM: ses:SendEmail, dynamodb:PutItem on the target table
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

const TABLE_NAME = process.env.TABLE_NAME ?? 'TownOfWileyContactUpdates';
const FROM_ADDRESS = process.env.FROM_ADDRESS ?? 'noreply@townofwiley.gov';
const TO_ADDRESS = process.env.TO_ADDRESS ?? 'clerk@townofwiley.gov';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESClient({});

const ALLOWED_FIELDS = new Set([
  'fullName',
  'serviceAddress',
  'poBox',
  'phone',
  'email',
  'notes',
  'locale',
  'source',
]);

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://www.townofwiley.gov',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS };
  }

  let body;

  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // Strip any keys not in the allowlist (prevent injection into email/DDB)
  const sanitized = Object.fromEntries(
    Object.entries(body)
      .filter(([k]) => ALLOWED_FIELDS.has(k))
      .map(([k, v]) => [k, String(v ?? '').slice(0, 1000)]),
  );

  const id = randomUUID();
  const timestamp = new Date().toISOString();

  // Write to DynamoDB
  await dynamo.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { id, timestamp, ...sanitized },
    }),
  );

  // Format email body
  const lines = [
    `Full Name: ${sanitized.fullName || '(not provided)'}`,
    `Service Address: ${sanitized.serviceAddress || '(not provided)'}`,
    `PO Box: ${sanitized.poBox || '(not provided)'}`,
    `Phone: ${sanitized.phone || '(not provided)'}`,
    `Email: ${sanitized.email || '(not provided)'}`,
    `Notes: ${sanitized.notes || '(none)'}`,
    '',
    `Submitted: ${timestamp}`,
    `Source: ${sanitized.source || 'unknown'}`,
    `Locale: ${sanitized.locale || 'en'}`,
  ].join('\n');

  // Send via SES
  await ses.send(
    new SendEmailCommand({
      Destination: { ToAddresses: [TO_ADDRESS] },
      Source: FROM_ADDRESS,
      Message: {
        Subject: {
          Data: `Contact Info Update from Resident – ${sanitized.fullName || 'Unknown'}`,
        },
        Body: {
          Text: { Data: lines },
        },
      },
    }),
  );

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ ok: true }),
  };
};
