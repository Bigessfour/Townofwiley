#!/usr/bin/env python3
"""Unit tests for Community Calendar backend."""

from __future__ import annotations

import json
import sys
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app import (  # noqa: E402
    APPROVED,
    PENDING,
    REJECTED,
    AllowBearerStaffAuthenticator,
    AppConfig,
    AwsSesMailGateway,
    CommunityCalendarBackend,
    InMemoryRateLimiter,
    MemoryEventStore,
    MemoryMailGateway,
    SmtpMailGateway,
    SmtpSettings,
)


def future_start(hours: int = 24) -> str:
    return (
        (datetime.now(UTC) + timedelta(hours=hours)).replace(microsecond=0).isoformat()
    )


def future_end(hours: int = 26) -> str:
    return (
        (datetime.now(UTC) + timedelta(hours=hours)).replace(microsecond=0).isoformat()
    )


def past_end() -> str:
    return (datetime.now(UTC) - timedelta(hours=1)).replace(microsecond=0).isoformat()


class CommunityCalendarTests(unittest.TestCase):
    def setUp(self) -> None:
        self.store = MemoryEventStore()
        self.mail = MemoryMailGateway()
        self.backend = CommunityCalendarBackend(
            AppConfig(
                events_table="test",
                sender_email="noreply@townofwiley.gov",
                sender_name="Town of Wiley",
                clerk_email="clerk@townofwiley.gov",
                public_api_base_url="https://example.lambda-url.us-east-2.on.aws",
            ),
            self.store,
            self.mail,
            authenticator=AllowBearerStaffAuthenticator(),
            submit_rate_limiter=InMemoryRateLimiter(
                max_requests=100, window_seconds=900
            ),
        )
        self.staff_headers = {"authorization": "Bearer staff-ok"}

    def _post_event(self, **overrides: object) -> dict:
        payload = {
            "title": "Yard Sale on Main",
            "description": "Neighborhood yard sale, all welcome.",
            "location": "100 Main Street, Wiley CO",
            "category": "yard_sale",
            "submitterName": "Jane Resident",
            "submitterPhone": "7195551212",
            "submitterEmail": "jane@example.com",
            "startDateTime": future_start(),
            "endDateTime": future_end(),
            "language": "en",
            **overrides,
        }
        response = self.backend.handle(
            {
                "rawPath": "/events",
                "requestContext": {
                    "http": {"method": "POST", "sourceIp": "203.0.113.10"}
                },
                "headers": {"origin": "https://www.townofwiley.gov"},
                "body": json.dumps(payload),
            }
        )
        return response

    def _post_decide(self, path: str, token: str) -> dict:
        return self.backend.handle(
            {
                "rawPath": path,
                "requestContext": {"http": {"method": "POST"}},
                "headers": {"content-type": "application/x-www-form-urlencoded"},
                "body": f"token={token}",
            }
        )

    def test_health(self) -> None:
        response = self.backend.handle(
            {
                "rawPath": "/health",
                "requestContext": {"http": {"method": "GET"}},
            }
        )
        self.assertEqual(response["statusCode"], 200)
        body = json.loads(response["body"])
        self.assertEqual(body["service"], "townofwiley-community-calendar")

    def test_submit_requires_fields(self) -> None:
        response = self._post_event(title="")
        self.assertEqual(response["statusCode"], 400)

    def test_submit_sends_clerk_email_and_stays_pending(self) -> None:
        response = self._post_event()
        self.assertEqual(response["statusCode"], 200)
        body = json.loads(response["body"])
        event_id = body["eventId"]
        item = self.store.get_event(event_id)
        assert item is not None
        self.assertEqual(item["status"], PENDING)
        self.assertEqual(len(self.mail.sent), 1)
        self.assertEqual(self.mail.sent[0]["to"], "clerk@townofwiley.gov")
        self.assertEqual(self.mail.sent[0]["reply_to"], "jane@example.com")
        self.assertEqual(self.mail.sent[0]["from_name"], "Jane Resident")
        self.assertIn("/approve?token=", self.mail.sent[0]["body"])
        self.assertIn("/reject?token=", self.mail.sent[0]["body"])
        self.assertIn("townofwiley.gov/admin", self.mail.sent[0]["body"])
        self.assertIn("confirm", self.mail.sent[0]["body"].lower())

        public = self.backend.handle(
            {
                "rawPath": "/events",
                "requestContext": {"http": {"method": "GET"}},
            }
        )
        public_body = json.loads(public["body"])
        self.assertEqual(public_body["events"], [])

    def test_honeypot_short_circuits(self) -> None:
        response = self._post_event(website="http://spam.example")
        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(len(self.mail.sent), 0)
        self.assertEqual(len(self.store._events), 0)

    def test_get_approve_does_not_mutate(self) -> None:
        create = self._post_event()
        event_id = json.loads(create["body"])["eventId"]
        item = self.store.get_event(event_id)
        assert item is not None
        token = item["approveToken"]

        confirm = self.backend.handle(
            {
                "rawPath": "/approve",
                "requestContext": {"http": {"method": "GET"}},
                "queryStringParameters": {"token": token},
            }
        )
        self.assertEqual(confirm["statusCode"], 200)
        self.assertIn("Confirm approval", confirm["body"])
        self.assertIn('method="post"', confirm["body"].lower())
        updated = self.store.get_event(event_id)
        assert updated is not None
        self.assertEqual(updated["status"], PENDING)
        self.assertEqual(len(self.mail.sent), 1)

    def test_approve_publishes_and_emails_submitter(self) -> None:
        create = self._post_event()
        event_id = json.loads(create["body"])["eventId"]
        item = self.store.get_event(event_id)
        assert item is not None
        token = item["approveToken"]

        # Prefetch GET must not publish
        self.backend.handle(
            {
                "rawPath": "/approve",
                "requestContext": {"http": {"method": "GET"}},
                "queryStringParameters": {"token": token},
            }
        )
        self.assertEqual(self.store.get_event(event_id)["status"], PENDING)

        approve = self._post_decide("/approve", token)
        self.assertEqual(approve["statusCode"], 200)
        self.assertIn("Event approved", approve["body"])

        updated = self.store.get_event(event_id)
        assert updated is not None
        self.assertEqual(updated["status"], APPROVED)
        self.assertEqual(len(self.mail.sent), 2)
        self.assertEqual(self.mail.sent[1]["to"], "jane@example.com")

        public = json.loads(
            self.backend.handle(
                {
                    "rawPath": "/events",
                    "requestContext": {"http": {"method": "GET"}},
                }
            )["body"]
        )
        self.assertEqual(len(public["events"]), 1)
        self.assertEqual(public["events"][0]["title"], "Yard Sale on Main")
        self.assertNotIn("submitterEmail", public["events"][0])
        self.assertNotIn("submitterPhone", public["events"][0])

        # Token single-use
        again = self._post_decide("/approve", token)
        self.assertEqual(again["statusCode"], 404)

    def test_reject_does_not_publish(self) -> None:
        create = self._post_event()
        event_id = json.loads(create["body"])["eventId"]
        item = self.store.get_event(event_id)
        assert item is not None
        reject = self._post_decide("/reject", item["rejectToken"])
        self.assertEqual(reject["statusCode"], 200)
        updated = self.store.get_event(event_id)
        assert updated is not None
        self.assertEqual(updated["status"], REJECTED)
        public = json.loads(
            self.backend.handle(
                {
                    "rawPath": "/events",
                    "requestContext": {"http": {"method": "GET"}},
                }
            )["body"]
        )
        self.assertEqual(public["events"], [])

    def test_expired_events_filtered_from_public_list(self) -> None:
        create = self._post_event(
            startDateTime=(datetime.now(UTC) - timedelta(hours=3)).isoformat(),
            endDateTime=past_end(),
        )
        event_id = json.loads(create["body"])["eventId"]
        item = self.store.get_event(event_id)
        assert item is not None
        self._post_decide("/approve", item["approveToken"])
        public = json.loads(
            self.backend.handle(
                {
                    "rawPath": "/events",
                    "requestContext": {"http": {"method": "GET"}},
                }
            )["body"]
        )
        self.assertEqual(public["events"], [])

    def test_category_filter(self) -> None:
        create = self._post_event(category="bake_sale", title="Bake Sale")
        event_id = json.loads(create["body"])["eventId"]
        item = self.store.get_event(event_id)
        assert item is not None
        self._post_decide("/approve", item["approveToken"])
        filtered = json.loads(
            self.backend.handle(
                {
                    "rawPath": "/events",
                    "requestContext": {"http": {"method": "GET"}},
                    "queryStringParameters": {"category": "yard_sale"},
                }
            )["body"]
        )
        self.assertEqual(filtered["events"], [])
        match = json.loads(
            self.backend.handle(
                {
                    "rawPath": "/events",
                    "requestContext": {"http": {"method": "GET"}},
                    "queryStringParameters": {"category": "bake_sale"},
                }
            )["body"]
        )
        self.assertEqual(len(match["events"]), 1)

    def test_ses_send_failure_does_not_raise(self) -> None:
        class RejectingSes:
            def send_email(self, **_kwargs: object) -> None:
                raise RuntimeError("Email address is not verified")

        gateway = AwsSesMailGateway(
            "noreply@townofwiley.gov",
            "Town of Wiley",
            ses_client=RejectingSes(),
        )
        # Must not raise — submissions should still succeed when SES is down.
        gateway.send_email("clerk@townofwiley.gov", "Subject", "Body")

    def test_ses_source_uses_formataddr_for_special_names(self) -> None:
        captured: dict[str, object] = {}

        class CapturingSes:
            def send_email(self, **kwargs: object) -> None:
                captured.update(kwargs)

        gateway = AwsSesMailGateway(
            "noreply@townofwiley.gov",
            "Town of Wiley",
            ses_client=CapturingSes(),
        )
        gateway.send_email(
            "clerk@townofwiley.gov",
            "Subject",
            "Body",
            from_name='Jane "Resident", <Test>',
            reply_to="jane@example.com",
        )
        source = str(captured.get("Source") or "")
        self.assertIn("noreply@townofwiley.gov", source)
        self.assertNotIn("<Test>", source)
        self.assertEqual(captured.get("ReplyToAddresses"), ["jane@example.com"])

    def test_smtp_send_failure_does_not_raise(self) -> None:
        gateway = SmtpMailGateway(
            SmtpSettings(
                host="mail.townofwiley.gov",
                port=587,
                username="noreply@townofwiley.gov",
                password="bad-password",
                sender_email="noreply@townofwiley.gov",
                sender_name="Town of Wiley",
            )
        )
        with patch("app.smtplib.SMTP", side_effect=OSError("connection refused")):
            gateway.send_email("clerk@townofwiley.gov", "Subject", "Body")

    def test_smtp_skips_when_credentials_missing(self) -> None:
        gateway = SmtpMailGateway(
            SmtpSettings(
                host="mail.townofwiley.gov",
                port=587,
                username="",
                password="",
                sender_email="noreply@townofwiley.gov",
                sender_name="Town of Wiley",
            )
        )
        with patch("app.smtplib.SMTP") as smtp_cls:
            gateway.send_email("clerk@townofwiley.gov", "Subject", "Body")
            smtp_cls.assert_not_called()

    def test_submit_rate_limit(self) -> None:
        limited = CommunityCalendarBackend(
            AppConfig(
                events_table="test",
                sender_email="noreply@townofwiley.gov",
                sender_name="Town of Wiley",
                clerk_email="clerk@townofwiley.gov",
                public_api_base_url="https://example.lambda-url.us-east-2.on.aws",
            ),
            MemoryEventStore(),
            MemoryMailGateway(),
            authenticator=AllowBearerStaffAuthenticator(),
            submit_rate_limiter=InMemoryRateLimiter(max_requests=2, window_seconds=900),
        )
        payload = {
            "title": "Yard Sale",
            "description": "All welcome.",
            "location": "100 Main",
            "category": "yard_sale",
            "submitterName": "Jane",
            "submitterPhone": "7195551212",
            "submitterEmail": "jane@example.com",
            "startDateTime": future_start(),
            "endDateTime": future_end(),
            "language": "en",
        }

        def post_once() -> dict:
            return limited.handle(
                {
                    "rawPath": "/events",
                    "requestContext": {
                        "http": {"method": "POST", "sourceIp": "198.51.100.9"}
                    },
                    "body": json.dumps(payload),
                }
            )

        self.assertEqual(post_once()["statusCode"], 200)
        self.assertEqual(post_once()["statusCode"], 200)
        blocked = post_once()
        self.assertEqual(blocked["statusCode"], 429)

    def test_admin_requires_auth(self) -> None:
        response = self.backend.handle(
            {
                "rawPath": "/admin/events",
                "requestContext": {"http": {"method": "GET"}},
            }
        )
        self.assertEqual(response["statusCode"], 401)

    def test_admin_put_approve_emails_submitter(self) -> None:
        create = self.backend.handle(
            {
                "rawPath": "/admin/events",
                "requestContext": {"http": {"method": "POST"}},
                "headers": self.staff_headers,
                "body": json.dumps(
                    {
                        "title": "Staff Event",
                        "description": "Clerk-created event.",
                        "location": "Town Hall",
                        "category": "gathering",
                        "submitterName": "Clerk",
                        "submitterPhone": "7195559999",
                        "submitterEmail": "clerk@example.com",
                        "startDateTime": future_start(),
                        "endDateTime": future_end(),
                        "status": "pending",
                        "language": "en",
                    }
                ),
            }
        )
        event_id = json.loads(create["body"])["event"]["eventId"]
        before_mail = len(self.mail.sent)
        updated = self.backend.handle(
            {
                "rawPath": f"/admin/events/{event_id}",
                "requestContext": {"http": {"method": "PUT"}},
                "headers": self.staff_headers,
                "body": json.dumps(
                    {
                        "title": "Staff Event",
                        "description": "Clerk-created event.",
                        "location": "Town Hall",
                        "category": "gathering",
                        "submitterName": "Clerk",
                        "submitterPhone": "7195559999",
                        "submitterEmail": "clerk@example.com",
                        "startDateTime": future_start(),
                        "endDateTime": future_end(),
                        "status": "approved",
                        "language": "en",
                    }
                ),
            }
        )
        self.assertEqual(updated["statusCode"], 200)
        self.assertEqual(json.loads(updated["body"])["event"]["status"], APPROVED)
        self.assertEqual(len(self.mail.sent), before_mail + 1)
        self.assertEqual(self.mail.sent[-1]["to"], "clerk@example.com")

    def test_admin_list_create_update_approve_reject_delete(self) -> None:
        create = self.backend.handle(
            {
                "rawPath": "/admin/events",
                "requestContext": {"http": {"method": "POST"}},
                "headers": self.staff_headers,
                "body": json.dumps(
                    {
                        "title": "Staff Bake Sale",
                        "description": "Clerk-created event.",
                        "location": "Town Hall",
                        "category": "bake_sale",
                        "submitterName": "Clerk",
                        "submitterPhone": "7195559999",
                        "submitterEmail": "clerk@example.com",
                        "startDateTime": future_start(),
                        "endDateTime": future_end(),
                        "status": "pending",
                        "language": "en",
                    }
                ),
            }
        )
        self.assertEqual(create["statusCode"], 200)
        created = json.loads(create["body"])["event"]
        event_id = created["eventId"]
        self.assertEqual(created["status"], PENDING)
        self.assertEqual(created["submitterEmail"], "clerk@example.com")

        listed = json.loads(
            self.backend.handle(
                {
                    "rawPath": "/admin/events",
                    "requestContext": {"http": {"method": "GET"}},
                    "headers": self.staff_headers,
                    "queryStringParameters": {"status": "pending"},
                }
            )["body"]
        )
        self.assertEqual(len(listed["events"]), 1)
        self.assertIn("submitterPhone", listed["events"][0])

        updated = self.backend.handle(
            {
                "rawPath": f"/admin/events/{event_id}",
                "requestContext": {"http": {"method": "PUT"}},
                "headers": self.staff_headers,
                "body": json.dumps(
                    {
                        "title": "Staff Bake Sale Updated",
                        "description": "Clerk-created event.",
                        "location": "Town Hall",
                        "category": "bake_sale",
                        "submitterName": "Clerk",
                        "submitterPhone": "7195559999",
                        "submitterEmail": "clerk@example.com",
                        "startDateTime": future_start(),
                        "endDateTime": future_end(),
                        "language": "en",
                    }
                ),
            }
        )
        self.assertEqual(updated["statusCode"], 200)
        self.assertEqual(
            json.loads(updated["body"])["event"]["title"], "Staff Bake Sale Updated"
        )

        approve = self.backend.handle(
            {
                "rawPath": f"/admin/events/{event_id}/approve",
                "requestContext": {"http": {"method": "POST"}},
                "headers": self.staff_headers,
                "body": "{}",
            }
        )
        self.assertEqual(approve["statusCode"], 200)
        self.assertEqual(json.loads(approve["body"])["event"]["status"], APPROVED)
        self.assertEqual(self.mail.sent[-1]["to"], "clerk@example.com")
        self.assertIn("/meetings#community", self.mail.sent[-1]["body"])

        public = json.loads(
            self.backend.handle(
                {
                    "rawPath": "/events",
                    "requestContext": {"http": {"method": "GET"}},
                }
            )["body"]
        )
        self.assertEqual(len(public["events"]), 1)
        self.assertNotIn("submitterEmail", public["events"][0])

        reject = self.backend.handle(
            {
                "rawPath": f"/admin/events/{event_id}/reject",
                "requestContext": {"http": {"method": "POST"}},
                "headers": self.staff_headers,
                "body": "{}",
            }
        )
        self.assertEqual(reject["statusCode"], 200)
        self.assertEqual(json.loads(reject["body"])["event"]["status"], REJECTED)

        deleted = self.backend.handle(
            {
                "rawPath": f"/admin/events/{event_id}",
                "requestContext": {"http": {"method": "DELETE"}},
                "headers": self.staff_headers,
            }
        )
        self.assertEqual(deleted["statusCode"], 200)
        self.assertIsNone(self.store.get_event(event_id))


