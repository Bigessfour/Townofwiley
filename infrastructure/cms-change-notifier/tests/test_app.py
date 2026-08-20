from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "app.py"
SPEC = importlib.util.spec_from_file_location("cms_change_notifier_app", MODULE_PATH)
APP = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = APP
SPEC.loader.exec_module(APP)

CmsChangeStreamMapper = APP.CmsChangeStreamMapper
StreamMapperConfig = APP.StreamMapperConfig
model_name_from_table = APP.model_name_from_table
summarize_record = APP.summarize_record


class MemoryAuditGateway:
    def __init__(self) -> None:
        self.items: list[dict] = []

    def put_entry(self, *, item: dict) -> None:
        self.items.append(item)

    def list_recent(self, *, limit: int) -> list[dict]:
        return self.items[:limit]


class CmsChangeStreamMapperTests(unittest.TestCase):
    def setUp(self) -> None:
        self.mapper = CmsChangeStreamMapper(
            StreamMapperConfig(
                table_suffix="-j7b2x3sh7rcezekekkxxiak7hi-main",
                ignored_models=frozenset({"InternalOnlyModel"}),
            ),
        )

    def test_model_name_from_table(self) -> None:
        self.assertEqual(
            model_name_from_table(
                "Announcement-j7b2x3sh7rcezekekkxxiak7hi-main",
                "-j7b2x3sh7rcezekekkxxiak7hi-main",
            ),
            "Announcement",
        )

    def test_summarize_record_prefers_title(self) -> None:
        self.assertEqual(summarize_record({"title": "Town picnic"}), "Town picnic")

    def test_maps_modify_event(self) -> None:
        event = {
            "eventName": "MODIFY",
            "eventSourceARN": "arn:aws:dynamodb:us-east-2:570912405222:table/Announcement-j7b2x3sh7rcezekekkxxiak7hi-main/stream/2026-06-20",
            "dynamodb": {
                "NewImage": {
                    "id": {"S": "notice-1"},
                    "title": {"S": "Water outage"},
                    "active": {"BOOL": True},
                },
                "OldImage": {
                    "id": {"S": "notice-1"},
                    "title": {"S": "Old title"},
                    "active": {"BOOL": True},
                },
            },
        }
        mapped = self.mapper.map_event(event)
        self.assertIsNotNone(mapped)
        assert mapped is not None
        self.assertEqual(mapped.model_name, "Announcement")
        self.assertEqual(mapped.operation, "MODIFY")
        self.assertIn("title", mapped.changed_fields)

    def test_ignores_configured_models(self) -> None:
        event = {
            "eventName": "INSERT",
            "eventSourceARN": "arn:aws:dynamodb:us-east-2:570912405222:table/InternalOnlyModel-j7b2x3sh7rcezekekkxxiak7hi-main/stream/2026-06-20",
            "dynamodb": {"NewImage": {"id": {"S": "alias-1"}}},
        }
        self.assertIsNone(self.mapper.map_event(event))


if __name__ == "__main__":
    unittest.main()
