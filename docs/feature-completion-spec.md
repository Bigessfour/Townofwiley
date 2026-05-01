# Feature Completion — Remaining Backlog

Shipped work is **removed** from this list so only open or ops-owned items remain.

## Security (ops / cloud)

- API Gateway or WAF throttles on public Lambda URLs; AV/metadata rules on upload storage; PCI remains with Paystar.

## Performance (optional polish)

- **Done in repo**: Homepage hero uses `NgOptimizedImage` with `priority` + `fill` + `sizes`; document hub archive uses incremental **Load more** (20 items per step) to limit DOM size; NWS proxy CORS allowlist matches Paystar (staging + local dev ports).
- **Manual**: Run `npm run perf:lighthouse:staging` (requires network) before releases; virtual scroll via CDK only if archive grows large enough to justify the dependency.

## General

- `npm run lint`, `npm run test:vitest`, `npm run test:e2e:smoke`, deploy check on Amplify staging.
