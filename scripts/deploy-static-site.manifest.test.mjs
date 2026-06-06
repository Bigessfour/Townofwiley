import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    assertBrowserDistLayout,
    readHostingManifest,
} from './lib/read-hosting-manifest.mjs';

describe('readHostingManifest', () => {
  it('loads S3 bucket and CloudFront id from aws-infrastructure.manifest.json', () => {
    const { accountId, hosting } = readHostingManifest();
    assert.equal(accountId, '570912405222');
    assert.equal(hosting.s3Bucket, 'townofwiley-static-site');
    assert.equal(hosting.cloudFrontDistributionId, 'E1NZ3XCY5CYR1J');
    assert.equal(hosting.region, 'us-east-2');
  });
});

describe('assertBrowserDistLayout', () => {
  it('accepts dist/townofwiley-app/browser', () => {
    assert.doesNotThrow(() =>
      assertBrowserDistLayout('/repo/dist/townofwiley-app/browser'),
    );
  });

  it('rejects double browser/ prefix (S3 root anti-pattern)', () => {
    assert.throws(
      () => assertBrowserDistLayout('/repo/dist/townofwiley-app/browser/browser'),
      /double browser/,
    );
  });
});
