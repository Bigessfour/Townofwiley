#!/usr/bin/env bash
# Ollama-powered CI failure triage for Town of Wiley Site CI.
# Fetches failed workflow logs, runs structured prompts, writes actionable artifacts under outputs/.
set -euo pipefail

MODEL="${OLLAMA_MODEL:-llama3.2:3b}"
OUTPUT_DIR="${OUTPUT_DIR:-outputs}"
MAX_LOG_CHARS="${MAX_LOG_CHARS:-24000}"
RUN_ID="${1:-}"
FORCE_LLM="${FORCE_LLM:-0}"

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
actionable = facts.get("actionable") or {}
lines = [
    "DETERMINISTIC_FAILURE_FACTS",
    f"SUMMARY: {facts.get('summary', 'unknown')}",
    f"CONFIDENCE: {facts.get('confidence', 'low')}",
    f"FAST_PATH: {facts.get('fastPathEligible', False)}",
    f"FAILING_JOBS: {', '.join(facts.get('failingJobs') or []) or 'unknown'}",
    f"CATEGORY: {actionable.get('category', 'unknown')}",
    f"TITLE: {actionable.get('title', 'unknown')}",
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
if facts.get("playwrightFailures"):
    lines.append("")
    lines.append("PLAYWRIGHT:")
    for item in facts["playwrightFailures"][:10]:
        lines.append(f"- {item}")
if facts.get("buildErrors"):
    lines.append("")
    lines.append("BUILD:")
    for item in facts["buildErrors"][:10]:
        lines.append(f"- {item}")
lines.append("")
lines.append("VERIFY_COMMANDS:")
for cmd in actionable.get("verifyCommands") or []:
    lines.append(f"- {cmd}")
lines.append("")
lines.append("NEXT_STEPS:")
for step in actionable.get("nextSteps") or []:
    lines.append(f"- {step}")
if actionable.get("relatedFiles"):
    lines.append("")
    lines.append("RELATED_FILES:")
    for path in actionable["relatedFiles"]:
        lines.append(f"- {path}")
Path(sys.argv[2]).write_text("\n".join(lines) + "\n", encoding="utf-8")
PY
    log "Deterministic facts: $(head -n 3 "$OUTPUT_DIR/00-deterministic-triage.txt" | tr '\n' ' ')"
  fi
}

write_actionable_artifacts() {
  python3 - "$OUTPUT_DIR" <<'PY'
import json, sys
from pathlib import Path

out = Path(sys.argv[1])
facts_path = out / "00-deterministic-facts.json"
facts = {}
if facts_path.is_file():
    facts = json.loads(facts_path.read_text(encoding="utf-8"))
actionable = facts.get("actionable") or {
    "category": "unknown",
    "title": "Inspect failed job logs",
    "verifyCommands": [
        "npm run lint",
        "npm run test:vitest",
        "npm run test:unit:browser",
        "npm run build",
        "npm run test:e2e:smoke",
    ],
    "nextSteps": ["Open the failed Site CI job log and fix the first error."],
    "relatedFiles": [],
}

# ACTIONABLE.md — maintainer-facing checklist
md = [
    "# Actionable CI fix",
    "",
    f"**Title:** {actionable.get('title', 'Inspect logs')}",
    f"**Category:** `{actionable.get('category', 'unknown')}`",
    f"**Confidence:** `{facts.get('confidence', 'low')}`",
    f"**Fast path:** `{facts.get('fastPathEligible', False)}`",
    "",
    "## Summary",
    "",
    facts.get("summary") or "No deterministic failure signature detected.",
    "",
    "## Next steps",
    "",
]
for step in actionable.get("nextSteps") or []:
    md.append(f"1. {step}")
md.extend(["", "## Verify locally", "", "```bash"])
for cmd in actionable.get("verifyCommands") or []:
    md.append(cmd)
md.extend(["```", ""])
if actionable.get("relatedFiles"):
    md.extend(["## Related files", ""])
    for path in actionable["relatedFiles"]:
        md.append(f"- `{path}`")
    md.append("")
if facts.get("errorLines"):
    md.extend(["## Error lines", "", "```text"])
    for line in facts["errorLines"][:15]:
        md.append(line)
    md.extend(["```", ""])
md.extend(
    [
        "## Artifacts in this package",
        "",
        "- `00-deterministic-facts.json` — machine-readable ground truth",
        "- `06-actionable.json` — structured checklist for scripts",
        "- `01-triage.txt` / `02-fix-plan.txt` — model output when LLM path ran",
        "- `04-ci-improvements.json` — prevention / hardening ideas",
        "",
    ]
)
(out / "ACTIONABLE.md").write_text("\n".join(md), encoding="utf-8")

# 06-actionable.json
payload = {
    "schema": "townofwiley-ci-actionable-v1",
    "summary": facts.get("summary"),
    "confidence": facts.get("confidence", "low"),
    "fastPathEligible": bool(facts.get("fastPathEligible")),
    "failingJobs": facts.get("failingJobs") or [],
    "actionable": actionable,
    "errorLines": facts.get("errorLines") or [],
}
(out / "06-actionable.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {out / 'ACTIONABLE.md'} and 06-actionable.json")
PY
}

