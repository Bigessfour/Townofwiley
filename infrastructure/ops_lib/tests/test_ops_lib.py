"""Unit tests for infrastructure.ops_lib (no AWS required)."""

from __future__ import annotations

import json
import logging
import sys
import tempfile
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ops_lib.logging_json import JsonFormatter, get_logger, new_correlation_id  # noqa: E402
from ops_lib.notify import send_ops_notification  # noqa: E402
from ops_lib.reliability import CircuitBreaker, retry_with_backoff, timer  # noqa: E402
from ops_lib.s3_archive import upload_ops_artifact  # noqa: E402


class OpsLibTests(unittest.TestCase):
    def test_json_formatter_includes_level_and_message(self) -> None:
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg="hello %s",
            args=("world",),
            exc_info=None,
        )
        record.correlation_id = "abc123"  # type: ignore[attr-defined]
        record.service = "unit"  # type: ignore[attr-defined]
        payload = json.loads(JsonFormatter().format(record))
        self.assertEqual(payload["level"], "INFO")
        self.assertEqual(payload["message"], "hello world")
        self.assertEqual(payload["correlation_id"], "abc123")
        self.assertEqual(payload["service"], "unit")

    def test_correlation_id_length(self) -> None:
        cid = new_correlation_id()
        self.assertEqual(len(cid), 12)

    def test_get_logger_json(self) -> None:
        log = get_logger("tow.test", service="test", correlation_id="cid1", json_logs=True)
        self.assertTrue(log.handlers)
        log.info("smoke")

    def test_retry_eventually_succeeds(self) -> None:
        state = {"n": 0}

        def flaky() -> str:
            state["n"] += 1
            if state["n"] < 3:
                raise RuntimeError("transient")
            return "ok"

        self.assertEqual(retry_with_backoff(flaky, max_attempts=3, base_delay=0.01), "ok")

    def test_retry_exhausts(self) -> None:
        def always_fail() -> None:
            raise RuntimeError("nope")

        with self.assertRaises(RuntimeError):
            retry_with_backoff(always_fail, max_attempts=2, base_delay=0.01)

    def test_circuit_breaker_opens(self) -> None:
        cb = CircuitBreaker(failure_threshold=2, timeout_seconds=60, name="t")

        def boom() -> None:
            raise RuntimeError("down")

        with self.assertRaises(RuntimeError):
            cb.call(boom)
        with self.assertRaises(RuntimeError):
            cb.call(boom)
        self.assertEqual(cb.state, "OPEN")
        with self.assertRaises(RuntimeError) as ctx:
            cb.call(boom)
        self.assertIn("OPEN", str(ctx.exception))

    def test_timer_logs_duration(self) -> None:
        log = get_logger("tow.timer", json_logs=False, correlation_id="t")
        with timer("unit-op", log=log):
            time.sleep(0.01)

    def test_sns_skipped_without_arn(self) -> None:
        self.assertFalse(
            send_ops_notification("hi", "body", topic_arn="", sns_client=object())
        )

    def test_sns_publish_success(self) -> None:
        class FakeSns:
            def __init__(self) -> None:
                self.calls: list[dict[str, str]] = []

            def publish(self, **kwargs: str) -> dict[str, str]:
                self.calls.append(kwargs)
                return {"MessageId": "1"}

        fake = FakeSns()
        ok = send_ops_notification(
            "Site down",
            "details",
            severity="ERROR",
            topic_arn="arn:aws:sns:us-east-2:570912405222:tow-ops-alerts",
            sns_client=fake,
        )
        self.assertTrue(ok)
        self.assertEqual(len(fake.calls), 1)
        self.assertTrue(fake.calls[0]["Subject"].startswith("[ERROR]"))

    def test_sns_never_raises(self) -> None:
        class BoomSns:
            def publish(self, **kwargs: str) -> None:
                raise RuntimeError("network")

        self.assertFalse(
            send_ops_notification(
                "x",
                "y",
                topic_arn="arn:aws:sns:us-east-2:570912405222:tow-ops-alerts",
                sns_client=BoomSns(),
            )
        )

    def test_s3_skipped_without_bucket(self) -> None:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(b"hello")
            path = tmp.name
        try:
            self.assertIsNone(upload_ops_artifact(path, bucket=""))
        finally:
            Path(path).unlink(missing_ok=True)

    def test_s3_upload_success(self) -> None:
        class FakeS3:
            def __init__(self) -> None:
                self.puts: list[dict[str, object]] = []

            def put_object(self, **kwargs: object) -> dict[str, str]:
                self.puts.append(kwargs)
                return {}

        with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as tmp:
            tmp.write(b"artifact")
            path = tmp.name
        try:
            fake = FakeS3()
            uri = upload_ops_artifact(
                path,
                bucket="townofwiley-ops-artifacts",
                s3_client=fake,
                correlation_id="run1",
            )
            self.assertIsNotNone(uri)
            assert uri is not None
            self.assertTrue(uri.startswith("s3://townofwiley-ops-artifacts/"))
            self.assertEqual(len(fake.puts), 1)
        finally:
            Path(path).unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
