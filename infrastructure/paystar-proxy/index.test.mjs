import assert from 'node:assert/strict';
import test from 'node:test';

import { handler } from './index.mjs';

const LOCAL_ORIGIN = 'http://localhost:4200';

function withOrigin(event) {
  return {
    ...event,
    headers: { ...(event.headers || {}), origin: LOCAL_ORIGIN },
  };
}

test('returns the current paystar proxy mode on GET', async () => {
  const originalPortalUrl = process.env.PAYSTAR_PORTAL_URL;

  process.env.PAYSTAR_PORTAL_URL = 'https://secure.paystar.io/townofwiley';

  try {
    const response = await handler(
      withOrigin({ requestContext: { http: { method: 'GET' } } }),
    );
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(body.provider, 'paystar');
    assert.equal(body.mode, 'hosted');
    assert.equal(response.headers['access-control-allow-origin'], LOCAL_ORIGIN);
    assert.equal(response.headers.vary, 'Origin');
  } finally {
    if (originalPortalUrl) {
      process.env.PAYSTAR_PORTAL_URL = originalPortalUrl;
    } else {
      delete process.env.PAYSTAR_PORTAL_URL;
    }
  }
});

test('returns a launch URL when the hosted paystar portal is configured', async () => {
  const originalPortalUrl = process.env.PAYSTAR_PORTAL_URL;

  process.env.PAYSTAR_PORTAL_URL = 'https://secure.paystar.io/townofwiley';

  try {
    const response = await handler(
      withOrigin({
        requestContext: { http: { method: 'POST' } },
        body: JSON.stringify({
          residentName: 'Taylor Resident',
          serviceAddress: '304 Main Street',
          preferredContact: 'resident@example.com',
          accountQuestion: 'Need the current balance.',
          locale: 'en',
          source: 'resident-services',
        }),
      }),
    );
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(body.provider, 'paystar');
    assert.equal(body.mode, 'hosted');
    assert.equal(body.launchUrl, 'https://secure.paystar.io/townofwiley');
    assert.equal(body.referenceId, '304 Main Street');
    assert.equal(response.headers['access-control-allow-origin'], LOCAL_ORIGIN);
  } finally {
    if (originalPortalUrl) {
      process.env.PAYSTAR_PORTAL_URL = originalPortalUrl;
    } else {
      delete process.env.PAYSTAR_PORTAL_URL;
    }
  }
});

test('returns 500 when the hosted paystar portal is not configured', async () => {
  const originalPortalUrl = process.env.PAYSTAR_PORTAL_URL;

  delete process.env.PAYSTAR_PORTAL_URL;

  try {
    const response = await handler(
      withOrigin({
        requestContext: { http: { method: 'POST' } },
        body: JSON.stringify({ source: 'resident-services' }),
      }),
    );
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 500);
    assert.match(body.error, /PAYSTAR_PORTAL_URL/);
    assert.equal(response.headers['access-control-allow-origin'], LOCAL_ORIGIN);
  } finally {
    if (originalPortalUrl) {
      process.env.PAYSTAR_PORTAL_URL = originalPortalUrl;
    }
  }
});

test('uses default CORS origin for unknown browser origins', async () => {
  const originalPortalUrl = process.env.PAYSTAR_PORTAL_URL;
  process.env.PAYSTAR_PORTAL_URL = 'https://secure.paystar.io/townofwiley';
  try {
    const response = await handler({
      headers: { origin: 'https://evil.example' },
      requestContext: { http: { method: 'GET' } },
    });

    assert.equal(response.headers['access-control-allow-origin'], 'https://townofwiley.gov');
    assert.equal(response.headers.vary, 'Origin');
  } finally {
    if (originalPortalUrl) {
      process.env.PAYSTAR_PORTAL_URL = originalPortalUrl;
    } else {
      delete process.env.PAYSTAR_PORTAL_URL;
    }
  }
});
