import assert from 'node:assert/strict';
import test from 'node:test';

import { handler } from './index.mjs';

test('returns the current paystar proxy mode on GET', async () => {
  const originalPortalUrl = process.env.PAYSTAR_PORTAL_URL;

  process.env.PAYSTAR_PORTAL_URL = 'https://secure.paystar.io/townofwiley';

  try {
    const response = await handler({ requestContext: { http: { method: 'GET' } } });
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(body.provider, 'paystar');
    assert.equal(body.mode, 'hosted');
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
    const response = await handler({
      requestContext: { http: { method: 'POST' } },
      body: JSON.stringify({
        residentName: 'Taylor Resident',
        serviceAddress: '304 Main Street',
        preferredContact: 'resident@example.com',
        accountQuestion: 'Need the current balance.',
        locale: 'en',
        source: 'resident-services',
      }),
    });
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(body.provider, 'paystar');
    assert.equal(body.mode, 'hosted');
    assert.equal(body.launchUrl, 'https://secure.paystar.io/townofwiley');
    assert.equal(body.referenceId, '304 Main Street');
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
    const response = await handler({
      requestContext: { http: { method: 'POST' } },
      body: JSON.stringify({ source: 'resident-services' }),
    });
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 500);
    assert.match(body.error, /PAYSTAR_PORTAL_URL/);
  } finally {
    if (originalPortalUrl) {
      process.env.PAYSTAR_PORTAL_URL = originalPortalUrl;
    }
  }
});
