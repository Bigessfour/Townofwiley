# Prepare production deploy (AWS)

Use after **PR #108** (or current feature branch) is green and ready to ship the forest theme + ops/RAG work.

## Pre-merge (already done if CI green)

- [x] Single deploy authority: **GitHub Actions** ([DEPLOYMENT_SSOT.md](./DEPLOYMENT_SSOT.md))
- [x] Ansible **removed**; IaC via Terraform ([ansible-DEPRECATED.md](./ansible-DEPRECATED.md))
- [x] Terraform **kept** as IaC scaffold (not site publisher)
- [ ] **`site-ci / CI gate (merge required)`** green on tip SHA

## AWS readiness (account `570912405222`)

```bash
source scripts/agent-aws-env.sh
aws sts get-caller-identity
# Account must be 570912405222

aws iam get-role --role-name GitHubActions-TownOfWiley-StaticSiteDeploy --query Role.Arn --output text
# Expect: arn:aws:iam::570912405222:role/GitHubActions-TownOfWiley-StaticSiteDeploy
```

If the role is missing: `bash scripts/setup-github-actions-deploy-role.sh` (IAM admin).

## Ship

1. Merge PR to **`main`** (GitHub UI or `gh pr merge 108 --merge` when gate green).
2. Open Actions → **Site CI** on `main` → confirm job **Deploy production (S3 + CloudFront)** succeeds.
3. Smoke:
   ```bash
   curl -sfI https://townofwiley.gov/
   curl -sf https://townofwiley.gov/runtime-config.js | head -c 200
   ```
4. Browser: forest header, MegaMenu, weather, pay bill, EN/ES.
5. Full list: [post-deploy-checklist.md](./post-deploy-checklist.md).

## Break-glass (only if Actions cannot deploy)

```bash
source scripts/agent-aws-env.sh
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
npm run secrets:sync-runtime   # if local strict build needs secrets
npm run deploy:site
```

## Do not

- Legacy Ansible paths (removed from repo)
- Terraform apply expecting the SPA to appear on CloudFront
- Force-push `main`
