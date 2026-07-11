#!/usr/bin/env python3
"""
On Site CI failure: optional SNS alert + S3 archive of failure snapshot / Ollama artifacts.

Env (all optional — no-ops when unset so CI stays green without secrets):
  TOW_OPS_SNS_TOPIC_ARN
  TOW_OPS_ARTIFACTS_BUCKET
  GITHUB_RUN_ID / GITHUB_SERVER_URL / GITHUB_REPOSITORY / GITHUB_SHA
  AWS_REGION (default us-east-2)

Usage (from CI after failure snapshot exists):
  python3 scripts/ops_ci_on_failure.py --run-id "$GITHUB_RUN_ID"
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "infrastructure"))

from ops_lib.logging_json import get_logger  # noqa: E402
from ops_lib.notify import send_ops_notification  # noqa: E402
from ops_lib.s3_archive import upload_ops_artifact  # noqa: E402

logger = get_logger("ops_ci_on_failure", service="site-ci", json_logs=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="CI failure SNS + S3 ops archive")
    parser.add_argument("--run-id", default=os.environ.get("GITHUB_RUN_ID", ""))
    parser.add_argument(
        "--artifact-dir",
        default="",
        help="Directory of failure files to upload (default: failure-context/ and outputs/)",
    )
    parser.add_argument(
        "--skip-sns",
        action="store_true",
        help="Only attempt S3 uploads",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    run_id = (args.run_id or "local").strip()
    os.environ.setdefault("CORRELATION_ID", run_id)

    repo = os.environ.get("GITHUB_REPOSITORY", "Bigessfour/Townofwiley")
    server = os.environ.get("GITHUB_SERVER_URL", "https://github.com").rstrip("/")
    sha = (os.environ.get("GITHUB_SHA") or "")[:12]
    run_url = f"{server}/{repo}/actions/runs/{run_id}" if run_id != "local" else "(local)"

    uploaded: list[str] = []
    candidates: list[Path] = []
    if args.artifact_dir:
        root = Path(args.artifact_dir)
        if root.is_dir():
            candidates.extend(sorted(root.rglob("*")))
    else:
        for folder in ("failure-context", "outputs"):
            root = REPO_ROOT / folder
            if root.is_dir():
                candidates.extend(sorted(root.rglob("*")))

    for path in candidates:
        if not path.is_file():
            continue
        if path.stat().st_size > 5_000_000:
            logger.warning("Skip large file %s", path)
            continue
        ctype = "text/plain"
        if path.suffix == ".json":
            ctype = "application/json"
        elif path.suffix == ".md":
            ctype = "text/markdown"
        uri = upload_ops_artifact(
            path,
            correlation_id=run_id,
            content_type=ctype,
        )
        if uri:
            uploaded.append(uri)

    if not args.skip_sns:
        body_lines = [
            f"Site CI failure (correlation / run id: {run_id})",
            f"Repository: {repo}",
            f"SHA: {sha or 'unknown'}",
            f"Run: {run_url}",
            "",
            "Artifacts (S3):",
        ]
        if uploaded:
            body_lines.extend(f"- {u}" for u in uploaded[:20])
        else:
            body_lines.append(
                "- (none uploaded — set TOW_OPS_ARTIFACTS_BUCKET or check failure-context/)"
            )
        body_lines.extend(
            [
                "",
                "Also see GitHub Actions artifacts: ci-failure-snapshot-*, ollama-ci-diagnosis-*",
            ]
        )
        send_ops_notification(
            f"Site CI failed run {run_id}",
            "\n".join(body_lines),
            severity="ERROR",
        )

    logger.info(
        "ops_ci_on_failure complete run_id=%s uploaded=%s",
        run_id,
        len(uploaded),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
