# PrimeNG MCP (pinned local install)

Required once per clone (Windows `npx -p` multi-package launch is unreliable; SDK must be pinned):

```powershell
npm run mcp:primeng:install
```

Cursor/Grok launch via `node scripts/primeng-mcp.mjs` (Windows PowerShell fallback: `scripts/primeng-mcp.ps1`).

`overrides` pin `@modelcontextprotocol/sdk@1.25.2` under `@primeuix/mcp` ([primeuix#228](https://github.com/primefaces/primeuix/issues/228)).
