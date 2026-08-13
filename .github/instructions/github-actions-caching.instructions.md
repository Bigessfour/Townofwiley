---
description: 'Mandatory GitHub Actions cache patterns for Town of Wiley workflows (npm, Angular, Playwright, Ollama, pip).'
name: 'GitHub Actions caching'
applyTo:
  - '.github/workflows/**'
  - '.github/actions/**'
---

# GitHub Actions caching (SSOT)

Use composite actions under `.github/actions/` so cache keys stay consistent across workflows.

## Required caches by asset

| Asset | Composite action | When |
| ----- | ---------------- | ---- |
| npm download cache | `actions/setup-node@v6` with `cache: npm` | Any job that runs `npm ci` |
| Angular `.angular/cache` | `./.github/actions/cache-angular-cli` | `ng build`, `ng test` (`frontend-lint-build`, Copilot setup build) |
| Playwright Chromium | `./.github/actions/cache-playwright-chromium` | Any job that runs Playwright (`PLAYWRIGHT_BROWSERS_PATH` must match input) |
| Ollama model weights | `./.github/actions/setup-ollama` (wraps `cache-ollama-model`) | Ollama PR review + CI diagnosis |
| pip (pytest) | `actions/setup-python@v6` with `cache: pip` and `cache-dependency-path: scripts/requirements-ci.txt` | Python backend / infra test jobs |

## Rules

1. **Never** cache `node_modules` — use `npm ci` + setup-node npm cache only.
2. **Always** set `PLAYWRIGHT_BROWSERS_PATH` at workflow `env` level and pass the same path into `cache-playwright-chromium`.
3. **Ollama:** PR review default on hosted runners is `qwen2.5-coder:3b`; CI triage stays `llama3.2:3b`. Override via repo variables `OLLAMA_CI_MODEL` / `OLLAMA_PR_REVIEW_MODEL`. Full guide: [`docs/ci-ollama-review.md`](../../docs/ci-ollama-review.md).
4. **Failure snapshots:** tee step output to `failure-context/` during the job — do **not** re-run `npm run test:*` on `failure()` (wastes minutes and skews triage).
5. Ollama jobs use `continue-on-error: true` — they must not gate merge.

## Ollama CI improvement artifacts

On CI gate failure, `ollama-ci-diagnosis` uploads `outputs/` including **`ACTIONABLE.md`**, **`06-actionable.json`**, and `04-ci-improvements.json`. Maintainers can run:

```bash
npm run ci:collect-improvements -- <actions-run-id>
```
