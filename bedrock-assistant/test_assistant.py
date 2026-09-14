"""Non-interactive tests for routing, registry, and usage tracking."""

from src.models import get_model_config, list_available_models
from src.router import detect_task_type, route_request
from src.tracker import UsageTracker


def test_model_registry() -> None:
    models = list_available_models()
    assert len(models) >= 3, f"Expected 3+ models, got {len(models)}"
    print(f"PASS: list_available_models() -> {models}")

    config = get_model_config("nova-lite")
    assert "id" in config and "default_params" in config
    print(f"PASS: get_model_config('nova-lite') -> {config['id']}")


def test_task_detection() -> None:
    cases = [
        ("Write a Python function to sort a list", "code"),
        ("Write a poem about clouds", "creative"),
        ("Analyze the pros and cons of solar energy", "analysis"),
        ("What is the capital of France?", "factual"),
        ("Hello, how are you today?", "general"),
    ]

    for prompt, expected in cases:
        detected = detect_task_type(prompt)
        assert detected == expected, f"'{prompt}' -> {detected}, expected {expected}"
        print(f"PASS: detect_task_type('{prompt[:40]}...') -> {detected}")


def test_routing() -> None:
    model_name, config = route_request("What is the capital of France?")
    assert model_name == "nova-micro"
    assert config["id"]
    print(f"PASS: route_request factual -> {model_name}")

    model_name, _ = route_request("Write a Python function", override_model="nova-pro")
    assert model_name == "nova-pro"
    print("PASS: route_request override -> nova-pro")


def test_usage_tracker() -> None:
    tracker = UsageTracker()
    config = get_model_config("nova-lite")

    tracker.record("nova-lite", 100, 50, config)
    tracker.record("nova-micro", 200, 100, get_model_config("nova-micro"))

    report = tracker.get_report()
    assert "nova-lite" in report
    assert tracker.session_totals["request_count"] == 2
    print("PASS: usage tracking and report generation")

    tracker.reset()
    assert tracker.session_totals["request_count"] == 0
    print("PASS: reset_usage clears data")


def test_error_handling() -> None:
    try:
        get_model_config("invalid-model")
        raise AssertionError("Should have raised ValueError")
    except ValueError as exc:
        assert "Unknown model" in str(exc)
        print(f"PASS: invalid model raises friendly error -> {exc}")


def main() -> None:
    print("=" * 50)
    print("BEDROCK ASSISTANT - LOCAL TESTS")
    print("=" * 50 + "\n")

    test_model_registry()
    print()
    test_task_detection()
    print()
    test_routing()
    print()
    test_usage_tracker()
    print()
    test_error_handling()

    print("\n" + "=" * 50)
    print("All local tests passed!")
    print("=" * 50)


if __name__ == "__main__":
    main()
