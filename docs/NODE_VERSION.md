# Node.js version policy (Town of Wiley)

## What to use

| Layer                               | Value                                     | Purpose                                                                          |
| ----------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| **Major**                           | **24.x LTS only** (`Krypton`)             | Matches Angular 21, (historical Amplify Gen 2 backend), and Playwright toolchain |
| **`package.json` `engines.node`**   | `>=24.15.0 <25.0.0`                       | Any **24.15+** patch is acceptable for local `npm`                               |
| **Repo pin** (`.nvmrc`, CI, builds) | **Exact patch** (currently **`24.16.0`**) | Same binary on laptop, GitHub Actions, and (historical) Amplify builds           |

**Unsupported for this repo:** Node 22, 23, 25+, odd majors, and Cursor’s bundled Node when it is not 24.x.

## Why pin `24.16.0` and not only “latest 24 LTS”?

[nodejs.org](https://nodejs.org/en/blog/release/v24.16.0) lists **24.16.0** as the current **Active LTS** patch (May 2026). The repo still documents **`24.15.0`** history because that was the pin when Amplify/CI were last locked.

We **pin an exact patch** (not “whatever `24` resolves to today”) so:

1. **GitHub Actions** (and historical Amplify `preBuild` in `amplify.yml`) use the same Node as your shell.
2. **Native addons** (esbuild, lmdb, etc.) do not drift between patch releases.
3. **Support** can say “build failed on 24.16.0” with one version string.

`engines.node` stays **`>=24.15.0`** so a teammate on **24.15.x** is not blocked until they run `nvm use` / `mise install`; CI and deploys always install the **`.nvmrc`** patch.

When Node ships a new **24.x LTS security patch**, bump **all** pin files in one PR:

- `.nvmrc`, `.node-version`, `.tool-versions`, `mise.toml`, `package.json` → `volta.node`
- `amplify.yml`, `.github/workflows/git-workflow.yml`, `.github/workflows/copilot-setup-steps.yml`
- `README.md`, this file, `.github/copilot-instructions.md`, `.cursor/rules/core-workflow.mdc`

Then run `node scripts/ensure-node-version.mjs` and `npm run test:vitest`.

## Tooling files (single source: `.nvmrc`)

| File                                                                    | Role                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------- |
| [`.nvmrc`](../.nvmrc)                                                   | **Canonical pin** — `nvm use` / `nvm install`     |
| [`.node-version`](../.node-version)                                     | nodenv / some editors                             |
| [`.tool-versions`](../.tool-versions)                                   | asdf                                              |
| [`mise.toml`](../mise.toml)                                             | mise                                              |
| [`package.json`](../package.json) `volta`                               | Volta                                             |
| [`scripts/ensure-node-version.mjs`](../scripts/ensure-node-version.mjs) | Enforces `engines` major range before npm scripts |

## Windows (nvm-windows) — common pain

**Symptom:** `nvm use 24.16.0` prints success but `node -v` still shows **v22** or **v25**.

**Cause:** Another `node.exe` appears **earlier** on `PATH` (Cursor helper, `C:\Program Files\nodejs`, conda, etc.).

**Fix:**

```powershell
nvm install 24.16.0
nvm use 24.16.0
$env:Path = "$env:NVM_SYMLINK;" + $env:Path
node -v   # expect v24.16.0
```

Or run from repo root: `.\scripts\setup-repo-node.ps1`

**Remove confusing versions** (optional; only if you do not need them for other projects):

```powershell
nvm uninstall 25.2.1
nvm uninstall 24.14.0
# After 24.16.0 is active:
nvm uninstall 24.15.0
```

Keep **one** 24.x install aligned with `.nvmrc`.

## macOS (Homebrew)

```bash
brew install node@24
brew unlink node && brew link --overwrite --force node@24
cd /path/to/Town-Website && nvm use   # or mise install
node -v
```

Integrated terminals in this workspace prepend `node@24` via [`.vscode/settings.json`](../.vscode/settings.json).

## Docker (optional — bypass host PATH)

When nvm/Cursor PATH fights you, use the official **Node 24 slim** image ([Docker get-started](https://docs.docker.com/get-started/)). It ships **v24.16.0** and **npm 11.13.0**, matching this repo’s pin.

```bash
# One-time: pull image (align tag with .nvmrc major/patch when bumping pins)
docker pull node:24-slim

# Interactive shell — verify versions
docker run -it --rm --entrypoint sh node:24-slim
node -v   # v24.16.0
npm -v    # 11.13.0
exit
```

**Run npm scripts from the repo** (mount workspace; Linux/macOS example):

```bash
cd /path/to/Town-Website
docker run --rm -v "$(pwd):/app" -w /app node:24-slim \
  sh -c "node scripts/ensure-node-version.mjs && npm ci && npm run test:vitest"
```

**Windows (PowerShell)** — adjust drive letter/path:

```powershell
docker run --rm -v "${PWD}:/app" -w /app node:24-slim `
  sh -c "node scripts/ensure-node-version.mjs && npm ci && npm run test:vitest"
```

Playwright smoke inside Docker needs extra setup (browsers, `webServer`); prefer **host Node 24** via nvm/`setup-repo-node.ps1` for E2E. Docker is best for **`npm ci`**, **`npm run build`**, **`npm run test:vitest`**, and **`ng lint`** when the host Node is wrong.

Pin file bumps: prefer `node:24.16.0-slim` if you need an exact patch tag; `node:24-slim` tracks the current 24.x slim release on Docker Hub.

## Cursor / Copilot agents

Agent shells **may not** inherit VS Code `terminal.integrated.env`. Prefix commands with repo Node 24 on macOS:

```bash
PATH="/opt/homebrew/opt/node@24/bin:$PATH" npm run test:e2e:smoke
```

On Windows, prepend `$env:NVM_SYMLINK` or run `scripts/setup-repo-node.ps1` first.

Do **not** use `SKIP_NODE_VERSION_CHECK=1` except emergencies — it hides the real problem (wrong Node on PATH).

## Verify

```bash
node scripts/ensure-node-version.mjs && node -v && npm -v
```

Expected: `v24.16.0` (or any `v24.x` satisfying `engines`), npm 11.x.
