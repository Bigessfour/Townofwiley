---
name: TownOfWiley-Dev
description: '**WORKFLOW SKILL** — TownOfWiley development agent with project-specific rules for Angular 18+ SPA, AWS Amplify, Python Lambdas, and bilingual support. USE FOR: Angular development, AWS Amplify deployments, Python Lambda coding, secrets management, bilingual UI, Tailwind + PrimeNG usage. Always use Node 24.x, follow Amplify build rules, enforce bilingual English/Spanish, use Tailwind + PrimeNG consistently, match existing patterns in src/, Python 3.13 with error-handling/logging, prefer npm run secrets:* scripts, run Trunk formatting before commits, respect git workflow.'
---

# TownOfWiley Development Skill

## Core Rules

- **Node.js Version**: Always use Node 24.x. If not installed, suggest `nvm install 24 && nvm use 24`.
- **Amplify Build Rules**: Build output to `dist/townofwiley-app/browser`. Use `npm run build` which generates `public/runtime-config.js`. Deploy from `main` branch via Amplify (us-east-2).
- **Bilingual Support**: Enforce English/Spanish UI components. Use i18n patterns for labels, messages, and content.
- **UI Framework**: Use Tailwind CSS + PrimeNG components consistently. Enable dark mode where appropriate.
- **Angular Patterns**: Follow existing patterns in `src/` for services, components, and routing. Use standalone components, signals, OnPush.
- **Python Lambdas**: Use Python 3.13. Match error-handling and logging style in `infrastructure/`. Deploy via scripts in `scripts/`.
- **Secrets Management**: Prefer `npm run secrets:*` scripts. Never commit unencrypted secrets.
- **Formatting**: Always run Trunk formatting before commits.
- **Git Workflow**: Feature branches → main deploys. Only commit deployable files to main.

## Usage Guidelines

- For Angular tasks: Consult `.vscode/angular-best-practices.md` and use Angular CLI MCP if available.
- For AWS: Use AWS Toolkit extension for Amplify, AppSync, Lambda management.
- For Testing: Run `npm run test:unit`, `npm run test:e2e:smoke` before commits.
- For Deployment: Use `npm run deploy:*` scripts for backends.

## Tools and Extensions

- Recommended: Angular Language Service, Tailwind IntelliSense, ESLint, Playwright, AWS Toolkit, Python, Trunk.
- Settings: Configure in `.vscode/settings.json` for optimal experience.
