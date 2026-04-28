---
description: "Use when working on AI-powered application features, model-provider integrations, prompt flows, tool calling, agentic UI behavior, or LLM-backed services in this repo."
name: "AI Application Development Standards"
applyTo:
  - "src/**/*.ts"
  - "src/**/*.html"
  - "src/**/*.scss"
  - "infrastructure/**/*.py"
  - "scripts/**/*.mjs"
  - "docs/**/*.md"
---
# AI Application Development Standards

- Keep model-provider credentials out of client-shipped code. Never place API keys in `src/environments*`, browser bundles, or other client-visible files.
- Prefer existing repo secret flows first: `npm run secrets:*`, encrypted secrets under `secrets/`, and server-side environment or secret-manager based configuration.
- If an AI integration requires privileged credentials, route calls through a server-side boundary such as existing infrastructure, a proxy, or a managed backend instead of direct browser calls.
- Treat tool calling as an allowlist. Expose only the smallest safe set of actions the model needs, validate arguments before execution, and keep the application in control of whether a requested tool is actually invoked.
- Design AI-backed flows for non-determinism. Constrain outputs with schemas or typed contracts when possible, validate responses before use, and provide graceful fallbacks when output shape or quality is wrong.
- Do not let model or provider outages crash the app. Surface safe user-facing errors, preserve recoverable user input when practical, and offer a retry or alternate path.
- Keep prompts, tool definitions, and provider wiring separate from presentation code so Angular components remain focused on UI state and accessibility.
- For Angular UI that displays model output, preserve WCAG AA accessibility, sanitize or validate rich content before rendering, and avoid assuming generated content is structurally correct.
- Prefer existing Angular and repo guidance: standalone components, signals, OnPush, native control flow, and reactive forms.
- When introducing AI-specific dependencies or architecture, document the security boundary, credential source, fallback behavior, and validation path.