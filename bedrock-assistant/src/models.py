"""Model registry for Amazon Bedrock foundation models."""

MODEL_REGISTRY = {
    "nova-lite": {
        "id": "us.amazon.nova-lite-v1:0",
        "description": "Fast, cost-effective responses",
        "use_cases": ["general", "quick_qa", "simple_tasks", "creative", "code"],
        "default_params": {
            "temperature": 0.7,
            "maxTokens": 500,
            "topP": 0.9,
        },
        "cost_tier": "low",
        "cost_per_1k_input": 0.00006,
        "cost_per_1k_output": 0.00024,
    },
    "nova-micro": {
        "id": "us.amazon.nova-micro-v1:0",
        "description": "Ultra-fast, lowest cost",
        "use_cases": ["classification", "simple_qa", "routing", "factual"],
        "default_params": {
            "temperature": 0.5,
            "maxTokens": 300,
            "topP": 0.8,
        },
        "cost_tier": "lowest",
        "cost_per_1k_input": 0.000035,
        "cost_per_1k_output": 0.00014,
    },
    "nova-pro": {
        "id": "us.amazon.nova-pro-v1:0",
        "description": "Balanced performance for complex tasks",
        "use_cases": ["analysis", "reasoning", "complex_qa", "summarization"],
        "default_params": {
            "temperature": 0.6,
            "maxTokens": 1000,
            "topP": 0.9,
        },
        "cost_tier": "medium",
        "cost_per_1k_input": 0.0008,
        "cost_per_1k_output": 0.0032,
    },
}


def get_model_config(model_name: str) -> dict:
    """Get configuration for a specific model."""
    if model_name not in MODEL_REGISTRY:
        raise ValueError(f"Unknown model: {model_name}")
    return MODEL_REGISTRY[model_name]


def list_available_models() -> list[str]:
    """List all available model names."""
    return list(MODEL_REGISTRY.keys())


def get_model_for_use_case(use_case: str) -> str:
    """Find best model for a specific use case."""
    for name, config in MODEL_REGISTRY.items():
        if use_case in config["use_cases"]:
            return name
    return "nova-lite"
