# Ansible — DEPRECATED

**Do not use this directory for production deploys.**

| Authority | Path |
|-----------|------|
| Production frontend | GitHub Actions `deploy-production` |
| Break-glass frontend | `npm run deploy:site` |
| IaC scaffold | `infrastructure/terraform/` |

See:

- [`docs/ansible-DEPRECATED.md`](../docs/ansible-DEPRECATED.md)
- [`docs/DEPLOYMENT_SSOT.md`](../docs/DEPLOYMENT_SSOT.md)
- [`docs/github-actions-production-deploy.md`](../docs/github-actions-production-deploy.md)

The playbooks/roles remain only as historical reference. Deploy npm scripts refuse to run unless `ALLOW_DEPRECATED_ANSIBLE=1`.
