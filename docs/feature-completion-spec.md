# Feature Completion — Remaining Backlog

**Last updated:** 2026-05-22
Shipped work is **removed** from this list so only open or ops-owned items remain. Full audit: [`post-development-inventory.md`](post-development-inventory.md).

**Recently merged:** AP-03 — Paystar hosted CTA disabled when `portalUrl` empty ([PR #30](https://github.com/Bigessfour/Townofwiley/pull/30)).

## Security (ops / cloud)

- API Gateway or WAF throttles on public Lambda URLs; AV/metadata rules on upload storage; PCI remains with Paystar.

## Performance (optional polish)

- **Done in repo**: Homepage hero uses `NgOptimizedImage` with `priority` + `fill` + `sizes`; document hub archive uses incremental **Load more** (20 items per step) to limit DOM size; NWS proxy CORS allowlist matches Paystar (staging + local dev ports).
- **Manual**: Run `npm run perf:lighthouse:staging` (requires network) before releases; virtual scroll via CDK only if archive grows large enough to justify the dependency.

## General

- `npm run lint`, `npm run test:vitest`, `npm run test:e2e:smoke`, deploy check on Amplify staging.
