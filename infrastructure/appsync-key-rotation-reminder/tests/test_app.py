from __future__ import annotations

import importlib.util
import sys
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "app.py"
SPEC = importlib.util.spec_from_file_location(
    "appsync_key_rotation_reminder_app", MODULE_PATH
)
APP = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = APP
SPEC.loader.exec_module(APP)


class MemoryAppSyncGateway:
    def __init__(self, api_keys: list[dict]) -> None:
        self._api_keys = api_keys

    def list_api_keys(self, *, api_id: str) -> list[dict]:
        del api_id
        return self._api_keys


class RecordingSnsGateway:
    def __init__(self) -> None:
        self.messages: list[dict[str, str]] = []

    def publish(self, *, topic_arn: str, subject: str, message: str) -> None:
        self.messages.append(
            {"topic_arn": topic_arn, "subject": subject, "message": message},
        )


class AppSyncKeyRotationReminderTests(unittest.TestCase):
    def test_find_expiring_keys_within_warn_window(self) -> None:
        now = datetime(2026, 6, 1, tzinfo=UTC)
        expires = (now + timedelta(days=10)).timestamp()
        expiring = APP.find_expiring_keys(
            [{"id": "key-1", "description": "Prod", "expires": expires}],
            warn_days=30,
            now=now,
        )
        self.assertEqual(len(expiring), 1)
        self.assertEqual(expiring[0].key_id, "key-1")
        self.assertEqual(expiring[0].days_remaining, 10)

    def test_ignores_keys_outside_warn_window(self) -> None:
        now = datetime(2026, 6, 1, tzinfo=UTC)
        expires = (now + timedelta(days=45)).timestamp()
        expiring = APP.find_expiring_keys(
            [{"id": "key-1", "expires": expires}],
            warn_days=30,
            now=now,
        )
        self.assertEqual(expiring, [])

    def test_sends_sns_when_expiring_keys_found(self) -> None:
        now = datetime(2026, 6, 1, tzinfo=UTC)
        expires = (now + timedelta(days=5)).timestamp()
        sns = RecordingSnsGateway()
        reminder = APP.AppSyncKeyRotationReminder(
            config=APP.AppConfig(
                api_id="j7b2x3sh7rcezekekkxxiak7hi",
                warn_days=30,
                sns_topic_arn="arn:aws:sns:us-east-2:570912405222:TestTopic",
            ),
            appsync_gateway=MemoryAppSyncGateway(
                [{"id": "da2-old", "description": "Prod", "expires": expires}],
            ),
            sns_gateway=sns,
        )

        result = reminder.run(now=now)

        self.assertTrue(result.notified)
        self.assertEqual(len(sns.messages), 1)
        self.assertIn("Zero-downtime", sns.messages[0]["message"])
        self.assertIn("create-api-key", sns.messages[0]["message"])
        self.assertIn("delete-api-key", sns.messages[0]["message"])
        self.assertIn("da2-old", sns.messages[0]["message"])

    def test_skips_sns_when_no_expiring_keys(self) -> None:
        now = datetime(2026, 6, 1, tzinfo=UTC)
        expires = (now + timedelta(days=90)).timestamp()
        sns = RecordingSnsGateway()
        reminder = APP.AppSyncKeyRotationReminder(
            config=APP.AppConfig(
                api_id="j7b2x3sh7rcezekekkxxiak7hi",
                warn_days=30,
                sns_topic_arn="arn:aws:sns:us-east-2:570912405222:TestTopic",
            ),
            appsync_gateway=MemoryAppSyncGateway(
                [{"id": "da2-fresh", "expires": expires}],
            ),
            sns_gateway=sns,
        )

        result = reminder.run(now=now)

        self.assertFalse(result.notified)
        self.assertEqual(sns.messages, [])


if __name__ == "__main__":
    unittest.main()
