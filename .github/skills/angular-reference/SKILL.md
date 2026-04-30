---
name: angular-reference
description: 'Use for Angular reference, Angular 21 guidance, standalone components, signals, routing, forms, HttpClient, SSR, hydration, testing, and accessibility. Use on every Angular-specific prompt in this repository when you need repo-specific Angular context or an informational Angular overview.'
argument-hint: 'Angular reference or repo-specific Angular guidance'
user-invocable: true
disable-model-invocation: false
---

# Angular Reference

Use this skill when you need the repo's Angular reference bundle or an informational overview of the Angular patterns used here.

## What This Skill Covers

- Angular 21 project context
- Standalone component architecture
- Signals-based local state
- Native control flow in templates
- Lazy-loaded feature routes
- Reactive forms and async pipes
- Dependency injection with `inject()`
- Accessibility and WCAG AA expectations
- `NgOptimizedImage` for static images

## How To Use It

1. Read `.cursor/rules/angular-standards.mdc` and `.cursor/rules/core-workflow.mdc` first for all Angular tasks.
2. Consult root `llms.txt`, `.instructions.md`, and MCP servers for context.
3. Apply the rules to edits; match existing `src/app/` patterns (standalone, signals, OnPush, native control flow).
4. Prioritize MCP tools (angular-cli, primeng) and accessibility.

## Repository Files

- `.cursor/rules/angular-standards.mdc`
- `.cursor/rules/core-workflow.mdc`
- `.instructions.md`
- `.github/skills/TownOfWiley-Dev/SKILL.md`
