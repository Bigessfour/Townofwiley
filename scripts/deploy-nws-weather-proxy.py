"""
Deploy the Town of Wiley NWS weather proxy Lambda (infrastructure/nws-weather-proxy).

Ensures:
  - Handler-only CORS on the Function URL (empty AllowOrigins) per AWS Lambda URL CORS docs
  - NWS_USER_AGENT env var, 30s timeout, 256 MB memory
  - Amplify main branch NWS_PROXY_ENDPOINT matches the Function URL (optional release)

Usage:
    python scripts/deploy-nws-weather-proxy.py
    python scripts/deploy-nws-weather-proxy.py --skip-amplify-update --skip-amplify-release
"""

from __future__ import annotations

import argparse
import json
import os
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
from _deploy_lambda_url import ensure_handler_only_function_url_cors  # noqa: E402

SECRETS_PATH = REPO_ROOT / "secrets" / "local" / "user-secrets.json"
BACKEND_DIR = REPO_ROOT / "infrastructure" / "nws-weather-proxy"
DEFAULT_APP_ID = "d331voxr1fhoir"
DEFAULT_NWS_USER_AGENT = "TownOfWileyWeather/1.0 (contact: bigessfour@gmail.com)"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Deploy the Town of Wiley NWS weather proxy Lambda.",
    )
    parser.add_argument("--function-name", default="TownOfWileyNWSWeatherProxy")
    parser.add_argument("--region", default="us-east-2")
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--memory-size", type=int, default=256)
    parser.add_argument("--nws-user-agent", default="")
    parser.add_argument("--nws-api-key", default="")
    parser.add_argument("--airnow-api-key", default="")
    parser.add_argument("--app-id", default=DEFAULT_APP_ID)
    parser.add_argument("--branch-name", default="main")
    parser.add_argument("--skip-amplify-update", action="store_true")
    parser.add_argument("--skip-amplify-release", action="store_true")
    return parser.parse_args()


def load_local_secrets() -> dict[str, Any]:
    if not SECRETS_PATH.exists():
        return {}
    try:
        return json.loads(SECRETS_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"Warning: could not parse local secrets: {exc}", file=sys.stderr)
        return {}


def ensure_env_from_secrets(secrets: dict[str, Any]) -> None:
    aws = secrets.get("aws", {})

    if os.environ.get("AWS_PROFILE"):
        # Do not overwrite profile/SSO credentials with static keys from local secrets.
        if not os.environ.get("AWS_REGION") and aws.get("region"):
            os.environ["AWS_REGION"] = aws["region"]
        return

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
    full_command = ["aws", *command]
    if region:
        full_command.extend(["--region", region])

    process = subprocess.run(
        full_command,
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )

    if process.returncode != 0:
        raise RuntimeError(process.stderr.strip() or process.stdout.strip() or "AWS CLI failed.")

    output = process.stdout.strip()
    if not expect_json:
        return output

    return json.loads(output) if output else {}


def package_backend() -> Path:
    index_path = BACKEND_DIR / "index.mjs"
    if not index_path.exists():
        raise FileNotFoundError(f"Missing handler: {index_path}")

    temp_dir = Path(tempfile.mkdtemp(prefix="townofwiley-nws-proxy-"))
    archive_path = temp_dir / "nws-weather-proxy.zip"

    with ZipFile(archive_path, "w", ZIP_DEFLATED) as archive:
        archive.write(index_path, "index.mjs")

    return archive_path


def wait_for_function_ready(function_name: str, region: str) -> None:
    for _ in range(60):
        config = run_aws(
            ["lambda", "get-function-configuration", "--function-name", function_name],
            region=region,
        )
        if (
            config.get("State") == "Active"
            and config.get("LastUpdateStatus") in (None, "Successful")
        ):
            return
        time.sleep(2)

    raise RuntimeError(f"Lambda {function_name} did not become Active in time.")


def read_existing_environment(function_name: str, region: str) -> dict[str, str]:
    config = run_aws(
        ["lambda", "get-function-configuration", "--function-name", function_name],
        region=region,
    )
    variables = config.get("Environment", {}).get("Variables", {})
    return {key: str(value) for key, value in variables.items()}


