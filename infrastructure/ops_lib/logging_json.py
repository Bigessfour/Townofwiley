"""Structured JSON logging for Town of Wiley Lambdas and ops scripts."""

from __future__ import annotations

import json
import logging
import os
import sys
import uuid
from datetime import UTC, datetime
from typing import Any


class JsonFormatter(logging.Formatter):
    """Emit one JSON object per log line (CloudWatch Insights friendly)."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(tz=UTC).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
        }
        if hasattr(record, "correlation_id"):
            payload["correlation_id"] = getattr(record, "correlation_id")
        if hasattr(record, "service"):
            payload["service"] = getattr(record, "service")
        if hasattr(record, "duration_ms"):
            payload["duration_ms"] = getattr(record, "duration_ms")
        if hasattr(record, "metric"):
            payload["metric"] = getattr(record, "metric")
        if hasattr(record, "extra_fields") and isinstance(
            getattr(record, "extra_fields"), dict
        ):
            payload.update(getattr(record, "extra_fields"))
        if record.exc_info:
            payload["error_type"] = (
                record.exc_info[0].__name__ if record.exc_info[0] else "Exception"
            )
            payload["error"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


class CorrelationFilter(logging.Filter):
    def __init__(self, correlation_id: str, service: str) -> None:
        super().__init__()
        self.correlation_id = correlation_id
        self.service = service

    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = self.correlation_id  # type: ignore[attr-defined]
        record.service = self.service  # type: ignore[attr-defined]
        return True


def new_correlation_id() -> str:
    return uuid.uuid4().hex[:12]


def _resolve_level(name: str | None) -> int:
    raw = (name or os.environ.get("LOG_LEVEL") or "INFO").strip().upper()
    return getattr(logging, raw, logging.INFO)


def get_logger(
    name: str,
    *,
    service: str | None = None,
    correlation_id: str | None = None,
    level: str | None = None,
    json_logs: bool | None = None,
) -> logging.Logger:
    """
    Return a logger. In Lambda / when LOG_FORMAT=json, emit JSON lines.
    Local default is human-readable unless LOG_FORMAT=json.
    """
    logger = logging.getLogger(name)
    logger.handlers.clear()
    logger.propagate = False
    logger.setLevel(_resolve_level(level))

    use_json = json_logs
    if use_json is None:
        use_json = os.environ.get("LOG_FORMAT", "json").strip().lower() in {
            "json",
            "1",
            "true",
            "yes",
        }

    handler = logging.StreamHandler(sys.stdout)
    if use_json:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)s [%(name)s] %(message)s",
            )
        )

    cid = correlation_id or os.environ.get("CORRELATION_ID") or new_correlation_id()
    svc = service or os.environ.get("TOW_SERVICE") or name
    handler.addFilter(CorrelationFilter(cid, svc))
    logger.addHandler(handler)
    return logger


def log_metric(
    logger: logging.Logger,
    name: str,
    value: float | int,
    *,
    unit: str = "",
    threshold: float | int | None = None,
) -> None:
    """Log a metric line; WARNING if threshold exceeded."""
    extra = {
        "metric": {"name": name, "value": value, "unit": unit},
    }
    msg = f"METRIC {name}={value}{unit}"
    # attach via LoggerAdapter-like attributes on record through extra is limited;
    # keep message + optional warning
    logger.info(msg, extra={"extra_fields": extra})
    if threshold is not None and value > threshold:
        logger.warning(
            f"Threshold exceeded: {name}={value}{unit} (max: {threshold}{unit})",
            extra={"extra_fields": {**extra, "threshold": threshold}},
        )
