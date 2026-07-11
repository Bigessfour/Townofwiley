#!/usr/bin/env bash
# Ollama-powered CI failure triage for Town of Wiley Site CI.
# Fetches failed workflow logs, runs structured prompts, writes artifacts under outputs/.
set -euo pipefail

MODEL="${OLLAMA_MODEL:-llama3.2:3b}"
OUTPUT_DIR="${OUTPUT_DIR:-outputs}"
MAX_LOG_CHARS="${MAX_LOG_CHARS:-24000}"
RUN_ID="${1:-}"

mkdir -p "$OUTPUT_DIR"

log() {
  echo "[ollama-ci-diagnosis] $*"
}

wait_for_ollama() {
  local attempt
  for attempt in $(seq 1 30); do
    if curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
      log "Ollama API ready (attempt $attempt)"
      return 0
    fi
    sleep 2
  done
  echo "Ollama API did not become ready within 60 seconds" >&2
  return 1
}

truncate_logs() {
  local file="$1"
  local limit="$2"
  python3 - "$file" "$limit" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
limit = int(sys.argv[2])
text = path.read_text(encoding="utf-8", errors="replace")
if len(text) <= limit:
    print(text, end="")
else:
    head = limit // 2
    tail = limit - head
    omitted = len(text) - head - tail
    print(text[:head], end="")
    print(f"\n\n... [{omitted} characters truncated for model context] ...\n\n", end="")
    print(text[-tail:], end="")
PY
}

