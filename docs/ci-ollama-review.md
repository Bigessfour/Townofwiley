# Ollama CI failure diagnosis

Town of Wiley uses **local Ollama models on GitHub-hosted runners** for advisory CI failure triage. These jobs **never gate merge**. The required check remains **`site-ci / CI gate (merge required)`**.

## Workflows

| Workflow / job | Trigger | Role |
| -------------- | ------- | ---- |
| Site CI → `ollama-ci-diagnosis` in [`git-workflow.yml`](../.github/workflows/git-workflow.yml) | After CI gate **failure** | Failure triage + actionable artifacts |

## Models (GitHub-hosted `ubuntu-latest`)

| Use | Default | Repo variable | Notes |
| --- | ------- | ------------- | ----- |
| CI triage | `llama3.2:3b` | `OLLAMA_CI_MODEL` | Fits ~7 GB free RAM; multi-pass or **fast path** |
| Self-hosted / larger runners | — | same vars | Prefer larger models when RAM ≥ ~16 GB |
| Install pin (optional) | install script latest | `OLLAMA_VERSION` | Passed into `setup-ollama` |

Avoid bare `qwen2.5:7b` / 14B models on free GitHub-hosted runners (OOM risk).

## Composite actions

| Action | Purpose |
| ------ | ------- |
| [`.github/actions/setup-ollama`](../.github/actions/setup-ollama/action.yml) | Cache → install → serve → pull → wait |
| [`.github/actions/cache-ollama-model`](../.github/actions/cache-ollama-model/action.yml) | `~/.ollama/models` keyed by model tag |
| [`.github/actions/ollama-ci-diagnosis`](../.github/actions/ollama-ci-diagnosis/action.yml) | Full triage pipeline + sticky PR comment |

## Actionable artifacts (CI diagnosis)

Artifact name: **`ollama-ci-diagnosis-<run-id>`**

| File | Purpose |
| ---- | ------- |
| **`ACTIONABLE.md`** | Human checklist: title, next steps, verify commands |
| **`06-actionable.json`** | Machine-readable checklist (`townofwiley-ci-actionable-v1`) |
| **`00-deterministic-facts.json`** | Ground-truth log extraction (ESLint, build, Playwright, Vitest, audit, gate) |
| `01-triage.txt` … `05-quality-review.txt` | Model or fast-path stubs |
| `04-ci-improvements.json` | Hardening / prevention ideas |

### Fast path

When the deterministic extractor marks `fastPathEligible: true` (high-confidence ESLint / known unit / strict runtime-config signatures), the pipeline **skips Ollama generates** and still uploads full actionable artifacts. Set `FORCE_LLM=1` to force model passes.

### Collect improvements locally

```bash
npm run ci:collect-improvements -- <github-actions-run-id>
```

Writes `outputs/ci-improvements/<run-id>/ci-improvement-suggestions.json`.

## Sticky PR comments

Comments are upserted (not spammed) using HTML markers:

- `<!-- tow-sticky:ollama-ci-diagnosis -->`

Implementation: [`scripts/lib/ollama-sticky-comment.mjs`](../scripts/lib/ollama-sticky-comment.mjs).

## Local dry-run helpers

```bash
# Diagnosis against a failed run id (needs gh auth + ollama for full path):
scripts/ollama_ci_diagnosis.sh <run-id>
```

## Relation to Site CI

- Site CI entrypoint: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- Implementation: [`.github/workflows/git-workflow.yml`](../.github/workflows/git-workflow.yml)
- Caching SSOT: [`.github/instructions/github-actions-caching.instructions.md`](../.github/instructions/github-actions-caching.instructions.md)

Production deploys remain independent of Ollama success/failure.
