"""Usage tracking for Bedrock API calls."""


class UsageTracker:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        """Reset all tracking data."""
        self.session_totals = {
            "input_tokens": 0,
            "output_tokens": 0,
            "total_cost": 0.0,
            "request_count": 0,
        }
        self.per_model: dict[str, dict] = {}

    def record(
        self,
        model_name: str,
        input_tokens: int,
        output_tokens: int,
        config: dict,
    ) -> None:
        """Record usage for a request."""
        cost = self.estimate_cost(input_tokens, output_tokens, config)

        self.session_totals["input_tokens"] += input_tokens
        self.session_totals["output_tokens"] += output_tokens
        self.session_totals["total_cost"] += cost
        self.session_totals["request_count"] += 1

        if model_name not in self.per_model:
            self.per_model[model_name] = {
                "input_tokens": 0,
                "output_tokens": 0,
                "cost": 0.0,
                "requests": 0,
            }

        self.per_model[model_name]["input_tokens"] += input_tokens
        self.per_model[model_name]["output_tokens"] += output_tokens
        self.per_model[model_name]["cost"] += cost
        self.per_model[model_name]["requests"] += 1

    def estimate_cost(self, input_tokens: int, output_tokens: int, config: dict) -> float:
        """Estimate cost for a request."""
        input_cost = (input_tokens / 1000) * config.get("cost_per_1k_input", 0.0001)
        output_cost = (output_tokens / 1000) * config.get("cost_per_1k_output", 0.0004)
        return input_cost + output_cost

    def get_report(self) -> str:
        """Generate a usage report."""
        report = [
            "=" * 50,
            "USAGE REPORT",
            "=" * 50,
            "\nSession Totals:",
            f"  Requests:      {self.session_totals['request_count']}",
            f"  Input Tokens:  {self.session_totals['input_tokens']}",
            f"  Output Tokens: {self.session_totals['output_tokens']}",
            f"  Est. Cost:     ${self.session_totals['total_cost']:.6f}",
        ]

        if self.per_model:
            report.append("\nPer-Model Breakdown:")
            for model, stats in self.per_model.items():
                report.extend(
                    [
                        f"\n  {model}:",
                        f"    Requests: {stats['requests']}",
                        f"    Tokens:   {stats['input_tokens']} in / {stats['output_tokens']} out",
                        f"    Cost:     ${stats['cost']:.6f}",
                    ]
                )

        report.append("\n" + "=" * 50)
        return "\n".join(report)
