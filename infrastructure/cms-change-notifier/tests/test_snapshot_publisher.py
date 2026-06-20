import importlib.util
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from snapshot_publisher import (
    build_revision_manifest,
    build_snapshot,
    publish_public_cms_snapshot,
)


class SnapshotPublisherTests(unittest.TestCase):
    def test_build_revision_manifest_uses_saved_at(self) -> None:
        manifest = build_revision_manifest({"savedAt": "2026-06-20T12:00:00.000Z"})
        self.assertEqual(manifest["revision"], "2026-06-20T12:00:00.000Z")

    def test_publish_public_cms_snapshot_writes_snapshot_and_revision(self) -> None:
        storage = MagicMock()
        core = {
            "listSiteSettings": {"items": [{"townName": "Town of Wiley"}]},
            "listAlertBanners": {"items": []},
            "listAnnouncements": {"items": []},
            "listEvents": {"items": []},
            "listOfficialContacts": {"items": []},
        }
        extended = {
            "listBusinesses": {"items": []},
            "listPublicDocuments": {"items": []},
            "listExternalNewsLinks": {"items": []},
            "listLeadershipRosterEntries": {
                "items": [{"id": "1", "lineEn": "Mayor: Pat"}]
            },
        }

        with patch(
            "snapshot_publisher.fetch_public_cms_snapshot",
            return_value=build_snapshot(core, extended, build_sha="abc"),
        ):
            result = publish_public_cms_snapshot(
                storage=storage,
                endpoint="https://example.appsync-api.us-east-2.amazonaws.com/graphql",
                api_key="test-key",
            )

        self.assertTrue(result["revision"])
        self.assertEqual(storage.put_json.call_count, 2)
        snapshot_call = storage.put_json.call_args_list[0].kwargs
        revision_call = storage.put_json.call_args_list[1].kwargs
        self.assertEqual(snapshot_call["key"], "cms-snapshot.json")
        self.assertEqual(revision_call["key"], "cms-revision.json")
        self.assertEqual(
            revision_call["payload"]["revision"], snapshot_call["payload"]["savedAt"]
        )


if __name__ == "__main__":
    unittest.main()
