# Ollama CI failure diagnosis (retired)

Advisory Ollama diagnosis on GitHub-hosted runners was **removed** from Site CI.

- Required merge check remains **`site-ci / CI gate (merge required)`** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).
- Helper scripts under `scripts/ollama*.mjs` / `scripts/lib/ollama*.mjs` may still exist for local experiments; they are not invoked by CI.

For failed Actions runs, use the job logs and the `production-browser-dist` artifact when present.
