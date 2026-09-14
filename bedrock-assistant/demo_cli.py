"""Non-interactive demo of CLI commands for challenge deliverables."""

import os
import sys

from dotenv import load_dotenv

from src.client import BedrockAssistant
from src.models import list_available_models
from src.router import detect_task_type, route_request

load_dotenv()


def demo_routing() -> None:
    print("=" * 50)
    print("DEMO: Smart Routing")
    print("=" * 50)

    prompts = [
        "Write a Python function to reverse a string",
        "Write a poem about clouds",
        "What is the capital of France?",
        "Analyze the tradeoffs between microservices and monoliths",
    ]

    for prompt in prompts:
        task = detect_task_type(prompt)
        model, _ = route_request(prompt)
        print(f"\nPrompt: {prompt}")
        print(f"  Task: {task} | Model: {model}")


def demo_commands(assistant: BedrockAssistant) -> None:
    print("\n" + "=" * 50)
    print("DEMO: /models command")
    print("=" * 50)
    print("\nAvailable Models:")
    for model in list_available_models():
        print(f"  - {model}")

    print("\n" + "=" * 50)
    print("DEMO: Live chat samples")
    print("=" * 50)

    samples = [
        "What is the capital of France?",
        "Write a haiku about programming",
    ]

    for prompt in samples:
        print(f"\nYou: {prompt}")
        result = assistant.smart_chat(prompt)
        print(f"\nAssistant ({result['model']}):")
        print(result["text"][:300] + ("..." if len(result["text"]) > 300 else ""))
        print(
            f"\nTokens: {result['input_tokens']} in / {result['output_tokens']} out | "
            f"{result['latency']}s | ${result['cost_estimate']:.6f}"
        )

    print("\n" + "=" * 50)
    print("DEMO: /use nova-micro override")
    print("=" * 50)
    assistant.set_model_override("nova-micro")
    prompt = "Analyze the economic impact of renewable energy"
    print(f"\nYou: {prompt}")
    result = assistant.smart_chat(prompt)
    print(f"\nAssistant ({result['model']}):")
    print(result["text"][:300] + ("..." if len(result["text"]) > 300 else ""))

    print("\n" + "=" * 50)
    print("DEMO: /usage report")
    print("=" * 50)
    print(assistant.get_usage_report())

    print("\n" + "=" * 50)
    print("DEMO: Error handling (invalid model)")
    print("=" * 50)
    try:
        assistant.set_model_override("invalid-model")
    except ValueError as exc:
        print(f"Error: {exc}")

    print("\n" + "=" * 50)
    print("DEMO: /reset then /usage")
    print("=" * 50)
    assistant.reset_usage()
    print(assistant.get_usage_report())


def main() -> None:
    region = os.getenv("AWS_REGION", "us-east-1")

    demo_routing()

    try:
        assistant = BedrockAssistant(region=region)
    except Exception as exc:
        print(f"\nSkipping live Bedrock demo (no credentials): {exc}")
        print("Configure AWS credentials with 'aws configure' to test live calls.")
        sys.exit(0)

    try:
        assistant.client.converse(
            modelId="us.amazon.nova-micro-v1:0",
            messages=[{"role": "user", "content": [{"text": "Say hello in one word."}]}],
            inferenceConfig={"maxTokens": 10, "temperature": 0.5, "topP": 0.8},
        )
    except Exception as exc:
        print(f"\nSkipping live Bedrock demo: {exc}")
        sys.exit(0)

    demo_commands(assistant)


if __name__ == "__main__":
    main()
