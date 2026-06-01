"""Shared Lambda Function URL helpers for Town of Wiley deploy scripts."""

from __future__ import annotations

import json
from typing import Any, Callable

# Handler-only CORS: empty AllowOrigins/Methods/Headers so Lambda does not emit a
# second Access-Control-Allow-Origin (see AWS Lambda function URL CORS docs and
# infrastructure/nws-weather-proxy/index.mjs).
HANDLER_ONLY_FUNCTION_URL_CORS = {
    "AllowOrigins": [],
    "AllowMethods": [],
    "AllowHeaders": [],
}


def town_site_cors_origins(allowed_origin: str) -> list[str]:
    """Allow both apex and www when a townofwiley.gov origin is configured."""
    origins = {allowed_origin.strip()}
    if "townofwiley.gov" in allowed_origin:
        origins.add("https://www.townofwiley.gov")
        origins.add("https://townofwiley.gov")
    return sorted(origins)


def ensure_none_auth_function_url_public_access(
    function_name: str,
    region: str,
    run_aws: Callable[..., Any],
) -> None:
    """
    Ensure NONE-auth Function URLs allow public invoke per AWS SSOT:
    https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html
    """
    for statement_id, action, extra in [
        (
            "FunctionURLAllowPublicAccess",
            "lambda:InvokeFunctionUrl",
            ["--function-url-auth-type", "NONE"],
        ),
        (
            "FunctionURLAllowPublicInvokeFunction",
            "lambda:InvokeFunction",
            ["--invoked-via-function-url"],
        ),
    ]:
        command = [
            "lambda",
            "add-permission",
            "--function-name",
            function_name,
            "--statement-id",
            statement_id,
            "--action",
            action,
            "--principal",
            "*",
            *extra,
        ]
        try:
            run_aws(command, expect_json=False, region=region)
        except RuntimeError as exc:
            if "already exists" not in str(exc):
                raise


def ensure_handler_only_function_url_cors(
    function_name: str,
    region: str,
    run_aws: Callable[..., Any],
) -> str:
    """
    Disable URL-level CORS emission so only the Lambda handler sets ACAO headers.
    Matches deploy-severe-weather-backend.py and AWS function URL CORS guidance.
    """
    cors_json = json.dumps(HANDLER_ONLY_FUNCTION_URL_CORS)
    try:
        details = run_aws(
            ["lambda", "get-function-url-config", "--function-name", function_name],
            region=region,
        )
        function_url: str = details["FunctionUrl"]
        run_aws(
            [
                "lambda",
                "update-function-url-config",
                "--function-name",
                function_name,
                "--auth-type",
                "NONE",
                "--cors",
                cors_json,
            ],
            region=region,
        )
    except RuntimeError:
        details = run_aws(
            [
                "lambda",
                "create-function-url-config",
                "--function-name",
                function_name,
                "--auth-type",
                "NONE",
                "--cors",
                cors_json,
            ],
            region=region,
        )
        function_url = details["FunctionUrl"]

    ensure_none_auth_function_url_public_access(function_name, region, run_aws)
    return function_url


def ensure_review_function_allows_proxy(
    review_function_name: str,
    proxy_role_name: str,
    region: str,
    run_aws: Callable[..., Any],
) -> None:
    """Grant the review proxy execution role access to the IAM-protected review URL."""
    role = run_aws(["iam", "get-role", "--role-name", proxy_role_name])
    proxy_role_arn: str = role["Role"]["Arn"]

    for statement_id, action, auth_type in [
        ("AllowReviewProxyInvoke", "lambda:InvokeFunctionUrl", "AWS_IAM"),
        ("AllowReviewProxyInvokeFunction", "lambda:InvokeFunction", None),
    ]:
        command = [
            "lambda",
            "add-permission",
            "--function-name",
            review_function_name,
            "--statement-id",
            statement_id,
            "--action",
            action,
            "--principal",
            proxy_role_arn,
        ]
        if auth_type:
            command.extend(["--function-url-auth-type", auth_type])
        try:
            run_aws(command, expect_json=False, region=region)
        except RuntimeError as exc:
            if "already exists" not in str(exc):
                raise
