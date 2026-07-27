from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "app.py"
SPEC = importlib.util.spec_from_file_location("email_alias_router_app", MODULE_PATH)
APP = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = APP
SPEC.loader.exec_module(APP)


class MemoryAliasDirectory:
    def __init__(self, aliases: list[APP.EmailAliasRecord]) -> None:
        self._aliases = {alias.alias_address: alias for alias in aliases}

    def find_first_active_alias(
        self, candidate_addresses: list[str]
    ) -> APP.EmailAliasRecord | None:
        for candidate_address in candidate_addresses:
            alias = self._aliases.get(candidate_address)
            if alias and alias.active:
                return alias

        return None


class StaticObjectStore:
    def __init__(self, objects: dict[tuple[str, str], bytes]) -> None:
        self._objects = objects

    def get_object_bytes(self, bucket_name: str, object_key: str) -> bytes:
        return self._objects[(bucket_name, object_key)]


class RecordingForwarder:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def forward(
        self,
        alias: APP.EmailAliasRecord,
        raw_message: bytes,
        parsed_message,
        *,
        reforward: bool = False,
    ) -> dict[str, object]:
        del raw_message
        self.calls.append(
            {
                "alias_address": alias.alias_address,
                "destination_address": alias.destination_address,
                "subject": parsed_message.get("Subject", ""),
                "reforward": reforward,
            },
        )
        return {
            "original_bytes": 1,
            "forward_bytes": 1,
            "content_type": "text/plain",
            "attachment_count": 0,
        }


class RecordingSesClient:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def send_raw_email(self, **kwargs) -> None:
        self.calls.append(kwargs)


def build_router(
    raw_message: bytes,
    aliases: list[APP.EmailAliasRecord],
    *,
    fallback_alias_address: str = "",
) -> tuple[APP.EmailAliasRouter, RecordingForwarder]:
    forwarder = RecordingForwarder()
    router = APP.EmailAliasRouter(
        config=APP.AppConfig(
            alias_table="EmailAliasTable",
            alias_table_region="us-east-2",
            forwarder_from="mailer@townofwiley.gov",
            alias_domain="townofwiley.gov",
            ses_send_region="us-east-2",
            fallback_alias_address=fallback_alias_address,
        ),
        alias_directory=MemoryAliasDirectory(aliases),
        object_store=StaticObjectStore(
            {("incoming-bucket", "inbox/message-1.eml"): raw_message}
        ),
        mail_forwarder=forwarder,
    )
    return router, forwarder