class JwtUtilsTests(unittest.TestCase):
    def test_assert_staff_token_requires_staff_group(self) -> None:
        try:
            import jwt_utils
        except ModuleNotFoundError as error:
            self.skipTest(f"jwt_utils deps missing: {error}")

        with (
            patch.object(jwt_utils, "USER_POOL_ID", "pool"),
            patch.object(jwt_utils, "CLIENT_ID", "client"),
            patch.object(jwt_utils, "_signing_key", return_value="key"),
            patch.object(
                jwt_utils.jwt,
                "decode",
                return_value={
                    "token_use": "access",
                    "client_id": "client",
                    "cognito:groups": ["Residents"],
                },
            ),
        ):
            self.assertFalse(jwt_utils.assert_staff_token("tok"))

        with (
            patch.object(jwt_utils, "USER_POOL_ID", "pool"),
            patch.object(jwt_utils, "CLIENT_ID", "client"),
            patch.object(jwt_utils, "_signing_key", return_value="key"),
            patch.object(
                jwt_utils.jwt,
                "decode",
                return_value={
                    "token_use": "id",
                    "aud": "client",
                    "cognito:groups": ["Staff"],
                },
            ),
        ):
            self.assertTrue(jwt_utils.assert_staff_token("tok"))


if __name__ == "__main__":
    unittest.main()
