# Ansible deployment (operator orchestration)

Ansible wraps existing **battle-tested scripts** — it does not replace `scripts/deploy-static-site.sh`, Python Lambda deployers, or GitHub Actions CI/CD.

**Production auto-deploy:** merges to `main` → Site CI → `deploy-production` (see [`github-actions-production-deploy.md`](./github-actions-production-deploy.md)).

**Ansible is for:** local/operator runs, dry-run checks, and tagged orchestration per [`AWS_INFRASTRUCTURE_SOT.md`](./AWS_INFRASTRUCTURE_SOT.md) hybrid model.

**Full production builds** (strict `runtime-config.js`) are owned by GitHub Actions (`deploy-production` on merge to `main`), which has repository secrets. Local Ansible and `npm run build` use the same keys via `secrets/local/user-secrets.json` — refresh with `npm run secrets:sync-runtime` (optionally `--github` to mirror CI secrets).

## Layout

```text
ansible/
  ansible.cfg
  inventory/production/     # localhost + group_vars from manifest
  playbooks/site.yml        # tagged entry point
  roles/static_site/        # calls scripts/deploy-static-site.sh
  roles/verify_infra/       # npm run verify:aws-infra --offline
```

## Prerequisites

```bash
# macOS (one-time)
brew install ansible

# AWS + Node (same as other deploy scripts)
source scripts/agent-aws-env.sh
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
npm ci
```

Optional collections (future IAM/Lambda modules):

```bash
ansible-galaxy collection install -r ansible/requirements.yml
```

## Commands

From repo root:

```bash
# List tags
ansible-playbook ansible/playbooks/site.yml --list-tags

# Dry-run S3 sync (no invalidation)
ansible-playbook ansible/playbooks/site.yml --tags static-site -e deploy_dry_run=true

# Production static site deploy (build + S3 + CloudFront)
ansible-playbook ansible/playbooks/site.yml --tags static-site

# Redeploy an existing dist/ without rebuilding (e.g. when local secrets lack strict runtime vars)
ansible-playbook ansible/playbooks/site.yml --tags static-site -e deploy_skip_build=true

# Offline manifest check
ansible-playbook ansible/playbooks/site.yml --tags verify
```

## What Ansible does **not** own

Keep using existing tooling for:

- Individual Lambdas (`scripts/deploy-*.py`, `npm run deploy:*`)
- Amplify Gen2 / `ampx` backend flows
- GitHub Actions `deploy-production` on merge to `main`
- `customHttp.yml`, manifest JSON files, and `npm run verify:live-csp-*`

## Best practices used

| Practice | Implementation |
|----------|----------------|
| Idempotent script delegation | Roles call repo scripts; no duplicated S3 logic |
| SSOT vars | `group_vars/all.yml` mirrors manifest hosting IDs |
| Tags | `static-site`, `verify`, `deploy`, `frontend`, `infra` |
| No secrets in git | AWS profile from env; runtime config from GitHub secrets / local secrets |
| Local connection | `ansible_connection: local` — no SSH inventory |
| Check before prod | `-e deploy_dry_run=true` → sync-only dry-run (skips build unless `-e deploy_force_build=true`) |
| Build preflight | Fails early with `generate:runtime-config:strict` when building locally |

## Related

- [`pipeline-workflow.md`](./pipeline-workflow.md) — full CI/CD command reference
- [`github-actions-production-deploy.md`](./github-actions-production-deploy.md)
- [`AWS_INFRASTRUCTURE_SOT.md`](./AWS_INFRASTRUCTURE_SOT.md) — deployment order for Lambdas
- [`infrastructure/iam/README.md`](../infrastructure/iam/README.md) — GitHub OIDC role