write_fast_path_model_stubs() {
  local reason="$1"
  cat >"$OUTPUT_DIR/01-triage.txt" <<EOF
# Ollama CI Diagnosis — 01-triage
# Model: ${MODEL} (skipped: fast path)
# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

FAILING_JOB: $(python3 -c "import json;from pathlib import Path;f=json.loads(Path('$OUTPUT_DIR/00-deterministic-facts.json').read_text());print(','.join(f.get('failingJobs') or ['unknown']))" 2>/dev/null || echo unknown)
FAILING_STEP: (see deterministic facts)
ERROR_SIGNATURE: $(python3 -c "import json;from pathlib import Path;print(json.loads(Path('$OUTPUT_DIR/00-deterministic-facts.json').read_text()).get('summary','unknown'))" 2>/dev/null || echo unknown)
EVIDENCE: Deterministic extractor (fast path — LLM skipped)
REASONING: High-confidence facts available; ${reason}
ROOT_CAUSE: See ACTIONABLE.md / 00-deterministic-facts.json
CONFIDENCE: high
EOF

  cat >"$OUTPUT_DIR/02-fix-plan.txt" <<EOF
# Ollama CI Diagnosis — 02-fix-plan
# Model: ${MODEL} (skipped: fast path)

IMMEDIATE_FIX:
See ACTIONABLE.md next steps (deterministic plan).

VERIFY_LOCALLY:
$(python3 -c "import json;from pathlib import Path;a=json.loads(Path('$OUTPUT_DIR/00-deterministic-facts.json').read_text()).get('actionable') or {};print('\n'.join(a.get('verifyCommands') or []))" 2>/dev/null || echo "npm run lint")

ESTIMATED_EFFORT: minutes
RISKS: Fast path omits free-form model reasoning; facts may miss rare log shapes.
REASONING: ${reason}
EOF

  cat >"$OUTPUT_DIR/03-feedback-loop.txt" <<EOF
# Ollama CI Diagnosis — 03-feedback-loop
# Model: ${MODEL} (skipped: fast path)

PRE_COMMIT_CHECK:
Run the VERIFY commands in ACTIONABLE.md before push.

CI_HARDENING:
Keep failure-context/ tee on frontend-lint-build; expand extractCiFailureFacts when new failure shapes appear.

OLLAMA_PROMPT_TIP:
Prefer fast path for high-confidence ESLint/unit/build signatures.

PREVENTION:
Add or extend unit tests for the failing surface.

REASONING: Fast path deterministic feedback.
EOF

  cat >"$OUTPUT_DIR/05-quality-review.txt" <<EOF
# Ollama CI Diagnosis — 05-quality-review
# Model: ${MODEL} (skipped: fast path)

VALIDATION: pass
CORRECTIONS: none
MERGED_SUMMARY: High-confidence deterministic triage was used (LLM skipped). Follow ACTIONABLE.md: $(python3 -c "import json;from pathlib import Path;print(json.loads(Path('$OUTPUT_DIR/00-deterministic-facts.json').read_text()).get('summary','see facts'))" 2>/dev/null || echo see facts).
CONFIDENCE: high
EOF
}

