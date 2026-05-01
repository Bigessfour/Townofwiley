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
  const originalLaunch = process.env.PAYSTAR_UPSTREAM_LAUNCH_URL;
  const originalKey = process.env.PAYSTAR_UPSTREAM_API_KEY;

  process.env.PAYSTAR_PORTAL_URL = 'https://secure.paystar.io/townofwiley';
  delete process.env.PAYSTAR_UPSTREAM_LAUNCH_URL;
  delete process.env.PAYSTAR_UPSTREAM_API_KEY;

  try {
    const response = await handler(
      withOrigin({ requestContext: { http: { method: 'GET', path: '/' } } }),
    );
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(body.provider, 'paystar');
    assert.equal(body.mode, 'hosted');
    assert.equal(body.documentation, 'https://docs.paystar.io/');
    assert.equal(body.upstreamLaunchConfigured, false);
    assert.equal(body.upstreamReceiptConfigured, false);
    assert.equal(response.headers['access-control-allow-origin'], LOCAL_ORIGIN);
    assert.equal(response.headers.vary, 'Origin');
  } finally {
    if (originalPortalUrl) {
      process.env.PAYSTAR_PORTAL_URL = originalPortalUrl;
    } else {
      delete process.env.PAYSTAR_PORTAL_URL;
    }
    if (originalLaunch) {
      process.env.PAYSTAR_UPSTREAM_LAUNCH_URL = originalLaunch;
    } else {
      delete process.env.PAYSTAR_UPSTREAM_LAUNCH_URL;
    }
    if (originalKey) {
      process.env.PAYSTAR_UPSTREAM_API_KEY = originalKey;
    } else {
      delete process.env.PAYSTAR_UPSTREAM_API_KEY;
    }
  }
});

test('returns a launch URL when the hosted paystar portal is configured', async () => {
  const originalPortalUrl = process.env.PAYSTAR_PORTAL_URL;
  const originalLaunch = process.env.PAYSTAR_UPSTREAM_LAUNCH_URL;
  const originalKey = process.env.PAYSTAR_UPSTREAM_API_KEY;

  process.env.PAYSTAR_PORTAL_URL = 'https://secure.paystar.io/townofwiley';
  delete process.env.PAYSTAR_UPSTREAM_LAUNCH_URL;
  delete process.env.PAYSTAR_UPSTREAM_API_KEY;

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
    if (originalLaunch) {
      process.env.PAYSTAR_UPSTREAM_LAUNCH_URL = originalLaunch;
    } else {
      delete process.env.PAYSTAR_UPSTREAM_LAUNCH_URL;
    }
    if (originalKey) {
      process.env.PAYSTAR_UPSTREAM_API_KEY = originalKey;
    } else {
      delete process.env.PAYSTAR_UPSTREAM_API_KEY;
    }
  }
});

test('GET receipt returns 501 until upstream receipt URL template is configured', async () => {
  const response = await handler(
    withOrigin({
      requestContext: { http: { method: 'GET', path: '/receipt/ref-123' } },
      queryStringParameters: { locale: 'en' },
    }),
  );
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 501);
  assert.match(body.error, /Receipt lookup is not configured/);
  assert.equal(body.documentation, 'https://docs.paystar.io/');
});

test('returns 500 when the hosted paystar portal is not configured', async () => {
  const originalPortalUrl = process.env.PAYSTAR_PORTAL_URL;

  delete process.env.PAYSTAR_PORTAL_URL;
  delete process.env.PAYSTAR_UPSTREAM_LAUNCH_URL;
  delete process.env.PAYSTAR_UPSTREAM_API_KEY;

  try {
    const response = await handler(
      withOrigin({
        requestContext: { http: { method: 'POST' } },
        body: JSON.stringify({ source: 'resident-services' }),
      }),
    );
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 500);
    assert.match(body.error, /PAYSTAR_PORTAL_URL|PAYSTAR_UPSTREAM/);
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
