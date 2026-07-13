# Deployment single source of truth (SSOT)

**Production frontend for [townofwiley.gov](https://townofwiley.gov) has one authority path.**

## Canonical production deploy

```text
feature branch → PR → site-ci / CI gate (merge required) → merge main
  → Site CI on push main (app_changed)
  → deploy-production (OIDC → S3 townofwiley-static-site + CloudFront E1NZ3XCY5CYR1J)
  → post-deploy smoke (curl homepage, runtime-config, CSP probe)
```

| Role | Tool | Doc |
|------|------|-----|
| **Merge gate** | GitHub Actions Site CI | [`github-branch-protection.md`](./github-branch-protection.md) |
| **Production frontend deploy** | GitHub Actions `deploy-production` (OIDC) | [`github-actions-production-deploy.md`](./github-actions-production-deploy.md) |
| **Break-glass local frontend** | `npm run deploy:site` → `scripts/deploy-static-site.sh` | same + post-deploy checklist |
| **IaC scaffold (not site push)** | Terraform under `infrastructure/terraform/` | [`../infrastructure/terraform/README.md`](../infrastructure/terraform/README.md) |
| **Lambda / one-off backends** | Per-service `scripts/deploy-*.py` / `npm run deploy:*` | AWS SOT / runbooks |

## Explicitly not production deploy authorities

| Tool | Status |
|------|--------|
| **Ansible** | **Removed** (July 2026). Use **Terraform** for IaC — [`infrastructure/terraform/`](../infrastructure/terraform/README.md). See [`ansible-DEPRECATED.md`](./ansible-DEPRECATED.md). |
| Amplify Hosting | Decommissioned June 2026 |
| Terraform `apply` of static site | **Not implemented** — TF does not manage S3/CF site publish |

## Prepare / ship checklist

1. PR green: **`site-ci / CI gate (merge required)`** on tip SHA.
2. Merge to **`main`** (no force-push).
3. Confirm Actions run: **Deploy production (S3 + CloudFront)** succeeds.
4. Smoke: `https://townofwiley.gov/` (theme, mega menu, weather, pay, CMS).
5. Optional ops SNS: [`ops-observability.md`](./ops-observability.md).

Account: **`570912405222`**, region **`us-east-2`**, deploy role:

```text
arn:aws:iam::570912405222:role/GitHubActions-TownOfWiley-StaticSiteDeploy
```
