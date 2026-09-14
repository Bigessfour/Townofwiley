"""Interactive CLI for the Bedrock multi-model AI assistant."""

import os
import sys

from dotenv import load_dotenv

from src.client import BedrockAssistant
from src.models import list_available_models

load_dotenv()


def print_help() -> None:
    """Print available commands."""
    print(
        """
Available Commands:
  /models       - List available models
  /usage        - Show usage report
  /reset        - Reset usage tracking
  /use <model>  - Override model selection
  /auto         - Return to automatic model selection
  /help         - Show this help message
  quit          - Exit the assistant
"""
    )


def handle_command(assistant: BedrockAssistant, user_input: str) -> bool:
    """Handle slash commands. Returns True if handled."""
    cmd = user_input.lower().split()

    if cmd[0] == "/help":
        print_help()
        return True

    if cmd[0] == "/models":
        print("\nAvailable Models:")
        for model in list_available_models():
            print(f"  - {model}")
        print()
        return True

    if cmd[0] == "/usage":
        print(assistant.get_usage_report())
        return True

    if cmd[0] == "/reset":
        assistant.reset_usage()
        print("Usage data reset\n")
        return True

    if cmd[0] == "/use":
        if len(cmd) < 2:
            print("Usage: /use <model_name>\n")
            return True
        try:
            assistant.set_model_override(cmd[1])
            print(f"Model override set to: {cmd[1]}\n")
        except ValueError as exc:
            print(f"Error: {exc}\n")
        return True

    if cmd[0] == "/auto":
        assistant.clear_model_override()
        print("Automatic model selection enabled\n")
        return True

    print("Unknown command. Type /help for options.\n")
    return True


def main() -> None:
    """Run the interactive assistant."""
    region = os.getenv("AWS_REGION", "us-east-1")

    print("=" * 50)
    print("BEDROCK MULTI-MODEL ASSISTANT")
    print("=" * 50)
    print(f"Region: {region}")
    print("Type /help for commands, 'quit' to exit\n")

    try:
        assistant = BedrockAssistant(region=region)
    except Exception as exc:
        print(f"Failed to initialize Bedrock client: {exc}")
        print("Ensure AWS credentials are configured (aws configure).")
        sys.exit(1)

    while True:
        try:
            user_input = input("You: ").strip()

            if not user_input:
                continue

            if user_input.lower() == "quit":
                print("\nGoodbye!")
                break

            if user_input.startswith("/"):
                handle_command(assistant, user_input)
                continue

            result = assistant.smart_chat(user_input)

            print(f"\nAssistant ({result['model']}):")
            print(result["text"])
            print(
                f"\nTokens: {result['input_tokens']} in / "
                f"{result['output_tokens']} out | "
                f"{result['latency']}s | "
                f"${result['cost_estimate']:.6f}\n"
            )

        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except (ValueError, PermissionError, RuntimeError) as exc:
            print(f"\nError: {exc}\n")


if __name__ == "__main__":
    main()
