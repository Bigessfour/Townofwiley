# Web Codegen Scorer Test Project

This directory is the scorer environment for the Town of Wiley Angular app.

## How It Fits Together

1. `config.mjs` is the scorer entry point.
2. `sourceDirectory: '../.scorer-source'` tells the scorer to copy the sanitized source mirror, not the report output folder.
3. `generationSystemPrompt: '../.vscode/angular-best-practices.md'` keeps generated code aligned with the repo's Angular rules.
4. `executablePrompts` points at `example-prompts/`, which is where the evaluator prompt lives.
5. The scorer writes results to `.web-codegen-scorer/reports/`, which is analysis output, not application source.

## What Gets Tested

- The real Angular app under test lives at the repository root in `src/`.
- Unit tests run through Angular's unit-test builder in `angular.json`.
- The main app behavior is covered by `src/app/app.spec.ts`.
- Browser-level coverage is handled separately by the Playwright project in `e2e/`.

## Current Eval Setup

```text
web-codegen-scorer eval --env=hello-world/config.mjs --model=<supported-xai-model> --prompt-filter=affirmation-app
```

## Notes

- `hello-world/` is the scorer configuration surface.
- `.web-codegen-scorer/` is generated output and report data.
- `src/` is the code being evaluated.
