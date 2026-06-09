# Contributing to Town of Wiley

Thank you for your interest in this project. This repo powers the live municipal site at [townofwiley.gov](https://townofwiley.gov).

## Prerequisites

- **Node.js 24.x** only — use [`.nvmrc`](.nvmrc) (`24.16.0`). See [`docs/NODE_VERSION.md`](docs/NODE_VERSION.md).
- npm (comes with Node)
- Optional: [Trunk](https://trunk.io) for formatting/lint (`trunk fmt --all`)

```bash
nvm install && nvm use    # Windows: .\scripts\setup-repo-node.ps1
npm ci
```

## Branch and PR workflow

1. Create a **feature branch** from `main` (short-lived, focused scope).
2. Make changes following existing patterns under `src/app/`.
3. Run checks locally (see below).
4. Open a **pull request** against `main`.
5. Wait for the **CI gate** (`site-ci / CI gate`) to pass.
6. Merge to `main` — production deploys automatically via GitHub Actions OIDC.

Do **not** push directly to `main`. See [`docs/github-branch-protection.md`](docs/github-branch-protection.md).

## Required checks before PR

```bash
npm run lint
npm run test:vitest
npm run build
```

For UI or routing changes, also run:

```bash
npm run test:e2e:smoke
```

Format with Trunk before committing:

```bash
trunk fmt --all
trunk check --fix
```

Optional: enable the repo pre-push hook (runs Trunk fmt):

```bash
git config core.hooksPath .githooks
```

## Code conventions

- Angular 21 standalone components, signals (`input` / `output` / `computed`), OnPush
- Native control flow (`@if`, `@for`, `@switch`) — no `*ngIf` / `*ngFor`
- Bilingual EN/ES for all user-facing copy
- WCAG 2.1 AA — semantic HTML, labels, contrast, keyboard access
- Minimal diffs; match existing patterns before adding abstractions

Full agent and maintainer rules: [`AGENTS.md`](AGENTS.md)

## Secrets and credentials

Never commit plaintext credentials. Use the encrypted secrets locker:

```bash
npm run secrets:init
npm run secrets:unlock
# edit secrets/local/user-secrets.json
npm run secrets:lock:prune
```

`public/runtime-config.js` is generated at build time and is gitignored.

## Operational docs

Deployment, AWS infra IDs, Lambda configs, and service runbooks live in [`docs/OPERATIONS.md`](docs/OPERATIONS.md) — not in this file.

## Questions

For clerk/CMS workflows see [`CLERK-CMS-GUIDE.md`](CLERK-CMS-GUIDE.md). For infrastructure see [`docs/AWS_INFRASTRUCTURE_SOT.md`](docs/AWS_INFRASTRUCTURE_SOT.md).
