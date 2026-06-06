# Ansible for Town of Wiley AWS Deployments

This directory contains Ansible playbooks and roles for orchestrating AWS deployments and configuration.

## Simplified commands for new Ansible users (recommended)

You do **not** need to remember `source ...`, `ANSIBLE_CONFIG=...`, or raw `ansible-playbook` paths for normal work.

After ensuring your AWS profile is configured (`npm run aws:configure-profile` or the SSO flow), use the npm scripts:

```bash
# Full orchestration (IAM policies from JSON SSOT + frontend + lambdas + verify)
npm run ansible:deploy

# Selective (tags are defined in playbooks/deploy.yml and roles)
npm run ansible:deploy:frontend     # only the static site (calls deploy-static-site.sh)
npm run ansible:deploy:lambdas      # only the Lambda functions (loops over deploy-*.py)
npm run ansible:deploy:iam          # apply/ensure the copilot policies from infrastructure/iam/*.json
npm run ansible:verify              # just the final npm run verify:aws-infra step

# Validation (no AWS calls needed for syntax/inventory)
npm run ansible:check               # --syntax-check
npm run ansible:inventory           # list resolved inventory + vars
npm run ansible:lint                # advisory (ansible-lint if installed)
```

Dry / debug runs still work via the wrapper:

```bash
npm run ansible:deploy -- --check --diff --tags frontend
npm run ansible:deploy -- --list-tags
```

The `scripts/ansible-deploy.sh` wrapper:

- Sources `scripts/agent-aws-env.sh` (the standard project way to get `AWS_PROFILE=townofwiley` + region).
- Sets `ANSIBLE_CONFIG` to the repo-root `ansible.cfg` so config is auto-discovered.
- Forwards your extra args (tags, check, etc.) to the playbook.

You can still use the raw form if you prefer (the root `ansible.cfg` makes plain `ansible-playbook ansible/playbooks/deploy.yml --tags frontend` work from repo root after sourcing the env script).

## Philosophy

- **Use Ansible where it adds value for orchestration and IaC**:
  - Unifying execution of the many independent deploy scripts.
  - Sequencing according to `docs/AWS_INFRASTRUCTURE_SOT.md`.
  - Managing IAM policies (templates / application from `infrastructure/iam/`).
  - Common pre/post tasks (env checks, manifest loading, verification).
  - Tagging for selective runs (e.g., only frontend or only lambdas).

- **Leave the rest to existing repo tools** (as requested):
  - Static site asset sync logic stays in `scripts/deploy-static-site.sh` (two-phase Cache-Control + invalidation is well-tuned and not easily improved by Ansible without duplication).
  - Per-service Lambda deployment details stay in the existing `scripts/deploy-*.py` (they handle zipping, dependencies, specific env mapping, etc.).
  - Amplify Gen2 backend management (`ampx`, `amplify push`) stays with Amplify CLI.
  - The descriptive SSOT remains `infrastructure/aws-infrastructure.manifest.json` and related files.
  - `npm run verify:aws-infra` and individual `npm run deploy:*` scripts remain usable directly.

Ansible here acts as a **thin orchestration layer** on top of the battle-tested scripts and manifest, not a full replacement.

## Prerequisites

- `source scripts/agent-aws-env.sh` (sets `AWS_PROFILE=townofwiley` and region). Ansible playbooks expect this or equivalent environment.
- Ansible installed (`pip install ansible` or via system package). Optional: `ansible-galaxy collection install community.aws` if you extend roles to use native modules.
- Python 3.

## Usage (raw form — still supported)

The wrapper + npm scripts above are the primary interface. The raw form also works (root `ansible.cfg` provides discovery):

```bash
# after: source scripts/agent-aws-env.sh
ansible-playbook ansible/playbooks/deploy.yml --tags frontend
ansible-playbook ansible/playbooks/deploy.yml --tags "iam,lambdas,verify" --check --diff
ansible-playbook ansible/playbooks/deploy.yml --list-tags
```

The playbook will:

1. Load vars from `group_vars/all.yml` (aligned with the manifest).
2. Run common checks (sts identity).
3. Execute roles in order (common always, then iam, frontend, lambdas, verify).

## Locked into the pipeline

Ansible is now a first-class, discoverable deployment path in this repo:

- **npm scripts** (package.json): `ansible:deploy*`, `ansible:verify`, `ansible:check`, `ansible:inventory`, `ansible:lint`.
- **Wrapper** (`scripts/ansible-deploy.sh`): hides sourcing + config; called by the npm entries.
- **Root config** (`ansible.cfg`): Ansible auto-discovers it from the repo root per official search order (CWD, parents). No more mandatory `ANSIBLE_CONFIG=ansible/ansible.cfg`.
- **CI validation** (`.github/workflows/git-workflow.yml`): On changes to `ansible/**`, `scripts/ansible-deploy.sh`, or `infrastructure/iam/**` (plus infra manifests), a dedicated job runs `--syntax-check`, inventory listing, and (advisory) lint. This gates PRs that touch orchestration.
- **Docs**: This README, root README deploy notes, and AGENTS.md point at the npm forms as the consistent entrypoint post-merge.
- **Tags + selective**: `frontend` | `lambdas` | `iam` | `verify` let you run exactly what you need without touching unrelated steps.
- **Hybrid model preserved**: All complex logic (two-phase S3 sync + Cache-Control + invalidation, per-Lambda zipping/env, Amplify Gen2 flows, manifest SSOT) remains in the original scripts and `infrastructure/*.json`. Ansible only sequences + provides a uniform CLI + applies the IAM JSONs as an active step.

After any merge to main that touches deployable paths, you can run `npm run ansible:deploy` (or a tagged variant) from a machine with the `townofwiley` profile. CI itself does not auto-deploy to prod (it validates + runs frontend/e2e); production deploys remain explicit ops steps.

See also: `docs/AWS_INFRASTRUCTURE_SOT.md`, the individual `scripts/deploy-*.py` and `deploy-static-site.sh`, and `infrastructure/iam/README.md`.

## Structure

- `playbooks/deploy.yml` — main entrypoint with tags.
- `roles/common/` — load manifest, basic AWS checks.
- `roles/iam/` — reference/apply policies from `infrastructure/iam/`.
- `roles/frontend/` — calls existing `deploy-static-site.sh`.
- `roles/lambda/` — loops over `lambdas` var and calls the corresponding `deploy-*.py`.
- `roles/verify/` — runs `npm run verify:aws-infra`.
- `group_vars/all.yml` — project vars (keep in sync with manifest manually or via future task).
- `inventory/hosts` — localhost.

## Extending

- Add new Lambda to `group_vars/all.yml` under `lambdas:` with `deploy_script`.
- Add new role and tag it in the playbook.
- For more "pure IaC", roles can be extended with `community.aws` modules (e.g., `community.aws.lambda`, `community.aws.iam_policy`) while still using the manifest/JSONs as source of truth.

## Relation to Existing Tools

- This complements, does not replace:
  - `npm run deploy:site` / `deploy:site:dry`
  - Individual `python scripts/deploy-*.py`
  - `npm run verify:aws-infra`
  - `source scripts/agent-aws-env.sh`
- The `aws-infrastructure.manifest.json` remains the human/ops SSOT.

Run `ansible-playbook ... --list-tags` to see available tags.
