"""Retry with exponential backoff, circuit breaker, and timing helpers."""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from typing import TypeVar

T = TypeVar("T")
logger = logging.getLogger(__name__)


def retry_with_backoff(
    func: Callable[[], T],
    *,
    max_attempts: int = 3,
    base_delay: float = 1.0,
    exceptions: tuple[type[BaseException], ...] = (Exception,),
    log: logging.Logger | None = None,
) -> T:
    """Retry *func* with exponential backoff (1s, 2s, 4s by default)."""
    log = log or logger
    last_error: BaseException | None = None
    for attempt in range(max_attempts):
        try:
            return func()
        except exceptions as exc:
            last_error = exc
            if attempt == max_attempts - 1:
                log.error("All retry attempts failed: %s", exc)
                raise
            delay = base_delay * (2**attempt)
            log.warning(
                "Attempt %s failed (%s); retrying in %.1fs",
                attempt + 1,
                exc,
                delay,
            )
            time.sleep(delay)
    assert last_error is not None
    raise last_error


class CircuitBreaker:
    """Fail fast after repeated failures; half-open after timeout."""

    def __init__(
        self,
        *,
        failure_threshold: int = 3,
        timeout_seconds: float = 60,
        name: str = "circuit",
    ) -> None:
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout = timedelta(seconds=timeout_seconds)
        self.last_failure_time: datetime | None = None
        self.state = "CLOSED"
        self.name = name

    def call(self, func: Callable[[], T], *args: object, **kwargs: object) -> T:
        if self.state == "OPEN":
            if (
                self.last_failure_time is not None
                and datetime.now(tz=UTC) - self.last_failure_time > self.timeout
            ):
                self.state = "HALF_OPEN"
            else:
                raise RuntimeError(f"Circuit breaker OPEN ({self.name})")

        try:
            result = func(*args, **kwargs)  # type: ignore[arg-type]
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
            return result
        except Exception:
            self.failure_count += 1
            self.last_failure_time = datetime.now(tz=UTC)
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
            raise


@contextmanager
def timer(operation_name: str, log: logging.Logger | None = None):
    """Context manager that logs start/end duration."""
    log = log or logger
    start = time.perf_counter()
    log.info("Starting: %s", operation_name)
    try:
        yield
        duration = time.perf_counter() - start
        log.info("Completed: %s (%.2fs)", operation_name, duration)
    except Exception as exc:
        duration = time.perf_counter() - start
        log.error("Failed: %s (%.2fs) — %s", operation_name, duration, exc)
        raise
