#!/usr/bin/env node
/**
 * Emit AWS CLI --cli-input-json for `aws amplify update-app` (customHeaders from customHttp.yml).
 * Used when bash sync cannot reach aws (e.g. agent shell). Pipe to aws or MCP call_aws.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = join(import.meta.dirname, '..');
const appId = process.env.AMPLIFY_APP_ID ?? 'd331voxr1fhoir';
const headersYaml = readFileSync(join(root, 'customHttp.yml'), 'utf8');
const outPath =
  process.argv[2] ?? join(root, '__ng_tmp__', 'amplify-update-headers-cli-input.json');

const payload = { appId, customHeaders: headersYaml };
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload), 'utf8');
console.log(outPath);
