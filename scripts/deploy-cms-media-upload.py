#!/usr/bin/env python3
"""Deploy TownOfWileyCmsMediaUpload Lambda (presigned S3 + CloudFront invalidation)."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

REPO_ROOT = Path(__file__).resolve().parent.parent
_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))
from _deploy_lambda_url import (  # noqa: E402
    ensure_handler_only_function_url_cors,
    ensure_none_auth_function_url_public_access,
)
from _deploy_npm import npm_install_cmd  # noqa: E402

BACKEND_DIR = REPO_ROOT / "infrastructure" / "cms-media-upload"
BINDINGS_PATH = REPO_ROOT / "infrastructure" / "gen1-production-bindings.json"
DEFAULT_USER_POOL_ID = "us-east-2_DmY7BCBIp"
DEFAULT_CLIENT_ID = "2m6vp91m9938jpbg2efivr2p8k"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Deploy CMS media presigned upload Lambda."
    )
    parser.add_argument("--function-name", default="TownOfWileyCmsMediaUpload")
    parser.add_argument("--role-name", default="TownOfWileyCmsMediaUploadRole")
    parser.add_argument("--region", default="us-east-2")
    parser.add_argument("--runtime", default="nodejs22.x")
    return parser.parse_args()


def run_aws(command: list[str], *, region: str, expect_json: bool = True) -> Any:
    process = subprocess.run(
        ["aws", *command, "--region", region],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if process.returncode != 0:
        raise RuntimeError(
            process.stderr.strip() or process.stdout.strip() or "AWS CLI failed."
        )
    output = process.stdout.strip()
    if not expect_json:
        return output
    return json.loads(output) if output else {}


def load_bindings() -> dict[str, Any]:
    return json.loads(BINDINGS_PATH.read_text(encoding="utf-8"))


def package_lambda() -> Path:
    install_cmd = npm_install_cmd(BACKEND_DIR)
    print(f"Installing Lambda dependencies ({' '.join(install_cmd)}) …")
    subprocess.run(install_cmd, cwd=BACKEND_DIR, check=True)
    temp_dir = Path(tempfile.mkdtemp(prefix="townofwiley-cms-media-upload-"))
    archive_path = temp_dir / "cms-media-upload.zip"
    with ZipFile(archive_path, "w", ZIP_DEFLATED) as archive:
        for path in sorted(BACKEND_DIR.rglob("*")):
            if not path.is_file():
                continue
            if path.name.endswith(".test.mjs"):
                continue
            rel = path.relative_to(BACKEND_DIR)
            if rel.parts[0] == "node_modules" and rel.name.startswith("."):
                continue
            archive.write(path, rel)
    return archive_path


def ensure_role(role_name: str, *, cf_distribution_id: str) -> str:
    bindings = load_bindings()
    documents_bucket = bindings["storage"]["bucket"]
    static_bucket = bindings["hosting"]["s3Bucket"]
    account_id = str(bindings["hosting"].get("accountId") or "818904800844")

    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole",
            }
        ],
    }
    inline_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": ["s3:PutObject"],
                "Resource": [
                    f"arn:aws:s3:::{documents_bucket}/*",
                    f"arn:aws:s3:::{static_bucket}/media/cms/*",
                ],
            },
            {
                "Effect": "Allow",
                "Action": ["cloudfront:CreateInvalidation"],
                "Resource": f"arn:aws:cloudfront::{account_id}:distribution/{cf_distribution_id}",
            },
        ],
    }

    try:
        role = run_aws(
            ["iam", "get-role", "--role-name", role_name], region="us-east-1"
        )
        role_arn = role["Role"]["Arn"]
    except RuntimeError:
        with tempfile.NamedTemporaryFile("w", suffix="-trust.json", delete=False) as fh:
            json.dump(trust_policy, fh)
            trust_path = fh.name
        role = run_aws(
            [
                "iam",
                "create-role",
                "--role-name",
                role_name,
                "--assume-role-policy-document",
                f"file://{trust_path}",
            ],
            region="us-east-1",
        )
        role_arn = role["Role"]["Arn"]
        run_aws(
            [
                "iam",
                "attach-role-policy",
                "--role-name",
                role_name,
                "--policy-arn",
                "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            ],
            region="us-east-1",
            expect_json=False,
        )
        time.sleep(10)

    with tempfile.NamedTemporaryFile("w", suffix="-policy.json", delete=False) as fh:
        json.dump(inline_policy, fh)
        policy_path = fh.name
    run_aws(
        [
            "iam",
            "put-role-policy",
            "--role-name",
            role_name,
            "--policy-name",
            "TownOfWileyCmsMediaUploadPolicy",
            "--policy-document",
            f"file://{policy_path}",
        ],
        region="us-east-1",
        expect_json=False,
    )
    return role_arn


def ensure_lambda(
    function_name: str,
    role_arn: str,
    runtime: str,
    archive_path: Path,
    environment: dict[str, str],
    region: str,
) -> None:
    env_json = json.dumps({"Variables": environment})
    try:
        run_aws(
            ["lambda", "get-function", "--function-name", function_name], region=region
        )
        run_aws(
            [
                "lambda",
                "update-function-code",
                "--function-name",
                function_name,
                "--zip-file",
                f"fileb://{archive_path}",
            ],
            region=region,
        )
        run_aws(
            ["lambda", "wait", "function-updated", "--function-name", function_name],
            region=region,
            expect_json=False,
        )
        run_aws(
            [
                "lambda",
                "update-function-configuration",
                "--function-name",
                function_name,
                "--handler",
                "index.handler",
                "--runtime",
                runtime,
                "--timeout",
                "30",
                "--memory-size",
                "256",
                "--role",
                role_arn,
                "--environment",
                env_json,
            ],
            region=region,
        )
    except RuntimeError:
        run_aws(
            [
                "lambda",
                "create-function",
                "--function-name",
                function_name,
                "--runtime",
                runtime,
                "--role",
                role_arn,
                "--handler",
                "index.handler",
                "--timeout",
                "30",
                "--memory-size",
                "256",
                "--zip-file",
                f"fileb://{archive_path}",
                "--environment",
                env_json,
            ],
            region=region,
        )


def ensure_function_url(function_name: str, region: str) -> str:
    try:
        result = run_aws(
            ["lambda", "get-function-url-config", "--function-name", function_name],
            region=region,
        )
        url = result["FunctionUrl"]
    except RuntimeError:
        result = run_aws(
            [
                "lambda",
                "create-function-url-config",
                "--function-name",
                function_name,
                "--auth-type",
                "NONE",
            ],
            region=region,
        )
        url = result["FunctionUrl"]
    ensure_none_auth_function_url_public_access(function_name, region, run_aws)
    ensure_handler_only_function_url_cors(function_name, region, run_aws)
    return url.rstrip("/")


def main() -> int:
    args = parse_args()
    bindings = load_bindings()
    cf_distribution_id = bindings["hosting"]["cloudFrontDistributionId"]
    archive_path = package_lambda()
    role_arn = ensure_role(args.role_name, cf_distribution_id=cf_distribution_id)
    environment = {
        "DOCUMENTS_BUCKET": bindings["storage"]["bucket"],
        "STATIC_SITE_BUCKET": bindings["hosting"]["s3Bucket"],
        "CF_DISTRIBUTION_ID": cf_distribution_id,
        "COGNITO_USER_POOL_ID": bindings["cognito"]["userPoolId"],
        "COGNITO_CLIENT_ID": bindings["cognito"]["userPoolClientId"],
        "STAFF_GROUP": bindings["cognito"].get("staffGroup", "Staff"),
        "PUBLIC_SITE_ORIGIN": "https://townofwiley.gov",
    }
    ensure_lambda(
        args.function_name,
        role_arn,
        args.runtime,
        archive_path,
        environment,
        args.region,
    )
    function_url = ensure_function_url(args.function_name, args.region)
    print(
        json.dumps(
            {
                "functionName": args.function_name,
                "functionUrl": function_url,
                "presignEndpoint": f"{function_url}/presign",
                "completeEndpoint": f"{function_url}/complete",
                "next": [
                    f"Update manifest functionUrlEndpoint for {args.function_name}",
                    "npm run generate:runtime-config:strict && npm run deploy:static-site",
                ],
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
