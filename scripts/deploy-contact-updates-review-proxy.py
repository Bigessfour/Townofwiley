"""
Deploy TownOfWileyContactUpdatesReviewProxy (AP-05b).

Public Function URL (NONE) with origin checks; signs GET to the IAM-protected
review Lambda Function URL.

Usage:
    python scripts/deploy-contact-updates-review.py   # review Lambda first (AWS_IAM)
    python scripts/deploy-contact-updates-review-proxy.py --review-function-url <IAM_URL>

Secrets block (optional) in secrets/local/user-secrets.json:
    "contactUpdatesReviewProxy": {
      "functionName": "TownOfWileyContactUpdatesReviewProxy",
      "reviewFunctionUrl": "https://....lambda-url.us-east-2.on.aws/"
    }
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

REPO_ROOT = Path(__file__).resolve().parent.parent
SECRETS_PATH = REPO_ROOT / "secrets" / "local" / "user-secrets.json"
BACKEND_DIR = REPO_ROOT / "infrastructure" / "contact-updates-review-proxy"

TRUST_POLICY = json.dumps(
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole",
            }
        ],
    }
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy contact-updates-review proxy Lambda.")
    parser.add_argument("--function-name", default="")
    parser.add_argument("--role-name", default="")
    parser.add_argument("--review-function-url", default="", help="IAM Function URL of review Lambda")
    parser.add_argument("--allowed-origin", default="https://www.townofwiley.gov")
    parser.add_argument("--region", default="")
    parser.add_argument("--runtime", default="nodejs20.x")
    return parser.parse_args()


def load_local_secrets() -> dict[str, Any]:
    if not SECRETS_PATH.exists():
        return {}
    try:
        return json.loads(SECRETS_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"Warning: could not parse secrets: {exc}", file=sys.stderr)
        return {}


def ensure_env_from_secrets(secrets: dict[str, Any]) -> None:
    aws = secrets.get("aws", {})
    for env_key, secret_key in [
        ("AWS_ACCESS_KEY_ID", "accessKeyId"),
        ("AWS_SECRET_ACCESS_KEY", "secretAccessKey"),
        ("AWS_SESSION_TOKEN", "sessionToken"),
        ("AWS_REGION", "region"),
    ]:
        if not os.environ.get(env_key) and aws.get(secret_key):
            os.environ[env_key] = aws[secret_key]


def resolve_value(cli_value: str, secret_value: Any, fallback: str = "") -> str:
    if isinstance(cli_value, str) and cli_value.strip():
        return cli_value.strip()
    if isinstance(secret_value, str) and secret_value.strip():
        return secret_value.strip()
    return fallback.strip()


def run_aws(command: list[str], expect_json: bool = True, region: str = "") -> Any:
    process = subprocess.run(
        ["aws", *(["--region", region] if region else []), *command],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if process.returncode != 0:
        raise RuntimeError(process.stderr.strip() or process.stdout.strip() or "AWS CLI failed")
    output = process.stdout.strip()
    if expect_json and output:
        return json.loads(output)
    return output


def get_review_function_arn(review_function_name: str, region: str) -> str:
    result = run_aws(["lambda", "get-function", "--function-name", review_function_name], region=region)
    return result["Configuration"]["FunctionArn"]


def get_or_create_role(role_name: str, review_function_arn: str) -> str:
    try:
        result = run_aws(["iam", "get-role", "--role-name", role_name])
        arn: str = result["Role"]["Arn"]
        print(f"  IAM role exists: {arn}")
    except RuntimeError:
        print(f"  Creating IAM role {role_name} …")
        result = run_aws(
            [
                "iam",
                "create-role",
                "--role-name",
                role_name,
                "--assume-role-policy-document",
                TRUST_POLICY,
            ]
        )
        arn = result["Role"]["Arn"]
        time.sleep(10)

    inline_policy = json.dumps(
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": "lambda:InvokeFunctionUrl",
                    "Resource": review_function_arn,
                    "Condition": {"StringEquals": {"lambda:FunctionUrlAuthType": "AWS_IAM"}},
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                    ],
                    "Resource": "arn:aws:logs:*:*:*",
                },
            ],
        }
    )
    run_aws(
        [
            "iam",
            "put-role-policy",
            "--role-name",
            role_name,
            "--policy-name",
            "ContactUpdatesReviewProxyPolicy",
            "--policy-document",
            inline_policy,
        ],
        expect_json=False,
    )
    return arn


def build_zip() -> Path:
    install_cmd = (
        ["npm", "ci", "--omit=dev"]
        if (BACKEND_DIR / "package-lock.json").is_file()
        else ["npm", "install", "--omit=dev"]
    )
    subprocess.run(install_cmd, cwd=BACKEND_DIR, check=True)
    zip_path = REPO_ROOT / "__ng_tmp__" / "contact-updates-review-proxy.zip"
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(zip_path, "w", ZIP_DEFLATED) as zf:
        for source_file in sorted(BACKEND_DIR.rglob("*")):
            if not source_file.is_file() or source_file.name.endswith(".test.mjs"):
                continue
            rel = source_file.relative_to(BACKEND_DIR)
            if rel.parts[0] == "node_modules" and rel.name.startswith("."):
                continue
            zf.write(source_file, rel)
    return zip_path


def upsert_lambda(
    function_name: str,
    role_arn: str,
    zip_path: Path,
    env_vars: dict[str, str],
    region: str,
    runtime: str,
) -> str:
    env_cli = (
        "Variables={"
        f"REVIEW_FUNCTION_URL={env_vars['REVIEW_FUNCTION_URL']},"
        f"ALLOWED_ORIGIN={env_vars['ALLOWED_ORIGIN']},"
        f"AWS_REGION={env_vars['AWS_REGION']}"
        "}"
    )
    try:
        result = run_aws(["lambda", "get-function", "--function-name", function_name], region=region)
        arn: str = result["Configuration"]["FunctionArn"]
        run_aws(
            [
                "lambda",
                "update-function-code",
                "--function-name",
                function_name,
                "--zip-file",
                f"fileb://{zip_path}",
            ],
            region=region,
        )
        time.sleep(5)
        run_aws(
            [
                "lambda",
                "update-function-configuration",
                "--function-name",
                function_name,
                "--environment",
                env_cli,
            ],
            region=region,
        )
        return arn
    except RuntimeError:
        result = run_aws(
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
                "--zip-file",
                f"fileb://{zip_path}",
                "--environment",
                env_cli,
                "--timeout",
                "15",
                "--memory-size",
                "128",
            ],
            region=region,
        )
        time.sleep(10)
        return result["FunctionArn"]


def ensure_public_function_url(function_name: str, region: str) -> str:
    cors = {
        "AllowOrigins": ["https://www.townofwiley.gov", "https://townofwiley.gov"],
        "AllowMethods": ["GET", "OPTIONS"],
        "AllowHeaders": ["content-type"],
        "MaxAge": 300,
    }
    try:
        result = run_aws(
            ["lambda", "get-function-url-config", "--function-name", function_name],
            region=region,
        )
        url: str = result["FunctionUrl"]
        auth = result.get("AuthType", "")
        if auth != "NONE":
            run_aws(
                [
                    "lambda",
                    "update-function-url-config",
                    "--function-name",
                    function_name,
                    "--auth-type",
                    "NONE",
                    "--cors",
                    json.dumps(cors),
                ],
                region=region,
            )
        return url
    except RuntimeError:
        result = run_aws(
            [
                "lambda",
                "create-function-url-config",
                "--function-name",
                function_name,
                "--auth-type",
                "NONE",
                "--cors",
                json.dumps(cors),
            ],
            region=region,
        )
        try:
            run_aws(
                [
                    "lambda",
                    "add-permission",
                    "--function-name",
                    function_name,
                    "--statement-id",
                    "FunctionURLAllowPublicAccess",
                    "--action",
                    "lambda:InvokeFunctionUrl",
                    "--principal",
                    "*",
                    "--function-url-auth-type",
                    "NONE",
                ],
                expect_json=False,
                region=region,
            )
        except RuntimeError as exc:
            if "already exists" not in str(exc):
                raise
        return result["FunctionUrl"]


def main() -> None:
    args = parse_args()
    secrets = load_local_secrets()
    ensure_env_from_secrets(secrets)
    cfg = secrets.get("contactUpdatesReviewProxy", {})

    region = resolve_value(args.region, cfg.get("region", ""), os.environ.get("AWS_REGION", "us-east-2"))
    function_name = resolve_value(
        args.function_name, cfg.get("functionName", ""), "TownOfWileyContactUpdatesReviewProxy"
    )
    role_name = resolve_value(
        args.role_name, cfg.get("roleName", ""), "TownOfWileyContactUpdatesReviewProxyRole"
    )
    review_url = resolve_value(args.review_function_url, cfg.get("reviewFunctionUrl", ""))
    allowed_origin = resolve_value(args.allowed_origin, cfg.get("allowedOrigin", ""), "https://www.townofwiley.gov")

    if not review_url:
        print(
            "Error: --review-function-url required (IAM URL from deploy-contact-updates-review.py).",
            file=sys.stderr,
        )
        sys.exit(1)

    review_fn = resolve_value("", cfg.get("reviewFunctionName", ""), "TownOfWileyContactUpdatesReview")
    review_arn = get_review_function_arn(review_fn, region)

    print(f"\nDeploying {function_name} to {region} …")
    role_arn = get_or_create_role(role_name, review_arn)
    zip_path = build_zip()
    env_vars = {
        "REVIEW_FUNCTION_URL": review_url,
        "ALLOWED_ORIGIN": allowed_origin,
        "AWS_REGION": region,
    }
    upsert_lambda(function_name, role_arn, zip_path, env_vars, region, args.runtime)
    proxy_url = ensure_public_function_url(function_name, region)

    print("\n" + "=" * 60)
    print("Proxy deployment complete.")
    print(f"\nProxy Function URL (set as CONTACT_UPDATE_REVIEW_PROXY_URL on Amplify main):\n  {proxy_url}")
    print(
        json.dumps(
            {
                "contactUpdate": {
                    "reviewProxyEndpoint": proxy_url,
                }
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
