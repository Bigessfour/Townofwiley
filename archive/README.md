# Archive — non-production and historical artifacts

**Purpose:** Keep the repo root and `docs/` focused on the live Town of Wiley site. Nothing under `archive/` is deployed to Amplify or served to residents.

| Path                           | Contents                                       | Maintainer notes                                                                       |
| ------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`hello-world/`](hello-world/) | Web Codegen Scorer config and example prompts  | Run via VS Code task or `web-codegen-scorer eval --env=archive/hello-world/config.mjs` |
| [`artifacts/`](artifacts/)     | Visual audit PNGs, debug HTML, live-audit JSON | Regenerate locally; do not treat as source of truth for product behavior               |

**Policy:** New debug screenshots, temp HTML, or one-off audit dumps belong here (or in local-only paths listed in `.gitignore`), not in `src/` or `public/`.
