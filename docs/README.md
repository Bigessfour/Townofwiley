# Town of Wiley — documentation index

**Last updated:** 2026-05-22  
**Single source of truth for post-build status:** [`post-development-inventory.md`](post-development-inventory.md) (Phases 1–6, AP slices, remediation log).

## Status snapshot (2026-05-22)

| Area | Status |
| ---- | ------ |
| **Production branch** | `main` — AP-03 Paystar placeholder fix merged ([PR #30](https://github.com/Bigessfour/Townofwiley/pull/30)) |
| **AP-03 (repo)** | **Done** — `resolveQuickPayHref()`; disabled portal CTA when `portalUrl` empty |
| **AP-01b / AP-10** | **Open (ops)** — verify live `runtime-config.js`; set real Paystar portal URL when clerk provides it |
| **AP-02** | **Blocked** — hosted-only vs wire API decision |
| **Open PRs** | Dependabot #24, #26–#27, #29, #31–#33; feature [#28](https://github.com/Bigessfour/Townofwiley/pull/28) (rebase required) |

## Which doc to use

| Need | Document |
| ---- | -------- |
| What shipped, gaps, remediation slices (AP-01…) | [`post-development-inventory.md`](post-development-inventory.md) |
| Amplify deploy, runtime config verification | [`amplify-deployment-runbook.md`](amplify-deployment-runbook.md) |
| Hosting / DNS / CSP source of truth | [`AMPLIFY_HOSTING_SOT.md`](AMPLIFY_HOSTING_SOT.md) |
| Clerk CMS workflows | [`CLERK-CMS-GUIDE.md`](CLERK-CMS-GUIDE.md) |
| E2E ↔ AWS feature mapping | [`e2e-feature-map.md`](e2e-feature-map.md) |
| Agent Week 1 session prompt | [`week1-incremental-session-prompt.md`](week1-incremental-session-prompt.md) |
| Pre-launch polish checklist (historical items) | [`incomplete-items-reference.md`](incomplete-items-reference.md) |
| Remaining security/perf backlog (short) | [`feature-completion-spec.md`](feature-completion-spec.md) |
| PR / feature review | [`review-checklist.md`](review-checklist.md) |
| Page build standards (Angular 21 + PrimeNG) | [`ANGULAR21_PRIMENG_AMPLIFY_PAGE_READINESS_CHECKLIST.md`](ANGULAR21_PRIMENG_AMPLIFY_PAGE_READINESS_CHECKLIST.md) |
| Visual design target | [`visual-box-baseline.md`](visual-box-baseline.md) |
| Visual implementation phases | [`visual-improvement-plan.md`](visual-improvement-plan.md) |
| Git branch policy | [`git-workflow.md`](git-workflow.md) |

## Retired / consolidated

- **`docs/playwright-coverage-roadmap.md`** — removed 2026-05-22; future smoke gaps live in [`e2e-feature-map.md`](e2e-feature-map.md) § Future coverage.
- **`docs/townofwiley-website-completion-todos.md`** — never existed; README now points at `post-development-inventory.md`.

## Non-production paths

See [`../archive/README.md`](../archive/README.md) for `archive/hello-world/` and `archive/artifacts/`.
