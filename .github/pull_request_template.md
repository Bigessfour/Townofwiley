## Summary

- What changed?

## Change Type

- [ ] Deployable site change
- [ ] Test-only change
- [ ] Maintainer docs or runbook change
- [ ] Operational tooling change

## Deploy Impact

- [ ] This PR changes files Amplify builds from
- [ ] This PR does not change deployable site files

Deployable paths touched:

- List the relevant `src/`, `public/`, `package*.json`, `angular.json`, `tsconfig*`, `amplify.yml`, or `scripts/generate-runtime-config.mjs` files

## Validation

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run test:e2e:smoke`
- [ ] Not applicable

## Content-Security-Policy (if you changed hosting headers or third-party embeds)

- [ ] CSP edits are only in [`customHttp.yml`](customHttp.yml) (not `amplify.yml` `customHeaders` or inline in components)
- [ ] `npm run verify:custom-http-yaml`
- [ ] `npm run sync:angular-serve-csp` when `customHttp.yml` changed (commit updated `angular.json`)
- [ ] [`docs/third-party-csp-registry.md`](docs/third-party-csp-registry.md) updated if origins changed
- [ ] After deploy: `npm run verify:live-csp-probe` and `npm run verify:live-csp-vs-repo` (ops)
- [ ] `npm run amplify:sync-headers` when pushing header changes to production Amplify

## Maintainer Visibility

- [ ] I updated docs or runbooks that future maintainers need
- [ ] No maintainer-facing docs were needed

## Notes

- Anything reviewers should watch for
