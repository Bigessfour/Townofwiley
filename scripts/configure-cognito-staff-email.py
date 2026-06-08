#!/usr/bin/env python3
"""Configure Gen 2 Cognito staff pool to send auth emails via Amazon SES (townofwiley.gov)."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BINDINGS_PATH = REPO_ROOT / "infrastructure" / "gen1-production-bindings.json"
SES_POLICY_PATH = REPO_ROOT / "infrastructure" / "cognito-staff-ses-policy.json"
DEFAULT_FROM = "noreply@townofwiley.gov"
DEFAULT_REPLY_TO = "alerts@townofwiley.gov"
DEFAULT_SES_IDENTITY = "townofwiley.gov"


def run_aws(command: list[str]) -> None:
    process = subprocess.run(["aws", *command], capture_output=True, text=True)
    if process.returncode != 0:
        stderr = process.stderr.strip()
        if "AlreadyExistsException" in stderr:
            return
        raise RuntimeError(stderr or process.stdout.strip() or "AWS CLI failed")


def load_bindings() -> dict:
    if BINDINGS_PATH.exists():
        return json.loads(BINDINGS_PATH.read_text(encoding="utf-8"))
    return {
        "cognito": {
            "userPoolId": "us-east-2_DmY7BCBIp",
        }
    }


def main() -> None:
    bindings = load_bindings()
    user_pool_id = bindings["cognito"]["userPoolId"]
    region = "us-east-2"
    account_id = "570912405222"
    ses_identity = DEFAULT_SES_IDENTITY
    source_arn = f"arn:aws:ses:{region}:{account_id}:identity/{ses_identity}"

    policy_doc = SES_POLICY_PATH.read_text(encoding="utf-8")
    policy_doc = policy_doc.replace("${USER_POOL_ID}", user_pool_id)
    policy_doc = policy_doc.replace("${ACCOUNT_ID}", account_id)
    policy_doc = policy_doc.replace("${REGION}", region)
    policy_doc = policy_doc.replace("${SES_IDENTITY_ARN}", source_arn)

    policy_file = REPO_ROOT / ".tmp-cognito-ses-policy-runtime.json"
    policy_file.write_text(policy_doc, encoding="utf-8")

    run_aws(
        [
            "sesv2",
            "create-email-identity-policy",
            "--email-identity",
            ses_identity,
            "--policy-name",
            "CognitoIdpSendEmail",
            "--region",
            region,
            "--policy",
            f"file://{policy_file.as_posix()}",
        ]
    )

    run_aws(
        [
            "cognito-idp",
            "update-user-pool",
            "--user-pool-id",
            user_pool_id,
            "--region",
            region,
            "--auto-verified-attributes",
            "email",
            "--user-attribute-update-settings",
            json.dumps({"AttributesRequireVerificationBeforeUpdate": ["email"]}),
            "--account-recovery-setting",
            json.dumps(
                {"RecoveryMechanisms": [{"Priority": 1, "Name": "verified_email"}]}
            ),
            "--email-configuration",
            json.dumps(
                {
                    "EmailSendingAccount": "DEVELOPER",
                    "SourceArn": source_arn,
                    "From": DEFAULT_FROM,
                    "ReplyToEmailAddress": DEFAULT_REPLY_TO,
                }
            ),
        ]
    )

    print(
        f"Configured {user_pool_id} to send from {DEFAULT_FROM} via SES ({ses_identity})."
    )


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
