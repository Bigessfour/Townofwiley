# Town of Wiley — Official Municipal Website

**Live:** [townofwiley.gov](https://townofwiley.gov)

![Angular](https://img.shields.io/badge/Angular-21-red?logo=angular)
![PrimeNG](https://img.shields.io/badge/PrimeNG-21-blueviolet)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![AWS](https://img.shields.io/badge/AWS-CloudFront%20%2B%20S3%20%2B%20AppSync-orange?logo=amazonaws)
![CI](https://github.com/Bigessfour/Townofwiley/actions/workflows/ci.yml/badge.svg)

Production-grade, bilingual municipal website for the Town of Wiley, Colorado — built as a serverless Angular SPA on AWS with a headless CMS, resident services, and automated CI/CD.

Built and maintained as part of the **[Cloud Resume Challenge](https://cloudresumechallenge.dev/)** portfolio ([stephenmckitrick.com](https://stephenmckitrick.com)).

---

## About

This is the **real, live official website** for a small Colorado town — not a demo. Clerks publish notices, meetings, and contacts through an in-app CMS; residents pay bills, sign up for weather alerts, and browse bilingual services from any device.

Design goals: **low cost** (AWS free-tier friendly), **accessible** (WCAG 2.1 AA), **maintainable by non-developers**, and **secure by default** (strict CSP, HSTS, OIDC deploys — no long-lived keys in git).

## Cloud Resume Challenge — What This Demonstrates

| Skill area | Implementation |
| --- | --- |
| **Frontend** | Angular 21 standalone components, signals, OnPush, PrimeNG, bilingual EN/ES |
| **Hosting & CDN** | S3 static origin + CloudFront + CloudFront Functions (SPA routing) |
| **Serverless backend** | Lambda (weather proxy, payments, contact updates, email routing, severe-weather alerts) |
| **Data & CMS** | AppSync GraphQL + DynamoDB; Cognito staff auth; in-app clerk editor at `/admin` |
| **CI/CD** | GitHub Actions with OIDC → S3 deploy + CloudFront invalidation (no stored AWS keys) |
| **Quality** | Vitest unit tests, Playwright e2e, Trunk lint/format, live accessibility audit |
| **Security** | Encrypted secrets locker, runtime-config injection, CSP/HSTS/X-Frame-Options |

## Features

- **Resident services hub** — utilities, permits, records, business directory, document hub
- **Live NWS weather** — forecast, radar, zone alerts (COZ098), SMS/email severe-weather signup
- **Bilingual EN/ES** — runtime language switch without rebuild
- **Headless CMS** — clerks manage notices, events, contacts, documents via `/admin` (no AWS console)
- **Utility payments** — Paystar integration scaffold with town-managed proxy
- **Accessibility** — skip links, semantic landmarks, keyboard nav, dedicated `/accessibility` page
- **Official gov identity** — `.gov` domain, official badge, mayor attestation, Town Hall contact

## Architecture

```mermaid
flowchart TD
    User["Resident / Clerk"] --> CF["CloudFront + CF Functions"]
    CF --> S3["S3 static origin — Angular 21 SPA"]
    SPA["Browser SPA"] -->|"GraphQL x-api-key"| AppSync["AWS AppSync"]
    AppSync --> DDB["DynamoDB"]
    SPA -->|"staff sign-in"| Cognito["Cognito User Pool"]
    SPA -->|"weather / payments / contact"| Lambda["AWS Lambda"]
    GH["GitHub Actions OIDC"] -->|"build + deploy"| S3
    GH -->|"invalidate"| CF
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Angular 21.2, PrimeNG 21, TypeScript 5.9, SCSS design tokens |
| Hosting | AWS S3 + CloudFront (Route 53, ACM) |
| CMS | AppSync GraphQL + DynamoDB + Amplify Data manager |
| Auth | Cognito User Pool (staff `/admin`) |
| Backend | Python & Node.js Lambda, SES, SNS, EventBridge |
| CI/CD | GitHub Actions, Ansible orchestration |
| Testing | Vitest, Playwright, Trunk |

## Quality & Accessibility

Live production audit (June 2026) — full report: [`docs/audit/wiley_mcp_audit.md`](docs/audit/wiley_mcp_audit.md)

| Check | Result |
| --- | --- |
| Lighthouse Best Practices | **100** |
| Lighthouse Accessibility | **91** → fixes applied (avatar alt, contrast, label-in-name) |
| Lighthouse SEO | **92** |
| Layout stability (CLS) | **0.00** |
| Console errors on load | **0** |
| Failed network requests | **0 / 41** |
| Mobile/tablet overflow | **None** |

## Screenshots

| Mobile (375px) | Tablet (768px) |
| --- | --- |
| ![Homepage mobile](docs/screenshots/homepage-mobile-375.png) | ![Homepage tablet](docs/screenshots/homepage-tablet-768.png) |

## Quickstart

**Prerequisites:** Node.js **24.x** (see [`.nvmrc`](.nvmrc) — pinned `24.16.0`)

```bash
nvm install && nvm use          # or: mise install / volta / .\scripts\setup-repo-node.ps1
npm ci
npm start                         # http://localhost:4200
```

**Testing:**

```bash
npm run lint
npm run test:vitest
npm run test:e2e:smoke
npm run build
```

## Repository Structure

| Path | Purpose |
| --- | --- |
| [`src/app/`](src/app/) | Angular feature modules (homepage, weather, CMS admin, services) |
| [`infrastructure/`](infrastructure/) | Lambda handlers, AWS manifest SSOT |
| [`e2e/`](e2e/) | Playwright smoke and regression specs |
| [`docs/`](docs/) | Runbooks, audit reports, architecture docs |
| [`.github/workflows/`](.github/workflows/) | CI gate + production deploy |

## Documentation

| Doc | Audience |
| --- | --- |
| [**Operations runbook**](docs/OPERATIONS.md) | Maintainers — deploy, secrets, infra IDs, service configs |
| [**Clerk CMS guide**](CLERK-CMS-GUIDE.md) | Town staff — publishing content |
| [**Contributing**](CONTRIBUTING.md) | Developers — branch flow, checks, formatting |
| [**AWS infrastructure SOT**](docs/AWS_INFRASTRUCTURE_SOT.md) | Infrastructure inventory and deploy order |
| [**Accessibility audit**](docs/audit/wiley_mcp_audit.md) | QA findings and remediation plan |

## License

Source code is released under the [MIT License](LICENSE).

The **Town of Wiley** name, seal, official content, and resident data are **not** licensed for reuse. This repository is shared for portfolio and engineering review purposes.

## Author

**Steve McKitrick** — Mayor & developer, Town of Wiley, Colorado

- Portfolio: [stephenmckitrick.com](https://stephenmckitrick.com)
- Live site: [townofwiley.gov](https://townofwiley.gov)
