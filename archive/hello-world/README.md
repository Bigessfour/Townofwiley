# Web Codegen Scorer Test Project

This directory is the scorer environment for the Town of Wiley Angular app.

## How It Fits Together

1. `config.mjs` is the scorer entry point.
2. `sourceDirectory: '../.scorer-source'` tells the scorer to copy the sanitized source mirror, not the report output folder.
3. `generationSystemPrompt` → `scorer-generation-prompt.md` (sandbox-only; not the Town `.vscode/angular-best-practices.md` overlay).
4. `executablePrompts` points at `example-prompts/`, which is where the evaluator prompt lives.
5. The scorer writes results to `.web-codegen-scorer/reports/`, which is analysis output, not application source.

## What Gets Tested

- The real Angular app under test lives at the repository root in `src/`.
- Unit tests run through Angular's unit-test builder in `angular.json`.
- The main app behavior is covered by `src/app/app.spec.ts`.
- Browser-level coverage is handled separately by the Playwright project in `e2e/`.

## Current Eval Setup

```bash
npm run scorer:prepare-source   # seeds .scorer-source (gitignored) from the scorer Angular example
npm run xai:verify-keychain     # confirms Keychain key is accepted by api.x.ai (no secret printed)
npm run scorer:eval             # eval + ACTION-ITEMS.md; grok-4 autorater
npm run scorer:action-items     # refresh ACTION-ITEMS from latest report
npm run scorer:report           # open HTML report UI
```

Re-import after rotating a key: paste into `secrets/local/xai-api-key.txt`, then `bash scripts/store-xai-api-key.sh` (trims whitespace). Grok CLI stays OAuth-only; this Keychain entry is for **web-codegen-scorer** and other `api.x.ai` REST callers.

## Notes

- `archive/hello-world/` is the scorer configuration surface (not deployed).
- `.web-codegen-scorer/` is generated output and report data.
- `src/` is the code being evaluated.
