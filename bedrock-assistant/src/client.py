"""Unified Amazon Bedrock client with routing, retries, and usage tracking."""

import time
from typing import Any

import boto3
from botocore.exceptions import ClientError

from src.models import get_model_config
from src.router import route_request
from src.tracker import UsageTracker

MAX_RETRIES = 3
RETRYABLE_ERRORS = {
    "ThrottlingException",
    "ServiceUnavailableException",
    "ModelTimeoutException",
}


class BedrockAssistant:
    def __init__(self, region: str = "us-east-1") -> None:
        self.client = boto3.client("bedrock-runtime", region_name=region)
        self.tracker = UsageTracker()
        self.override_model: str | None = None

    def set_model_override(self, model_name: str) -> None:
        """Set a model override for all requests."""
        get_model_config(model_name)
        self.override_model = model_name

    def clear_model_override(self) -> None:
        """Clear the model override."""
        self.override_model = None

    def _invoke_model(self, prompt: str, model_name: str, config: dict) -> dict[str, Any]:
        """Internal method to invoke a model with retry logic."""
        messages = [{"role": "user", "content": [{"text": prompt}]}]
        inference_config = config["default_params"]

        last_error: Exception | None = None

        for attempt in range(1, MAX_RETRIES + 1):
            start_time = time.time()
            try:
                response = self.client.converse(
                    modelId=config["id"],
                    messages=messages,
                    inferenceConfig=inference_config,
                )

                elapsed = time.time() - start_time
                usage = response.get("usage", {})
                input_tokens = usage.get("inputTokens", 0)
                output_tokens = usage.get("outputTokens", 0)

                self.tracker.record(model_name, input_tokens, output_tokens, config)

                return {
                    "text": response["output"]["message"]["content"][0]["text"],
                    "model": model_name,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "latency": round(elapsed, 2),
                    "cost_estimate": self.tracker.estimate_cost(
                        input_tokens, output_tokens, config
                    ),
                }

            except ClientError as exc:
                last_error = exc
                error_code = exc.response.get("Error", {}).get("Code", "")

                if error_code == "AccessDeniedException":
                    raise PermissionError(
                        f"Access denied for model '{model_name}'. "
                        "Enable model access in the Amazon Bedrock console."
                    ) from exc

                if error_code in RETRYABLE_ERRORS and attempt < MAX_RETRIES:
                    backoff = 2 ** (attempt - 1)
                    print(
                        f"Request throttled. Retrying in {backoff}s "
                        f"(attempt {attempt}/{MAX_RETRIES})..."
                    )
                    time.sleep(backoff)
                    continue

                if error_code == "ValidationException":
                    raise ValueError(
                        f"Invalid request for model '{model_name}': "
                        f"{exc.response.get('Error', {}).get('Message', str(exc))}"
                    ) from exc

                raise RuntimeError(
                    f"Bedrock API error ({error_code}): "
                    f"{exc.response.get('Error', {}).get('Message', str(exc))}"
                ) from exc

        raise RuntimeError(
            f"Request failed after {MAX_RETRIES} attempts: {last_error}"
        )

    def chat(self, prompt: str, model_name: str = "nova-lite") -> dict[str, Any]:
        """Chat using a specific model."""
        config = get_model_config(model_name)
        return self._invoke_model(prompt, model_name, config)

    def chat_with_model(self, prompt: str, model_name: str) -> dict[str, Any]:
        """Chat using an explicitly specified model."""
        return self.chat(prompt, model_name)

    def smart_chat(self, prompt: str) -> dict[str, Any]:
        """Chat using automatic model routing."""
        model_name, config = route_request(prompt, self.override_model)
        return self._invoke_model(prompt, model_name, config)

    def get_usage_report(self) -> str:
        """Get usage report from tracker."""
        return self.tracker.get_report()

    def reset_usage(self) -> None:
        """Reset usage tracking."""
        self.tracker.reset()
