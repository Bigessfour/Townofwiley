"""Smart router that selects the optimal Bedrock model for each task."""

from src.models import get_model_config

TASK_PATTERNS = {
    "code": [
        "write code",
        "function",
        "program",
        "debug",
        "script",
        "python",
        "javascript",
        "implement",
        "algorithm",
    ],
    "creative": [
        "write a story",
        "poem",
        "creative",
        "imagine",
        "fiction",
        "write a song",
        "narrative",
    ],
    "analysis": [
        "analyze",
        "compare",
        "evaluate",
        "assess",
        "review",
        "pros and cons",
        "break down",
    ],
    "factual": [
        "what is",
        "who is",
        "when did",
        "define",
        "explain",
        "capital of",
        "how many",
    ],
    "general": [],
}

TASK_MODEL_MAP = {
    "code": "nova-lite",
    "creative": "nova-lite",
    "analysis": "nova-pro",
    "factual": "nova-micro",
    "general": "nova-lite",
}


def detect_task_type(prompt: str) -> str:
    """Detect the task type from a prompt."""
    prompt_lower = prompt.lower()

    for task_type, patterns in TASK_PATTERNS.items():
        if task_type == "general":
            continue
        for pattern in patterns:
            if pattern in prompt_lower:
                return task_type

    return "general"


def route_request(prompt: str, override_model: str | None = None) -> tuple[str, dict]:
    """Route a request to the optimal model."""
    if override_model:
        print(f"Using override model: {override_model}")
        return override_model, get_model_config(override_model)

    task_type = detect_task_type(prompt)
    model_name = TASK_MODEL_MAP.get(task_type, "nova-lite")

    print(f"Detected task: {task_type} -> Using: {model_name}")

    return model_name, get_model_config(model_name)