fetch_failed_logs() {
  local run_id="$1"
  local out_file="$OUTPUT_DIR/failed-workflow-logs.txt"
  local snapshot_dir="$OUTPUT_DIR/failure-snapshot"

  if [ -z "$run_id" ]; then
    echo "No workflow run id supplied." >"$out_file"
    return 0
  fi

  log "Fetching failed logs for run $run_id"
  if gh run view "$run_id" --log-failed >"$out_file" 2>"$OUTPUT_DIR/gh-fetch-errors.txt"; then
    log "Saved failed logs ($(wc -c <"$out_file" | tr -d ' ') bytes)"
  else
    log "gh run view --log-failed failed; falling back to full run log"
    gh run view "$run_id" --log >"$out_file" 2>>"$OUTPUT_DIR/gh-fetch-errors.txt" || true
  fi

  mkdir -p "$snapshot_dir"
  downloaded=false
  for name in "ci-failure-snapshot-${run_id}" "ci-failure-snapshot" "ci-failure-snapshot-trunk-${run_id}"; do
    if gh run download "$run_id" -n "$name" --dir "$snapshot_dir" 2>>"$OUTPUT_DIR/gh-fetch-errors.txt"; then
      log "Downloaded snapshot $name into $snapshot_dir"
      cat "$snapshot_dir"/* 2>/dev/null | head -c 8000 >>"$out_file" || true
      downloaded=true
      break
    fi
  done
  if [ "$downloaded" = false ]; then
    log "No ci-failure-snapshot* artifact available — will rely on job metadata + prefilter"
  fi

  {
    echo ""
    echo "=== JOB/STEP METADATA (from GH API) ==="
    gh api "repos/${GITHUB_REPOSITORY}/actions/runs/${run_id}/jobs" \
      --jq '.jobs[] | select(.conclusion=="failure") | {job: .name, steps: [.steps[] | select(.conclusion=="failure") | {step: .name, number: .number, conclusion: .conclusion}]}' 2>/dev/null || echo "(job metadata unavailable)"
  } >>"$out_file" || true

  if [ ! -s "$out_file" ]; then
    echo "No logs retrieved for run $run_id. Check permissions (actions: read) and run id." >"$out_file"
  fi
}

prefilter_logs() {
  local raw="$OUTPUT_DIR/failed-workflow-logs.txt"
  local filtered="$OUTPUT_DIR/high-signal-logs.txt"
  if [ ! -f "$raw" ]; then
    echo "no raw logs" >"$filtered"
    return 0
  fi
  node --input-type=module -e "
import { readFileSync, writeFileSync } from 'node:fs';
import { formatPrefilteredLogs } from './scripts/lib/ollama-log-prefilter.mjs';
const rawPath = process.argv[1];
const outPath = process.argv[2];
writeFileSync(outPath, formatPrefilteredLogs(readFileSync(rawPath, 'utf8')), 'utf8');
" "$raw" "$filtered"
  log "High-signal prefilter written: $filtered ($(wc -c <"$filtered" | tr -d ' ') bytes)"
}

run_prompt() {
  local name="$1"
  local prompt="$2"
  local outfile="$OUTPUT_DIR/${name}.txt"

  log "Running prompt: $name (model=$MODEL)"
  {
    echo "# Ollama CI Diagnosis — ${name}"
    echo "# Model: ${MODEL}"
    echo "# Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    echo ""
    ollama run "$MODEL" "$prompt"
  } | tee "$outfile"
  echo ""
}

build_context_file() {
  local context_file="$OUTPUT_DIR/ci-context.txt"
  {
    echo "Repository: ${GITHUB_REPOSITORY:-unknown}"
    echo "Workflow: ${FAILED_WORKFLOW_NAME:-unknown}"
    echo "Run ID: ${RUN_ID:-unknown}"
    echo "Run URL: ${FAILED_RUN_URL:-unknown}"
    echo "Head SHA: ${FAILED_HEAD_SHA:-unknown}"
    echo "Branch: ${FAILED_HEAD_BRANCH:-unknown}"
    echo "Event: ${FAILED_EVENT:-unknown}"
    echo "Conclusion: ${FAILED_CONCLUSION:-unknown}"
    echo ""
    echo "=== SITE CI STRUCTURE (Town of Wiley) ==="
    echo "Reusable workflow: .github/workflows/git-workflow.yml (called from ci.yml as Site CI)."
    echo "Path-aware jobs: detect-changes → frontend-lint-build (lint, test:unit:browser, test:vitest, build), frontend-smoke (Playwright), security-audit, infra tests."
    echo "Merge gate: ci-gate runs scripts/ci-gate-check.mjs — failures block merge."
    echo "Node 24.x, Angular 21, PrimeNG, bilingual CMS via AppSync API key on public site."
    echo ""
    if [ -f "$OUTPUT_DIR/high-signal-logs.txt" ]; then
      echo "=== HIGH-SIGNAL PREFILTERED LINES ==="
      cat "$OUTPUT_DIR/high-signal-logs.txt"
      echo ""
    fi
    echo "=== Failed step logs (truncated) ==="
    truncate_logs "$OUTPUT_DIR/failed-workflow-logs.txt" "$MAX_LOG_CHARS"
    echo ""
    echo "=== FAILURE SNAPSHOT ARTIFACT (if downloaded) ==="
    if ls "$OUTPUT_DIR/failure-snapshot/"* >/dev/null 2>&1; then
      for f in "$OUTPUT_DIR/failure-snapshot/"*; do
        echo "--- $(basename "$f") ---"
        head -c 4000 "$f" || true
        echo ""
      done
    else
      echo "(no snapshot files)"
    fi
  } >"$context_file"
  echo "$context_file"
}

write_github_step_summary() {
  local summary_path="${GITHUB_STEP_SUMMARY:-}"
  if [ -z "$summary_path" ]; then
    return 0
  fi

  {
    echo "## Ollama CI Diagnosis"
    echo ""
    echo "| Field | Value |"
    echo "|-------|-------|"
    echo "| Model | \`${MODEL}\` |"
    echo "| Workflow | ${FAILED_WORKFLOW_NAME:-unknown} |"
    echo "| Failed run | [${RUN_ID:-unknown}](${FAILED_RUN_URL:-#}) |"
    echo "| SHA | \`${FAILED_HEAD_SHA:-unknown}\` |"
    echo ""
    echo "### Triage"
    echo '```'
    head -n 30 "$OUTPUT_DIR/01-triage.txt" 2>/dev/null || echo "unavailable"
    echo '```'
    echo ""
    echo "### Immediate fix"
    echo '```'
    sed -n '/IMMEDIATE_FIX:/,/VERIFY_LOCALLY:/p' "$OUTPUT_DIR/02-fix-plan.txt" 2>/dev/null | head -n 20 || echo "unavailable"
    echo '```'
    echo ""
    echo "Download artifact \`ollama-ci-diagnosis-${RUN_ID}\` for full reports."
  } >>"$summary_path"
}

write_summary() {
  local summary_file="$OUTPUT_DIR/SUMMARY.md"
  {
    echo "# Ollama CI Failure Diagnosis"
    echo ""
    echo "| Field | Value |"
    echo "|-------|-------|"
    echo "| Model | \`${MODEL}\` |"
    echo "| Workflow | ${FAILED_WORKFLOW_NAME:-unknown} |"
    echo "| Run | [${RUN_ID:-unknown}](${FAILED_RUN_URL:-#}) |"
    echo "| SHA | \`${FAILED_HEAD_SHA:-unknown}\` |"
    echo ""
    echo "## Reports"
    echo "- [01-triage.txt](./01-triage.txt) — root cause and failing step"
    echo "- [02-fix-plan.txt](./02-fix-plan.txt) — concrete fix steps"
    echo "- [03-feedback-loop.txt](./03-feedback-loop.txt) — validation and prevention"
    echo ""
    echo "## Recommended models on GitHub-hosted runners"
    echo "- **Default:** \`llama3.2:3b\` — fits ~7 GB RAM runners."
    echo "- **Higher quality:** \`qwen2.5:7b\` — override via workflow input when RAM allows."
  } >"$summary_file"
}

main() {
  log "Starting diagnosis (model=$MODEL)"
  wait_for_ollama

  log "Pulling model $MODEL (skip if cached)"
  ollama pull "$MODEL"

  fetch_failed_logs "$RUN_ID"
  prefilter_logs
  local context
  context="$(build_context_file)"
  log "Context written to $context"

  local triage_prompt fix_prompt loop_prompt
  triage_prompt=$(cat <<EOF
You are a senior DevOps engineer triaging a failed GitHub Actions workflow for the Town of Wiley site (Angular 21 + PrimeNG + Node 24, Playwright e2e, Vitest, AppSync CMS).

SITE CI CONTEXT:
- Workflow: git-workflow.yml — detect-changes (path-aware), frontend-lint-build, frontend-smoke, security-audit, ci-gate (scripts/ci-gate-check.mjs).
- Common failures: ESLint, Vitest/browser unit tests (admin runtime-config, CMS snapshots), strict runtime-config build, Playwright smoke, npm audit critical.
- Public site must not leak staff CMS config in runtime-config.js (split admin bundle pattern).

If logs are missing or empty, infer from job/step metadata and patterns above. Note "logs limited — best-effort triage".

Respond in this exact structure:

FAILING_JOB:
FAILING_STEP:
ERROR_SIGNATURE: (one line)
ROOT_CAUSE: (2-3 sentences)
CONFIDENCE: low|medium|high

Logs and metadata:
$(cat "$context")
EOF
)

  fix_prompt=$(cat <<EOF
You are fixing a failed Town of Wiley Site CI workflow (Angular 21, Node 24, Playwright).

Use triage below. Fixes must match repo conventions (AGENTS.md): standalone components, bilingual copy, minimal diffs.
Local verify: npm run lint && npm run test:vitest && npm run test:unit:browser && npm run build && npm run test:e2e:smoke.

TRIAGE:
$(cat "$OUTPUT_DIR/01-triage.txt" 2>/dev/null || echo "unavailable")

Respond in this exact structure:

IMMEDIATE_FIX: (numbered steps — exact commands or file paths)
VERIFY_LOCALLY: (npm scripts)
ESTIMATED_EFFORT: minutes|hours
RISKS: (what could still fail)

Logs and metadata:
$(cat "$context")
EOF
)

  loop_prompt=$(cat <<EOF
You are improving CI feedback for Town of Wiley (GitHub Actions + optional Ollama triage).

Given triage and fix plan, recommend faster detection next time.

TRIAGE:
$(cat "$OUTPUT_DIR/01-triage.txt" 2>/dev/null || echo "unavailable")

FIX PLAN:
$(cat "$OUTPUT_DIR/02-fix-plan.txt" 2>/dev/null || echo "unavailable")

Respond in this exact structure:

PRE_COMMIT_CHECK: (what to run before push)
CI_HARDENING: (workflow or script changes)
OLLAMA_PROMPT_TIP: (one better prompt for this failure type)
PREVENTION: (one guardrail to add)
EOF
)

  run_prompt "01-triage" "$triage_prompt"
  run_prompt "02-fix-plan" "$fix_prompt"
  run_prompt "03-feedback-loop" "$loop_prompt"
  write_ci_improvements_json
  write_summary
  write_github_step_summary

  log "Diagnosis complete — artifacts in $OUTPUT_DIR"
}

write_ci_improvements_json() {
  local out="$OUTPUT_DIR/04-ci-improvements.json"
  python3 - "$out" "$OUTPUT_DIR/03-feedback-loop.txt" <<'PY'
import json, re, sys
from pathlib import Path

out = Path(sys.argv[1])
feedback = Path(sys.argv[2])
text = feedback.read_text(encoding="utf-8", errors="replace") if feedback.is_file() else ""

def section(name: str) -> str:
    m = re.search(rf"^{name}:(.*?)(?=^[A-Z_]+:|\Z)", text, re.M | re.S)
    return (m.group(1).strip() if m else "")

improvements = []
for label, category in (
    ("CI_HARDENING", "ci-hardening"),
    ("PREVENTION", "prevention"),
    ("PRE_COMMIT_CHECK", "pre-commit"),
    ("OLLAMA_PROMPT_TIP", "ollama-prompt"),
):
    body = section(label)
    if body:
        improvements.append({"category": category, "detail": body, "priority": "high" if category == "ci-hardening" else "medium"})

payload = {
    "schema": "townofwiley-ci-improvements-v1",
    "improvements": improvements,
}
out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
PY
  log "CI improvements JSON: $out"
}

main