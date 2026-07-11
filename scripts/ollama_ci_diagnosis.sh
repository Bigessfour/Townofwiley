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

extract_deterministic_facts() {
  node scripts/extract-ci-failure-facts.mjs \
    "$OUTPUT_DIR/failed-workflow-logs.txt" \
    "$OUTPUT_DIR/00-deterministic-facts.json" \
    "$OUTPUT_DIR/failure-snapshot" 2>"$OUTPUT_DIR/extract-facts-errors.txt" || true

  if [ -f "$OUTPUT_DIR/00-deterministic-facts.json" ]; then
    python3 - "$OUTPUT_DIR/00-deterministic-facts.json" "$OUTPUT_DIR/00-deterministic-triage.txt" <<'PY'
import json, sys
from pathlib import Path
facts = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
lines = [
    "DETERMINISTIC_FAILURE_FACTS",
    f"SUMMARY: {facts.get('summary', 'unknown')}",
    f"FAILING_JOBS: {', '.join(facts.get('failingJobs') or []) or 'unknown'}",
    "",
    "ERROR_LINES:",
]
for line in facts.get("errorLines") or []:
    lines.append(f"- {line}")
if facts.get("eslintErrors"):
    lines.append("")
    lines.append("ESLINT:")
    for item in facts["eslintErrors"]:
        lines.append(f"- {item['file']}:{item['line']}:{item['column']} {item['message']}")
Path(sys.argv[2]).write_text("\n".join(lines) + "\n", encoding="utf-8")
PY
    log "Deterministic facts: $(head -n 2 "$OUTPUT_DIR/00-deterministic-triage.txt" | tr '\n' ' ')"
  fi
}

run_prompt() {
  local name="$1"
  local prompt="$2"
  local outfile="$OUTPUT_DIR/${name}.txt"

  log "Running prompt: $name (model=$MODEL via API)"
  printf '%s' "$prompt" | node scripts/ollama-run-prompt.mjs \
    --model "$MODEL" \
    --out "$outfile" \
    --title "$name" \
    --system scripts/lib/ollama-ci-system-prompt.txt
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
    if [ -f "$OUTPUT_DIR/00-deterministic-triage.txt" ]; then
      echo "=== DETERMINISTIC_FAILURE_FACTS (ground truth) ==="
      cat "$OUTPUT_DIR/00-deterministic-triage.txt"
      echo ""
    fi
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
  extract_deterministic_facts
  local context
  context="$(build_context_file)"
  log "Context written to $context"

  local triage_prompt fix_prompt loop_prompt review_prompt
  triage_prompt=$(cat <<EOF
Task: Triage the failed Site CI run.

Method:
1) Read DETERMINISTIC_FAILURE_FACTS first.
2) List concrete evidence (quoted log fragments).
3) Infer failing job/step only when supported by evidence.
4) State root cause in one paragraph.

SITE CI CONTEXT:
- git-workflow.yml: frontend-lint-build (lint → test:unit:browser → test:vitest → build), frontend-smoke, ci-gate.
- Typical failures: ESLint @typescript-eslint/*, Vitest/Karma CMS/admin runtime tests, strict runtime-config build, Playwright smoke.

Output exactly these labels (no extra sections):

FAILING_JOB:
FAILING_STEP:
ERROR_SIGNATURE:
EVIDENCE:
REASONING:
ROOT_CAUSE:
CONFIDENCE: low|medium|high

CONTEXT:
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

IMMEDIATE_FIX:
VERIFY_LOCALLY:
ESTIMATED_EFFORT: minutes|hours
RISKS:
REASONING:

CONTEXT:
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

PRE_COMMIT_CHECK:
CI_HARDENING:
OLLAMA_PROMPT_TIP:
PREVENTION:
REASONING:
EOF
)

  review_prompt=$(cat <<EOF
Validate the triage and fix plan against DETERMINISTIC_FAILURE_FACTS and CONTEXT.

If the model triage contradicts deterministic facts, correct it.

Output:

VALIDATION: pass|fail
CORRECTIONS: (bullets, or "none")
MERGED_SUMMARY: (3-5 sentences a maintainer can paste into a PR comment)
CONFIDENCE: low|medium|high

DETERMINISTIC_FACTS:
$(cat "$OUTPUT_DIR/00-deterministic-triage.txt" 2>/dev/null || echo "unavailable")

TRIAGE:
$(cat "$OUTPUT_DIR/01-triage.txt" 2>/dev/null || echo "unavailable")

FIX_PLAN:
$(cat "$OUTPUT_DIR/02-fix-plan.txt" 2>/dev/null || echo "unavailable")
EOF
)

  run_prompt "01-triage" "$triage_prompt"
  run_prompt "02-fix-plan" "$fix_prompt"
  run_prompt "03-feedback-loop" "$loop_prompt"
  run_prompt "05-quality-review" "$review_prompt"
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

ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")

def clean(text: str) -> str:
    return ANSI.sub("", text).strip()

out = Path(sys.argv[1])
feedback = Path(sys.argv[2])
text = clean(feedback.read_text(encoding="utf-8", errors="replace")) if feedback.is_file() else ""

def section(name: str) -> str:
    m = re.search(rf"^{name}:(.*?)(?=^[A-Z_]+:|\Z)", text, re.M | re.S)
    return clean(m.group(1)) if m else ""

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

facts_path = out.parent / "00-deterministic-facts.json"
deterministic = None
if facts_path.is_file():
    deterministic = json.loads(facts_path.read_text(encoding="utf-8"))

payload = {
    "schema": "townofwiley-ci-improvements-v2",
    "deterministicSummary": (deterministic or {}).get("summary"),
    "improvements": improvements,
}
out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
PY
  log "CI improvements JSON: $out"
}

main