"""Shared Lambda Function URL helpers for Town of Wiley deploy scripts."""

from __future__ import annotations

from typing import Any, Callable


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
