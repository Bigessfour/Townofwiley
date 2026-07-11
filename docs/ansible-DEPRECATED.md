# Ansible — DEPRECATED (do not use for production deploy)

**Status:** Deprecated July 2026 for **all production and operator deploys**.

**Canonical frontend deploy:** GitHub Actions → OIDC → S3 + CloudFront  
→ [`DEPLOYMENT_SSOT.md`](./DEPLOYMENT_SSOT.md) · [`github-actions-production-deploy.md`](./github-actions-production-deploy.md)

## Why

Having Ansible **and** GitHub Actions both able to push the static site created competing operator paths, drift risk, and confusion about which pipeline owned production. Production already auto-deploys on merge to `main`.

## What still exists

The `ansible/` directory, `ansible.cfg`, and legacy playbooks remain in the repo **for historical reference only**. CI may still **syntax-check** Ansible when those paths change so the tree does not rot unnoticed.

## What is blocked

These **refuse to run** a deploy unless `ALLOW_DEPRECATED_ANSIBLE=1` (escape hatch for archaeology only):

- `npm run ansible:deploy*`
- `npm run deploy:ansible*`
- `scripts/ansible-deploy.sh`

## Correct commands instead

| Goal | Command / action |
|------|------------------|
| Ship frontend to prod | Merge green PR to `main` |
| Manual frontend deploy | Actions → **Deploy production (manual)** or `npm run deploy:site` |
| Dry-run S3 sync | `npm run deploy:site:dry` |
| Verify AWS SSOT offline | `npm run verify:aws-infra -- --offline` |
| Terraform plan (scaffold) | `npm run terraform:town:plan` |

## Terraform

**Kept.** Terraform is the gradual **IaC** layer (manifest alignment, log retention experiments, bootstrap state). It is **not** a second static-site publisher. See `infrastructure/terraform/README.md`.