class EmailAliasRouterTests(unittest.TestCase):
    def test_routes_s3_email_to_matching_alias_destination(self) -> None:
        raw_message = (
            b"From: Resident <resident@example.com>\n"
            b"To: Steve McKitrick <steve.mckitrick@townofwiley.gov>\n"
            b"Subject: Council agenda question\n\n"
            b"Hello from a resident."
        )
        router, forwarder = build_router(
            raw_message,
            [
                APP.EmailAliasRecord(
                    alias_address="steve.mckitrick@townofwiley.gov",
                    destination_address="bigessfour@gmail.com",
                    active=True,
                    display_name="Steve McKitrick",
                    role_label="Mayor",
                ),
            ],
        )

        response = router.handle(
            {
                "Records": [
                    {
                        "eventSource": "aws:s3",
                        "s3": {
                            "bucket": {"name": "incoming-bucket"},
                            "object": {"key": "inbox/message-1.eml"},
                        },
                    },
                ],
            },
        )

        self.assertEqual(response["processed"], 1)
        self.assertEqual(response["forwarded"], 1)
        self.assertEqual(len(forwarder.calls), 1)
        self.assertEqual(
            forwarder.calls[0]["alias_address"], "steve.mckitrick@townofwiley.gov"
        )
        self.assertEqual(
            forwarder.calls[0]["destination_address"], "bigessfour@gmail.com"
        )

    def test_skips_when_no_active_alias_matches(self) -> None:
        raw_message = (
            b"From: Resident <resident@example.com>\n"
            b"To: Clerk <deb.dillon@townofwiley.gov>\n"
            b"Subject: Records request\n\n"
            b"Please send the packet."
        )
        router, forwarder = build_router(
            raw_message,
            [
                APP.EmailAliasRecord(
                    alias_address="deb.dillon@townofwiley.gov",
                    destination_address="clerk@example.com",
                    active=False,
                ),
            ],
        )

        response = router.handle(
            {
                "Records": [
                    {
                        "eventSource": "aws:s3",
                        "s3": {
                            "bucket": {"name": "incoming-bucket"},
                            "object": {"key": "inbox/message-1.eml"},
                        },
                    },
                ],
            },
        )

        self.assertEqual(response["processed"], 1)
        self.assertEqual(response["forwarded"], 0)
        self.assertEqual(response["results"][0]["reason"], "no_active_alias_match")
        self.assertEqual(forwarder.calls, [])

    def test_falls_back_to_clerk_alias_for_unknown_town_address(self) -> None:
        raw_message = (
            b"From: Resident <resident@example.com>\n"
            b"To: Utilities <utilities@townofwiley.gov>\n"
            b"Subject: Water bill\n\n"
            b"Question about my bill."
        )
        router, forwarder = build_router(
            raw_message,
            [
                APP.EmailAliasRecord(
                    alias_address="clerk@townofwiley.gov",
                    destination_address="clerk-inbox@secom.example",
                    active=True,
                    display_name="Town Clerk",
                    role_label="Clerk",
                ),
            ],
            fallback_alias_address="clerk@townofwiley.gov",
        )

        response = router.handle(
            {
                "Records": [
                    {
                        "eventSource": "aws:s3",
                        "s3": {
                            "bucket": {"name": "incoming-bucket"},
                            "object": {"key": "inbox/message-1.eml"},
                        },
                    },
                ],
            },
        )

        self.assertEqual(response["forwarded"], 1)
        self.assertEqual(forwarder.calls[0]["alias_address"], "clerk@townofwiley.gov")
        self.assertEqual(
            forwarder.calls[0]["destination_address"], "clerk-inbox@secom.example"
        )

    def test_build_forward_email_preserves_alias_and_reply_path(self) -> None:
        raw_message = (
            b"From: Resident <resident@example.com>\n"
            b"Reply-To: resident.reply@example.com\n"
            b"To: Mayor <steve.mckitrick@townofwiley.gov>\n"
            b"Subject: Test subject\n\n"
            b"Original message body."
        )
        parsed_message = APP.BytesParser(policy=APP.policy.default).parsebytes(
            raw_message
        )
        alias = APP.EmailAliasRecord(
            alias_address="steve.mckitrick@townofwiley.gov",
            destination_address="bigessfour@gmail.com",
            active=True,
            display_name="Town of Wiley Mail",
            role_label="Mayor",
        )

        forward_message = APP.build_forward_email(
            alias, raw_message, parsed_message, "mailer@townofwiley.gov"
        )
        raw_out = forward_message.as_bytes(policy=APP.policy.SMTP)

        self.assertEqual(forward_message["To"], "bigessfour@gmail.com")
        self.assertEqual(forward_message["Reply-To"], "resident.reply@example.com")
        self.assertEqual(
            forward_message["X-Town-Alias"], "steve.mckitrick@townofwiley.gov"
        )
        self.assertIn("Fwd: Test subject", forward_message["Subject"])
        # Body must stay inline — not only nested as message/rfc822 .eml
        self.assertIn(b"Original message body.", raw_out)
        self.assertNotIn(b"original-message.eml", raw_out)
        self.assertNotIn(b"The original message is attached", raw_out)

    def test_build_forward_email_preserves_multipart_attachments_inline(self) -> None:
        raw_message = (
            b"From: Vendor <vendor@example.com>\n"
            b"To: Clerk <clerk@townofwiley.gov>\n"
            b"Subject: Packet with PDF\n"
            b"MIME-Version: 1.0\n"
            b'Content-Type: multipart/mixed; boundary="bound123"\n'
            b"\n"
            b"--bound123\n"
            b"Content-Type: text/plain; charset=utf-8\n"
            b"\n"
            b"Please see the attached packet.\n"
            b"--bound123\n"
            b"Content-Type: application/pdf\n"
            b"Content-Disposition: attachment; filename=packet.pdf\n"
            b"Content-Transfer-Encoding: base64\n"
            b"\n"
            b"JVBERi0xLjQK\n"
            b"--bound123--\n"
        )
        parsed_message = APP.BytesParser(policy=APP.policy.default).parsebytes(
            raw_message
        )
        alias = APP.EmailAliasRecord(
            alias_address="clerk@townofwiley.gov",
            destination_address="clerk-inbox@example.com",
            active=True,
        )

        forward_message = APP.build_forward_email(
            alias, raw_message, parsed_message, "mailer@townofwiley.gov"
        )
        raw_out = forward_message.as_bytes(policy=APP.policy.SMTP)

        self.assertIn(b"Please see the attached packet.", raw_out)
        self.assertIn(b'filename="packet.pdf"', raw_out)
        self.assertIn(b"JVBERi0xLjQK", raw_out)
        self.assertIn(b"application/pdf", raw_out)
        self.assertEqual(forward_message["To"], "clerk-inbox@example.com")
        self.assertIn("mailer@townofwiley.gov", forward_message["From"])

    def test_ses_mail_forwarder_sends_raw_message_with_alias_metadata(self) -> None:
        raw_message = (
            b"From: Resident <resident@example.com>\n"
            b"To: Mayor <steve.mckitrick@townofwiley.gov>\n"
            b"Subject: Test subject\n\n"
            b"Original message body."
        )
        parsed_message = APP.BytesParser(policy=APP.policy.default).parsebytes(
            raw_message
        )
        alias = APP.EmailAliasRecord(
            alias_address="steve.mckitrick@townofwiley.gov",
            destination_address="bigessfour@gmail.com",
            active=True,
            display_name="Town of Wiley Mail",
            role_label="Mayor",
        )
        ses_client = RecordingSesClient()
        forwarder = APP.SesMailForwarder("mailer@townofwiley.gov", ses_client)

        forwarder.forward(alias, raw_message, parsed_message)

        self.assertEqual(len(ses_client.calls), 1)
        self.assertEqual(ses_client.calls[0]["Source"], "mailer@townofwiley.gov")
        self.assertEqual(ses_client.calls[0]["Destinations"], ["bigessfour@gmail.com"])
        raw_data = ses_client.calls[0]["RawMessage"]["Data"]
        self.assertIn(
            b"X-Town-Alias: steve.mckitrick@townofwiley.gov",
            raw_data,
        )
        self.assertIn(b"Original message body.", raw_data)
        self.assertNotIn(b"original-message.eml", raw_data)

    def test_health_endpoint_reports_service_status(self) -> None:
        router, _forwarder = build_router(b"", [])

        response = router.handle({"requestContext": {"http": {"method": "GET"}}})
        body = APP.json.loads(response["body"])

        self.assertEqual(response["statusCode"], 200)
        self.assertTrue(body["ok"])
        self.assertEqual(body["service"], "town-email-alias-router")

    def test_processes_multiple_s3_records_in_one_event(self) -> None:
        raw_message_1 = (
            b"From: Alice <alice@example.com>\n"
            b"To: Mayor <steve.mckitrick@townofwiley.gov>\n"
            b"Subject: Question 1\n\n"
            b"Message one."
        )
        raw_message_2 = (
            b"From: Bob <bob@example.com>\n"
            b"To: Clerk <deb.dillon@townofwiley.gov>\n"
            b"Subject: Question 2\n\n"
            b"Message two."
        )
        forwarder = RecordingForwarder()
        router = APP.EmailAliasRouter(
            config=APP.AppConfig(
                alias_table="EmailAliasTable",
                alias_table_region="us-east-2",
                forwarder_from="mailer@townofwiley.gov",
                alias_domain="townofwiley.gov",
                ses_send_region="us-east-2",
            ),
            alias_directory=MemoryAliasDirectory(
                [
                    APP.EmailAliasRecord(
                        alias_address="steve.mckitrick@townofwiley.gov",
                        destination_address="mayor@example.com",
                        active=True,
                    ),
                    APP.EmailAliasRecord(
                        alias_address="deb.dillon@townofwiley.gov",
                        destination_address="clerk@example.com",
                        active=True,
                    ),
                ],
            ),
            object_store=StaticObjectStore(
                {
                    ("bucket", "inbox/msg-1.eml"): raw_message_1,
                    ("bucket", "inbox/msg-2.eml"): raw_message_2,
                },
            ),
            mail_forwarder=forwarder,
        )

        response = router.handle(
            {
                "Records": [
                    {
                        "eventSource": "aws:s3",
                        "s3": {
                            "bucket": {"name": "bucket"},
                            "object": {"key": "inbox/msg-1.eml"},
                        },
                    },
                    {
                        "eventSource": "aws:s3",
                        "s3": {
                            "bucket": {"name": "bucket"},
                            "object": {"key": "inbox/msg-2.eml"},
                        },
                    },
                ],
            },
        )

        self.assertEqual(response["processed"], 2)
        self.assertEqual(response["forwarded"], 2)
        self.assertEqual(len(forwarder.calls), 2)
        destinations = {call["destination_address"] for call in forwarder.calls}
        self.assertEqual(destinations, {"mayor@example.com", "clerk@example.com"})

    def test_build_forward_email_falls_back_to_from_when_reply_to_absent(self) -> None:
        raw_message = (
            b"From: Resident <resident@example.com>\n"
            b"To: Clerk <deb.dillon@townofwiley.gov>\n"
            b"Subject: No reply-to header\n\n"
            b"Body text."
        )
        parsed_message = APP.BytesParser(policy=APP.policy.default).parsebytes(
            raw_message
        )
        alias = APP.EmailAliasRecord(
            alias_address="deb.dillon@townofwiley.gov",
            destination_address="clerk@example.com",
            active=True,
        )

        forward_message = APP.build_forward_email(
            alias, raw_message, parsed_message, "mailer@townofwiley.gov"
        )

        # With no Reply-To header the sender (From) address becomes the reply target
        self.assertEqual(forward_message["Reply-To"], "resident@example.com")
        self.assertIn(b"Body text.", forward_message.as_bytes(policy=APP.policy.SMTP))
        self.assertEqual(
            forward_message["X-Town-Original-From"],
            "Resident <resident@example.com>",
        )

    def test_build_forward_email_marks_reforward_subject(self) -> None:
        raw_message = (
            b"From: Resident <resident@example.com>\n"
            b"To: Clerk <clerk@townofwiley.gov>\n"
            b"Subject: Minutes packet\n\n"
            b"Please review the attached agenda packet carefully."
        )
        parsed_message = APP.BytesParser(policy=APP.policy.default).parsebytes(
            raw_message
        )
        alias = APP.EmailAliasRecord(
            alias_address="clerk@townofwiley.gov",
            destination_address="clerk@example.com",
            active=True,
        )

        forward_message = APP.build_forward_email(
            alias,
            raw_message,
            parsed_message,
            "mailer@townofwiley.gov",
            reforward=True,
        )

        self.assertTrue(forward_message["Subject"].startswith("[Town reforward]"))
        self.assertEqual(forward_message["X-Town-Reforward"], "true")

    def test_assert_mime_passthrough_rejects_wrap_shell(self) -> None:
        raw_message = (
            b"From: Resident <resident@example.com>\n"
            b"To: Clerk <clerk@townofwiley.gov>\n"
            b"Subject: Important\n\n"
            b"This is the real body with enough unique words for the probe."
        )
        shell = APP.EmailMessage()
        shell["Subject"] = "Fwd: Important"
        shell["From"] = "mailer@townofwiley.gov"
        shell["To"] = "clerk@example.com"
        shell.set_content(
            "Town of Wiley alias forward\n"
            "The original message is attached as original-message.eml."
        )
        shell.add_attachment(
            raw_message,
            maintype="message",
            subtype="rfc822",
            filename="original-message.eml",
        )

        with self.assertRaises(RuntimeError) as raised:
            APP.assert_mime_passthrough_integrity(raw_message, shell)

        self.assertIn("forbidden wrap marker", str(raised.exception))

    def test_sanitize_quotes_unquoted_filename_with_spaces(self) -> None:
        raw_message = (
            b"From: Vendor <vendor@example.com>\n"
            b"To: Clerk <clerk@townofwiley.gov>\n"
            b"Subject: Image mail\n"
            b"MIME-Version: 1.0\n"
            b'Content-Type: multipart/mixed; boundary="b1"\n'
            b"\n"
            b"--b1\n"
            b"Content-Type: text/plain; charset=utf-8\n"
            b"\n"
            b"Please review the diving services brochure carefully.\n"
            b"--b1\n"
            b"Content-Type: image/png\n"
            b"Content-Disposition: inline; filename=Diver logo Potable .png\n"
            b"Content-Transfer-Encoding: base64\n"
            b"\n"
            b"iVBORw0KGgo=\n"
            b"--b1--\n"
        )
        parsed_message = APP.BytesParser(policy=APP.policy.default).parsebytes(
            raw_message
        )
        alias = APP.EmailAliasRecord(
            alias_address="clerk@townofwiley.gov",
            destination_address="clerk@example.com",
            active=True,
        )

        forward_message = APP.build_forward_email(
            alias, raw_message, parsed_message, "mailer@townofwiley.gov"
        )
        raw_out = forward_message.as_bytes(policy=APP.policy.SMTP)

        self.assertIn(b'filename="Diver logo Potable .png"', raw_out)
        self.assertNotIn(b"filename=Diver logo Potable .png", raw_out)

    def test_skips_ses_setup_notification_objects(self) -> None:
        router, forwarder = build_router(b"", [])

        response = router.handle(
            {
                "Records": [
                    {
                        "eventSource": "aws:s3",
                        "s3": {
                            "bucket": {"name": "incoming-bucket"},
                            "object": {
                                "key": "incoming/AMAZON_SES_SETUP_NOTIFICATION"
                            },
                        },
                    },
                ],
            },
        )

        self.assertEqual(response["processed"], 1)
        self.assertEqual(response["forwarded"], 0)
        self.assertEqual(
            response["results"][0]["reason"], "skipped_ses_setup_notification"
        )
        self.assertEqual(forwarder.calls, [])


if __name__ == "__main__":
    unittest.main()
