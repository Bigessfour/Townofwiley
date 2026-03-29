/**
 * Contact Updates Review Lambda
 *
 * Returns all submitted contact-update records from DynamoDB so the Clerk
 * can review them in the /clerk-setup UI or download them as a CSV.
 *
 * SECURITY: This Lambda Function URL should be configured with
 * AuthType: AWS_IAM so that only authenticated callers (e.g. the CloudFront
 * distribution with a signed request or an admin-facing reverse proxy) can
 * read resident data.  Do NOT expose this URL directly to the public internet
 * without authentication.
 *
 * Required environment variables:
 *   TABLE_NAME – DynamoDB table name (default: TownOfWileyContactUpdates)
 *
 * Deployment:
 *   - Runtime: Node.js 20.x
 *   - Handler: index.handler
 *   - Memory: 128 MB  |  Timeout: 10 s
 *   - IAM: dynamodb:Scan on the target table
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME ?? 'TownOfWileyContactUpdates';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://www.townofwiley.gov',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS };
  }

  // Only allow GET
  const method = event.requestContext?.http?.method ?? 'GET';
  if (method !== 'GET') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // Paginate through all items (Scan returns up to 1 MB per call)
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

    // Sort by timestamp descending so newest submissions appear first
    items.sort((a, b) => {
      const ta = a.timestamp ?? '';
      const tb = b.timestamp ?? '';
      return tb.localeCompare(ta);
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(items),
    };
  } catch (err) {
    console.error('DynamoDB scan failed', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to load contact updates' }),
    };
  }
};
