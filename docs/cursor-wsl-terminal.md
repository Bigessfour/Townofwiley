# Cursor + WSL terminal (Windows)

Town of Wiley keeps **Ubuntu (WSL)** as an optional terminal profile on Windows. **PowerShell** is the workspace default when WSL is unhealthy or Agent terminals hang. Cursor inherits VS Code terminal settings but the **Agent terminal** behaves differently.

Official Cursor docs: [Terminal (Agent tool)](https://cursor.com/docs/agent/tools/terminal) — on Windows, Agent sandboxing requires **WSL2**.

## Recommended settings

Workspace: [`.vscode/settings.json`](../.vscode/settings.json). User-level copy in `%APPDATA%\Cursor\User\settings.json` helps when Agent ignores workspace settings (known Cursor bug).

| Setting | Value | Why |
|--------|--------|-----|
| `terminal.integrated.defaultProfile.windows` | `PowerShell` | Default when WSL is broken; switch to `Ubuntu (WSL)` when WSL is healthy |
| `terminal.integrated.automationProfile.windows` | `PowerShell` | Tasks / Agent automation (matches default profile) |
| `terminal.integrated.shellIntegration.enabled` | `false` | Reduces Agent hang / missing stdout ([forum](https://forum.cursor.com/t/windows-agent-terminal-commands-hang-no-stdout-integrated-terminal-works/162180)) |
| `agents.inlineEditing.terminal.useLegacyTool` | `true` | **Legacy Terminal Tool** — bypasses sandbox wrapper that spawns nested `wsl.exe` ([Cursor Settings → Agents → Inline Editing & Terminal](https://cursor.com/docs/agent/tools/terminal)) |

After changing terminal settings:

1. **Terminal: Kill All Terminals**
2. **Developer: Reload Window** (or fully quit and reopen Cursor)

## WSL profile pattern

Use `wsl.exe` with an **interactive login shell** (loads `~/.bashrc` and our `wsl-terminal-init.sh`). Do **not** rely on `--cd` alone — Cursor sets `VSCODE_CWD`; the init script `cd`s into the repo.

```json
"Ubuntu (WSL)": {
  "path": "C:\\Windows\\System32\\wsl.exe",
  "args": ["-d", "Ubuntu", "-e", "bash", "-l"],
  "icon": "terminal-linux"
}
```

Distro name must match `wsl --list --verbose` exactly (`Ubuntu`, not `Ubuntu-24.04`, unless that is your install name).

## Repo setup (after WSL is healthy)

From **PowerShell** (works when the integrated WSL tab is stuck):

```powershell
cd "C:\Users\biges\Desktop\Personal Github\Town Website"
npm run recover:wsl          # if WSL hung
npm run doctor:wsl             # quick health check
npm run setup:wsl-terminal     # bashrc hook + Node 24 in WSL
```

See also [`docs/NODE_VERSION.md`](NODE_VERSION.md).

## Symptom: WSL hung / terminal blank

**Cause:** Dozens of stuck `wsl.exe` processes (often from Cursor Agent). `wsl --status` and `wsl --shutdown` never return.

**Fix:**

```powershell
npm run recover:wsl
```

If that fails, run **PowerShell as Administrator**, quit **Docker Desktop**, close **Cursor**, then `npm run recover:wsl` again. Reboot if needed.

## Symptom: Integrated terminal is Ubuntu but Agent uses PowerShell

Known Cursor issue — Agent may ignore `defaultProfile` and `automationProfile`. Mitigations:

- Enable **Legacy Terminal Tool** (user setting above).
- Put toolchain in WSL `~/.bashrc` via `setup:wsl-terminal`, not only `terminal.integrated.env`.
- For urgent Windows-only commands, use an explicit **PowerShell** terminal profile.

## Agent prompt / themes

Heavy shell themes break Agent output. Our [`scripts/wsl-terminal-init.sh`](../scripts/wsl-terminal-init.sh) uses a plain prompt when `CURSOR_AGENT` is set (Cursor’s documented pattern).
