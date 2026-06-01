# Grok Build CLI (Town of Wiley)

[xAI Grok Build](https://x.ai/cli) is the terminal coding agent for this repo. **Use Grok Heavy only** — the `grok-build` model via OAuth (SuperGrok / X Premium+), not the public `api.x.ai` API key path.

**Agents:** Cursor reads [`.cursor/rules/grok-cli.mdc`](../.cursor/rules/grok-cli.mdc). Grok reads [`AGENTS.md`](../AGENTS.md). This file is the full operator reference.

---

## Install (once per machine)

macOS / Linux:

```bash
curl -fsSL https://x.ai/cli/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://x.ai/cli/install.ps1 | iex
```

Restart the terminal so `~/.grok/bin` is on `PATH`, then authenticate:

```bash
grok login --oauth
grok models   # expect: "logged in with grok.com" + grok-build only
```

---

## Heavy-only setup

Per [x.ai/cli](https://x.ai/cli), Grok Build requires **SuperGrok or X Premium+** and browser OAuth — not a console API key.

| Layer                     | Setting                                                               |
| ------------------------- | --------------------------------------------------------------------- |
| **Auth**                  | `grok login --oauth` → `~/.grok/auth.json`                            |
| **Do not**                | `export XAI_API_KEY=...` in `~/.zshrc` (overrides OAuth)              |
| **Model**                 | `grok-build` only (`cli-chat-proxy.grok.com`)                         |
| **`~/.grok/config.toml`** | `default = "grok-build"`, subagents on `grok-build`                   |
| **`~/.zshrc`**            | `grok()` wrapper unsets API-key env vars and defaults `-m grok-build` |

Verify Heavy is active:

```bash
source ~/.zshrc
unset XAI_API_KEY
grok models
# → You are logged in with grok.com.
# → Default model: grok-build
# → Available models: grok-build (only)
```

---

## Shell setup in Cursor / CI agents

Integrated and agent terminals often **do not** source `~/.zshrc`. Before any `grok` command:

```bash
export PATH="$HOME/.grok/bin:$PATH"
source ~/.zshrc
```

For npm/build in this repo (separate concern):

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"   # Intel: /usr/local/opt/node@24/bin
```

---

## Health check (copy-paste)

Run this sequence before assuming Grok is broken:

```bash
export PATH="$HOME/.grok/bin:$PATH"
source ~/.zshrc
grok --version
grok models
grok -p "reply with exactly: ok"
grok mcp doctor
```

**Interpret results:**

| Observation                                                  | Meaning                 | Action                                                                                 |
| ------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------- |
| `grok: command not found`                                    | PATH missing            | `export PATH="$HOME/.grok/bin:$PATH"`                                                  |
| `grok models` shows `grok-build`, logged in                  | OAuth OK                | Continue                                                                               |
| `ERROR … Auth(AuthorizationRequired)` but `-p` prints output | Headless worker flake   | Refresh `grok login --oauth`; prefer interactive `grok` for long tasks                 |
| `-p` produces no output                                      | Auth or network failure | Network diagnostics in Cursor; `grok login --oauth`; disable HTTP/2 in Cursor settings |
| `unexpected argument '-y'`                                   | Used `-yolo` or `-y`    | Use **`--yolo`** (see below)                                                           |

---

## Command reference

### Interactive

```bash
cd "/path/to/TOW Wiley Website"
grok inspect    # AGENTS.md + project MCP
grok            # TUI (preferred for complex work)
```

First session: trust the project when prompted, or run `/hooks-trust` in the TUI.

### Headless (`-p` / `--single`)

```bash
grok -p "Explain this repo"
grok -p "Fix the lint error in src/app/foo.ts" --yolo
grok -p "Review changes" --always-approve   # same as --yolo
```

| Flag               | Correct                            | Wrong                                                 |
| ------------------ | ---------------------------------- | ----------------------------------------------------- |
| Auto-approve tools | `--yolo`, `--always-approve`       | `-yolo`, `-y` (CLI parses `-y` as unknown short flag) |
| Model              | `-m grok-build` or rely on wrapper | `-m grok-4` with API key (bypasses Heavy OAuth)       |
| Prompt             | `-p "..."` or `--single "..."`     | Omitting `-p` starts TUI instead                      |

Other useful headless flags: `--max-turns N`, `--cwd PATH`, `--output-format json`. See `~/.grok/docs/user-guide/14-headless-mode.md`.

### CI and GitHub Actions

**Do not** use `grok -p "fetch https://github.com/.../actions/runs/..."` — unreliable and unnecessary.

Use **`gh`** (already authenticated on dev machines):

```bash
gh run list --limit 10
gh run view <run-id>
gh run view <run-id> --log-failed
gh pr checks 28
```

Then fix with repo scripts:

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
npm run lint
npm run test:unit:browser
npm run test:e2e:smoke
trunk check --fix
```

---

## MCP servers

Project config: [`.grok/config.toml`](../.grok/config.toml) (mirrors [`.cursor/mcp.json`](../.cursor/mcp.json)).

```bash
grok mcp doctor
grok mcp list
```

### Expected doctor results

| Server          | Typical status         | Notes                                                                                                                                                                  |
| --------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| angular-cli     | Healthy                | Primary Angular guidance                                                                                                                                               |
| playwright-test | Healthy                | e2e via `run-test-mcp-server`                                                                                                                                          |
| github          | Healthy                | Needs `GITHUB_PERSONAL_ACCESS_TOKEN` (wrapper sets from `gh auth token`)                                                                                               |
| mermaid         | Healthy                | Keychain token via `~/.zshrc`                                                                                                                                          |
| grok_com_github | Healthy                | Remote HTTP MCP                                                                                                                                                        |
| playwright-mcp  | Fails if wrong version | Must use `@playwright/mcp@latest` — **`@1.59.1` does not exist on npm**                                                                                                |
| figma           | OAuth required         | Separate from `grok login`; complete OAuth in Grok TUI when prompted                                                                                                   |
| primeng         | Pinned local install   | Run `npm run mcp:primeng:install` once; uses `mcp/primeng` with `@modelcontextprotocol/sdk@1.25.2` ([primeuix#228](https://github.com/primefaces/primeuix/issues/228)) |

### Figma OAuth in Grok

Figma MCP uses its own OAuth client. If doctor shows `OAuth authorization required`:

1. Run interactive `grok` in this repo.
2. Approve / authenticate Figma when the TUI prompts.
3. Re-run `grok mcp doctor`.

Cursor Figma MCP (`.cursor/mcp.json`) is independent — OAuth there does not carry over to Grok.

---

## Repo configuration

| File                                                          | Purpose                                             |
| ------------------------------------------------------------- | --------------------------------------------------- |
| [`AGENTS.md`](../AGENTS.md)                                   | Grok project rules (coding standards, MCP, Node 24) |
| [`.grok/config.toml`](../.grok/config.toml)                   | Project MCP servers                                 |
| [`.cursor/rules/grok-cli.mdc`](../.cursor/rules/grok-cli.mdc) | Cursor agent canonical commands                     |
| `~/.grok/config.toml`                                         | Global Grok preferences (models, UI, personal MCP)  |

Optional local overrides (not committed): `AGENTS.local.md` (gitignored).

---

## Trunk / corrupted scripts

If `trunk check` reports invalid UTF-8 on Python deploy scripts or shellcheck SC1072 on shell scripts, files may have mojibake from bad encoding (smart quotes, broken arrows). Restore from git:

```bash
git checkout HEAD -- scripts/configure-cloudfront-weather-cache.sh scripts/deploy-contact-updates-review.py
trunk check --fix scripts/configure-cloudfront-weather-cache.sh scripts/deploy-contact-updates-review.py
```

Keep operator scripts ASCII-only: use `->` and `-`, not Unicode arrows or em-dashes.

---

## Built-in Cursor Grok vs Grok CLI

These are **different products**:

|         | Cursor chat/composer Grok models             | Grok CLI (`grok` in terminal)                                 |
| ------- | -------------------------------------------- | ------------------------------------------------------------- |
| Auth    | Cursor model provider settings               | `grok login --oauth` → `~/.grok/auth.json`                    |
| Fixes   | Cursor → Network diagnostics; disable HTTP/2 | PATH + OAuth + [`docs/grok-cli.md`](grok-cli.md) health check |
| API key | Not required for Cursor Grok models          | **Do not** set `XAI_API_KEY` for Heavy workflow               |

---

## Docs

- [Grok Build overview](https://docs.x.ai/build/overview)
- [x.ai/cli](https://x.ai/cli)
- Local guides after install: `~/.grok/docs/user-guide/`
