import assert from 'node:assert/strict';
import test from 'node:test';

import { handler } from './index.mjs';

test('OPTIONS returns 204 with CORS headers', async () => {
  const res = await handler({
    requestContext: { http: { method: 'OPTIONS' } },
  });
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://www.townofwiley.gov');
});

test('non-GET methods return 405 before DynamoDB scan', async () => {
  const res = await handler({
    requestContext: { http: { method: 'POST' } },
  });
  assert.equal(res.statusCode, 405);
  assert.match(res.body, /Method not allowed/);
});
