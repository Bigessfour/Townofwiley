---
description: 'Mandatory GitHub Actions cache patterns for Town of Wiley workflows (npm, Angular).'
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
| npm download cache | `actions/setup-node` with `cache: npm` | Any job that runs `npm ci` |
| Angular `.angular/cache` | `./.github/actions/cache-angular-cli` | `ng build`, `ng test` (Site CI `build-and-test`, Copilot setup) |

Playwright and Ollama caches were removed with those CI jobs. Install Playwright browsers locally for smoke.

## Rules

1. **Never** cache `node_modules` — use `npm ci` + setup-node npm cache only.
2. Site CI does not run Playwright or Ollama.
3. Required merge check remains **`site-ci / CI gate (merge required)`**.
