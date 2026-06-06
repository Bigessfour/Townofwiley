## Summary

- What changed?

## Change Type

- [ ] Deployable site change
- [ ] Test-only change
- [ ] Maintainer docs or runbook change
- [ ] Operational tooling change

## Deploy Impact

- [ ] This PR changes files that Site CI builds and may auto-deploy to S3 + CloudFront on merge to `main`
- [ ] This PR does not change deployable site files

Deployable paths touched:

- List relevant `src/`, `public/`, `package*.json`, `angular.json`, `tsconfig*`, `customHttp.yml`, or `scripts/generate-runtime-config.mjs` files

## Validation

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run test:e2e:smoke`
- [ ] **`site-ci / CI gate (merge required)` green on this PR**
- [ ] Not applicable

## Content-Security-Policy (if you changed hosting headers or third-party embeds)

- [ ] CSP edits are only in [`customHttp.yml`](customHttp.yml) (not inline in components)
- [ ] `npm run verify:custom-http-yaml`
- [ ] `npm run test:csp-inline-style-policy` (when `customHttp.yml` or `angular.json` CSP changed)
- [ ] `npm run sync:angular-serve-csp` when `customHttp.yml` changed (commit updated `angular.json`)
- [ ] [`docs/third-party-csp-registry.md`](docs/third-party-csp-registry.md) updated if origins changed
- [ ] After deploy: `npm run verify:live-csp-probe` and `npm run verify:live-csp-vs-repo` (ops)

## Maintainer Visibility

- [ ] I updated docs or runbooks that future maintainers need
- [ ] No maintainer-facing docs were needed

## Notes

- Anything reviewers should watch for