run_prompt() {
  local name="$1"
  local prompt="$2"
  local outfile="$OUTPUT_DIR/${name}.txt"
  local num_predict="${3:-1200}"

  log "Running prompt: $name (model=$MODEL via API)"
  if ! printf '%s' "$prompt" | node scripts/ollama-run-prompt.mjs \
    --model "$MODEL" \
    --out "$outfile" \
    --title "$name" \
    --system scripts/lib/ollama-ci-system-prompt.txt \
    --num-predict "$num_predict"; then
    log "WARN: prompt $name failed — writing unavailable stub"
    {
      echo "# Ollama CI Diagnosis — ${name}"
      echo "# Model: ${MODEL}"
      echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
      echo ""
      echo "MODEL_OUTPUT: unavailable (generate failed)"
      echo "See 00-deterministic-facts.json and ACTIONABLE.md for ground truth."
    } >"$outfile"
    return 0
  fi
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
    echo "| Fast path | $(python3 -c "import json;from pathlib import Path;p=Path('$OUTPUT_DIR/00-deterministic-facts.json');print(json.loads(p.read_text()).get('fastPathEligible',False) if p.is_file() else False)" 2>/dev/null || echo unknown) |"
    echo "| Workflow | ${FAILED_WORKFLOW_NAME:-unknown} |"
    echo "| Failed run | [${RUN_ID:-unknown}](${FAILED_RUN_URL:-#}) |"
    echo "| SHA | \`${FAILED_HEAD_SHA:-unknown}\` |"
    echo ""
    if [ -f "$OUTPUT_DIR/ACTIONABLE.md" ]; then
      echo "### Actionable"
      sed -n '1,40p' "$OUTPUT_DIR/ACTIONABLE.md"
      echo ""
    fi
    echo "### Triage"
    echo '```'
    head -n 30 "$OUTPUT_DIR/01-triage.txt" 2>/dev/null || echo "unavailable"
    echo '```'
    echo ""
    echo "Download artifact \`ollama-ci-diagnosis-${RUN_ID}\` for full reports (ACTIONABLE.md, 06-actionable.json)."
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
    echo "## Start here"
    echo "- **[ACTIONABLE.md](./ACTIONABLE.md)** — checklist + verify commands"
    echo "- **[06-actionable.json](./06-actionable.json)** — machine-readable actions"
    echo "- **[00-deterministic-facts.json](./00-deterministic-facts.json)** — ground truth"
    echo ""
    echo "## Reports"
    echo "- [01-triage.txt](./01-triage.txt) — root cause and failing step"
    echo "- [02-fix-plan.txt](./02-fix-plan.txt) — concrete fix steps"
    echo "- [03-feedback-loop.txt](./03-feedback-loop.txt) — validation and prevention"
    echo "- [04-ci-improvements.json](./04-ci-improvements.json) — hardening ideas"
    echo "- [05-quality-review.txt](./05-quality-review.txt) — merged summary"
    echo ""
    echo "## Recommended models on GitHub-hosted runners"
    echo "- **CI triage default:** \`llama3.2:3b\` (\`OLLAMA_CI_MODEL\`)"
    echo "- **PR review default:** \`llama3.2:3b\` or trial \`qwen2.5-coder:3b\` (\`OLLAMA_PR_REVIEW_MODEL\`)"
    echo "- **Self-hosted / larger runners:** \`qwen2.5-coder:7b\`"
  } >"$summary_file"
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
actionable = None
if facts_path.is_file():
    deterministic = json.loads(facts_path.read_text(encoding="utf-8"))
    actionable = deterministic.get("actionable")

payload = {
    "schema": "townofwiley-ci-improvements-v2",
    "deterministicSummary": (deterministic or {}).get("summary"),
    "confidence": (deterministic or {}).get("confidence"),
    "fastPathEligible": (deterministic or {}).get("fastPathEligible"),
    "actionable": actionable,
    "improvements": improvements,
}
out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
PY
  log "CI improvements JSON: $out"
}

main() {
  log "Starting diagnosis (model=$MODEL)"

  fetch_failed_logs "$RUN_ID"
  prefilter_logs
  extract_deterministic_facts
  write_actionable_artifacts

  local fast_path=false
  if [ -f "$OUTPUT_DIR/00-deterministic-facts.json" ]; then
    if python3 -c "import json;from pathlib import Path;import sys;f=json.loads(Path('$OUTPUT_DIR/00-deterministic-facts.json').read_text());sys.exit(0 if f.get('fastPathEligible') else 1)"; then
      fast_path=true
    fi
  fi

  if [ "$FORCE_LLM" = "1" ]; then
    fast_path=false
    log "FORCE_LLM=1 — skipping fast path"
  fi

  if [ "$fast_path" = true ]; then
    log "Fast path: high-confidence facts — skipping Ollama generates"
    write_fast_path_model_stubs "high-confidence deterministic facts"
    write_ci_improvements_json
    write_summary
    write_github_step_summary
    log "Diagnosis complete (fast path) — artifacts in $OUTPUT_DIR"
    return 0
  fi

  if ! wait_for_ollama; then
    log "WARN: Ollama unavailable — emitting deterministic-only artifacts"
    write_fast_path_model_stubs "Ollama API unavailable"
    write_ci_improvements_json
    write_summary
    write_github_step_summary
    return 0
  fi

  log "Pulling model $MODEL (skip if cached)"
  ollama pull "$MODEL" || log "WARN: ollama pull failed; generate may still work if cached"

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

  run_prompt "01-triage" "$triage_prompt" 1000
  run_prompt "02-fix-plan" "$fix_prompt" 1200
  run_prompt "03-feedback-loop" "$loop_prompt" 900
  run_prompt "05-quality-review" "$review_prompt" 900
  write_ci_improvements_json
  write_summary
  write_github_step_summary

  log "Diagnosis complete — artifacts in $OUTPUT_DIR"
}

main