def build_environment(
    existing: dict[str, str],
    nws_user_agent: str,
    nws_api_key: str,
    airnow_api_key: str,
) -> dict[str, str]:
    environment = dict(existing)
    environment["NWS_USER_AGENT"] = nws_user_agent

    if nws_api_key:
        environment["NWS_API_KEY"] = nws_api_key
    elif "NWS_API_KEY" in environment and not environment["NWS_API_KEY"]:
        environment.pop("NWS_API_KEY", None)

    if airnow_api_key:
        environment["AIRNOW_API_KEY"] = airnow_api_key
    elif "AIRNOW_API_KEY" in environment and not environment["AIRNOW_API_KEY"]:
        environment.pop("AIRNOW_API_KEY", None)

    return environment


def update_function_code(function_name: str, archive_path: Path, region: str) -> None:
    run_aws(
        [
            "lambda",
            "update-function-code",
            "--function-name",
            function_name,
            "--zip-file",
            f"fileb://{archive_path.as_posix()}",
        ],
        expect_json=False,
        region=region,
    )
    wait_for_function_ready(function_name, region)


def update_function_configuration(
    function_name: str,
    environment: dict[str, str],
    timeout: int,
    memory_size: int,
    region: str,
) -> None:
    run_aws(
        [
            "lambda",
            "update-function-configuration",
            "--function-name",
            function_name,
            "--timeout",
            str(timeout),
            "--memory-size",
            str(memory_size),
            "--environment",
            json.dumps({"Variables": environment}),
        ],
        region=region,
    )
    wait_for_function_ready(function_name, region)


def merge_amplify_environment(
    app_id: str,
    branch_name: str,
    function_url: str,
    region: str,
) -> None:
    branch = run_aws(
        ["amplify", "get-branch", "--app-id", app_id, "--branch-name", branch_name],
        region=region,
    )
    environment_variables = branch["branch"].get("environmentVariables", {})
    environment_variables["NWS_PROXY_ENDPOINT"] = function_url.rstrip("/")

    run_aws(
        [
            "amplify",
            "update-branch",
            "--app-id",
            app_id,
            "--branch-name",
            branch_name,
            "--environment-variables",
            json.dumps(environment_variables),
        ],
        region=region,
    )


def start_amplify_release(app_id: str, branch_name: str, region: str) -> None:
    run_aws(
        [
            "amplify",
            "start-job",
            "--app-id",
            app_id,
            "--branch-name",
            branch_name,
            "--job-type",
            "RELEASE",
        ],
        region=region,
    )


def main() -> None:
    args = parse_args()
    secrets = load_local_secrets()
    ensure_env_from_secrets(secrets)

    weather_secrets = secrets.get("weather", {}).get("nws", {})
    nws_user_agent = resolve_value(
        args.nws_user_agent,
        weather_secrets.get("userAgent"),
        DEFAULT_NWS_USER_AGENT,
    )
    nws_api_key = resolve_value(args.nws_api_key, weather_secrets.get("apiKey"))
    airnow_api_key = resolve_value(args.airnow_api_key, secrets.get("weather", {}).get("airnowApiKey"))

    region = resolve_value(args.region, secrets.get("aws", {}).get("region"), "us-east-2")
    function_name = args.function_name

    print(f"Packaging {BACKEND_DIR} …")
    archive_path = package_backend()

    print(f"Updating Lambda code for {function_name} …")
    update_function_code(function_name, archive_path, region)

    existing_env = read_existing_environment(function_name, region)
    environment = build_environment(existing_env, nws_user_agent, nws_api_key, airnow_api_key)

    print(f"Updating Lambda configuration (timeout={args.timeout}s, memory={args.memory_size}MB) …")
    update_function_configuration(
        function_name,
        environment,
        args.timeout,
        args.memory_size,
        region,
    )

    print("Ensuring Function URL uses handler-only CORS (empty AllowOrigins) …")
    function_url = ensure_handler_only_function_url_cors(function_name, region, run_aws)

    print(f"Function URL: {function_url}")

    if not args.skip_amplify_update:
        print(f"Updating Amplify branch {args.branch_name} NWS_PROXY_ENDPOINT …")
        merge_amplify_environment(args.app_id, args.branch_name, function_url, region)

        if not args.skip_amplify_release:
            print("Starting Amplify RELEASE job …")
            start_amplify_release(args.app_id, args.branch_name, region)
        else:
            print("Skipped Amplify release (--skip-amplify-release). Redeploy main when ready.")
    else:
        print("Skipped Amplify env update (--skip-amplify-update).")

    print("Done.")


if __name__ == "__main__":
    main()
