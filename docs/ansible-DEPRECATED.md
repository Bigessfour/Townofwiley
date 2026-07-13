# Ansible — removed (July 2026)

Ansible playbooks, `ansible.cfg`, and `scripts/ansible-deploy.sh` were **removed** from this repository.

## Use instead

| Concern | Path |
| -------- | ----- |
| **IaC (infrastructure as code)** | [`infrastructure/terraform/`](../infrastructure/terraform/) — `npm run terraform:fmt`, `terraform:town:validate`, `terraform:e2e:validate` |
| **Production frontend (townofwiley.gov)** | Merge to `main` → GitHub Actions **deploy-production** (S3 + CloudFront) — [`DEPLOYMENT_SSOT.md`](./DEPLOYMENT_SSOT.md) |
| **Break-glass frontend** | `npm run deploy:site` |
| **Lambdas / one-off backends** | `scripts/deploy-*.py` and `npm run deploy:*` per service |

Site CI runs **Terraform fmt + validate** when `infrastructure/terraform/**` changes.