# Ansible deployment — DEPRECATED

> **July 2026:** Ansible is **not** a production deploy path for Town of Wiley.
> See **[`ansible-DEPRECATED.md`](./ansible-DEPRECATED.md)** and **[`DEPLOYMENT_SSOT.md`](./DEPLOYMENT_SSOT.md)**.

## What to use instead

**Production auto-deploy:** merges to `main` → Site CI → `deploy-production`  
→ [`github-actions-production-deploy.md`](./github-actions-production-deploy.md)

**Break-glass static site:**

```bash
source scripts/agent-aws-env.sh
npm run deploy:site
# dry-run: npm run deploy:site:dry
```

**Terraform (kept, not a site publisher):**

```bash
npm run terraform:town:plan
```

## Legacy tree

The `ansible/` directory is retained for reference. Operator npm scripts (`ansible:deploy*`, `deploy:ansible*`) **exit with an error** unless `ALLOW_DEPRECATED_ANSIBLE=1`.

CI may still syntax-check Ansible when those paths change (non-authoritative).
