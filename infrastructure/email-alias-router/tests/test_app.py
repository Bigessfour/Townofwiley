from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / 'app.py'
SPEC = importlib.util.spec_from_file_location('email_alias_router_app', MODULE_PATH)
APP = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = APP
SPEC.loader.exec_module(APP)


class MemoryAliasDirectory:
  def __init__(self, aliases: list[APP.EmailAliasRecord]) -> None:
    self._aliases = {alias.alias_address: alias for alias in aliases}

  def find_first_active_alias(self, candidate_addresses: list[str]) -> APP.EmailAliasRecord | None:
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
    self.calls: list[dict[str, str]] = []

  def forward(self, alias: APP.EmailAliasRecord, raw_message: bytes, parsed_message) -> None:
    del raw_message
    self.calls.append(
      {
        'alias_address': alias.alias_address,
        'destination_address': alias.destination_address,
        'subject': parsed_message.get('Subject', ''),
      },
    )


class RecordingSesClient:
  def __init__(self) -> None:
    self.calls: list[dict[str, object]] = []

  def send_raw_email(self, **kwargs) -> None:
    self.calls.append(kwargs)


def build_router(raw_message: bytes, aliases: list[APP.EmailAliasRecord]) -> tuple[APP.EmailAliasRouter, RecordingForwarder]:
  forwarder = RecordingForwarder()
  router = APP.EmailAliasRouter(
    config=APP.AppConfig(
      alias_table='EmailAliasTable',
      alias_table_region='us-east-2',
      alias_index_name='byAliasAddress',
      forwarder_from='mailer@townofwiley.gov',
      alias_domain='townofwiley.gov',
      ses_send_region='us-east-2',
    ),
    alias_directory=MemoryAliasDirectory(aliases),
    object_store=StaticObjectStore({('incoming-bucket', 'inbox/message-1.eml'): raw_message}),
    mail_forwarder=forwarder,
  )
  return router, forwarder


class EmailAliasRouterTests(unittest.TestCase):
  def test_routes_s3_email_to_matching_alias_destination(self) -> None:
    raw_message = (
      b'From: Resident <resident@example.com>\n'
      b'To: Steve McKitrick <steve.mckitrick@townofwiley.gov>\n'
      b'Subject: Council agenda question\n\n'
      b'Hello from a resident.'
    )
    router, forwarder = build_router(
      raw_message,
      [
        APP.EmailAliasRecord(
          alias_address='steve.mckitrick@townofwiley.gov',
          destination_address='bigessfour@gmail.com',
          active=True,
          display_name='Steve McKitrick',
          role_label='Mayor',
        ),
      ],
    )

    response = router.handle(
      {
        'Records': [
          {
            'eventSource': 'aws:s3',
            's3': {
              'bucket': {'name': 'incoming-bucket'},
              'object': {'key': 'inbox/message-1.eml'},
            },
          },
        ],
      },
    )

    self.assertEqual(response['processed'], 1)
    self.assertEqual(response['forwarded'], 1)
    self.assertEqual(len(forwarder.calls), 1)
    self.assertEqual(forwarder.calls[0]['alias_address'], 'steve.mckitrick@townofwiley.gov')
    self.assertEqual(forwarder.calls[0]['destination_address'], 'bigessfour@gmail.com')

  def test_skips_when_no_active_alias_matches(self) -> None:
    raw_message = (
      b'From: Resident <resident@example.com>\n'
      b'To: Clerk <deb.dillon@townofwiley.gov>\n'
      b'Subject: Records request\n\n'
      b'Please send the packet.'
    )
    router, forwarder = build_router(
      raw_message,
      [
        APP.EmailAliasRecord(
          alias_address='deb.dillon@townofwiley.gov',
          destination_address='clerk@example.com',
          active=False,
        ),
      ],
    )

    response = router.handle(
      {
        'Records': [
          {
            'eventSource': 'aws:s3',
            's3': {
              'bucket': {'name': 'incoming-bucket'},
              'object': {'key': 'inbox/message-1.eml'},
            },
          },
        ],
      },
    )

    self.assertEqual(response['processed'], 1)
    self.assertEqual(response['forwarded'], 0)
    self.assertEqual(response['results'][0]['reason'], 'no_active_alias_match')
    self.assertEqual(forwarder.calls, [])

  def test_build_forward_email_preserves_alias_and_reply_path(self) -> None:
    raw_message = (
      b'From: Resident <resident@example.com>\n'
      b'Reply-To: resident.reply@example.com\n'
      b'To: Mayor <steve.mckitrick@townofwiley.gov>\n'
      b'Subject: Test subject\n\n'
      b'Original message body.'
    )
    parsed_message = APP.BytesParser(policy=APP.policy.default).parsebytes(raw_message)
    alias = APP.EmailAliasRecord(
      alias_address='steve.mckitrick@townofwiley.gov',
      destination_address='bigessfour@gmail.com',
      active=True,
      display_name='Town of Wiley Mail',
      role_label='Mayor',
    )

    forward_message = APP.build_forward_email(alias, raw_message, parsed_message, 'mailer@townofwiley.gov')

    self.assertEqual(forward_message['To'], 'bigessfour@gmail.com')
    self.assertEqual(forward_message['Reply-To'], 'resident.reply@example.com')
    self.assertEqual(forward_message['X-Town-Alias'], 'steve.mckitrick@townofwiley.gov')
    self.assertIn('Fwd: Test subject', forward_message['Subject'])

  def test_ses_mail_forwarder_sends_raw_message_with_alias_metadata(self) -> None:
    raw_message = (
      b'From: Resident <resident@example.com>\n'
      b'To: Mayor <steve.mckitrick@townofwiley.gov>\n'
      b'Subject: Test subject\n\n'
      b'Original message body.'
    )
    parsed_message = APP.BytesParser(policy=APP.policy.default).parsebytes(raw_message)
    alias = APP.EmailAliasRecord(
      alias_address='steve.mckitrick@townofwiley.gov',
      destination_address='bigessfour@gmail.com',
      active=True,
      display_name='Town of Wiley Mail',
      role_label='Mayor',
    )
    ses_client = RecordingSesClient()
    forwarder = APP.SesMailForwarder('mailer@townofwiley.gov', ses_client)

    forwarder.forward(alias, raw_message, parsed_message)

    self.assertEqual(len(ses_client.calls), 1)
    self.assertEqual(ses_client.calls[0]['Source'], 'mailer@townofwiley.gov')
    self.assertEqual(ses_client.calls[0]['Destinations'], ['bigessfour@gmail.com'])
    self.assertIn(b'X-Town-Alias: steve.mckitrick@townofwiley.gov', ses_client.calls[0]['RawMessage']['Data'])

  def test_health_endpoint_reports_service_status(self) -> None:
    router, _forwarder = build_router(b'', [])

    response = router.handle({'requestContext': {'http': {'method': 'GET'}}})
    body = APP.json.loads(response['body'])

    self.assertEqual(response['statusCode'], 200)
    self.assertTrue(body['ok'])
    self.assertEqual(body['service'], 'town-email-alias-router')

  def test_processes_multiple_s3_records_in_one_event(self) -> None:
    raw_message_1 = (
      b'From: Alice <alice@example.com>\n'
      b'To: Mayor <steve.mckitrick@townofwiley.gov>\n'
      b'Subject: Question 1\n\n'
      b'Message one.'
    )
    raw_message_2 = (
      b'From: Bob <bob@example.com>\n'
      b'To: Clerk <deb.dillon@townofwiley.gov>\n'
      b'Subject: Question 2\n\n'
      b'Message two.'
    )
    forwarder = RecordingForwarder()
    router = APP.EmailAliasRouter(
      config=APP.AppConfig(
        alias_table='EmailAliasTable',
        alias_table_region='us-east-2',
        alias_index_name='byAliasAddress',
        forwarder_from='mailer@townofwiley.gov',
        alias_domain='townofwiley.gov',
        ses_send_region='us-east-2',
      ),
      alias_directory=MemoryAliasDirectory(
        [
          APP.EmailAliasRecord(
            alias_address='steve.mckitrick@townofwiley.gov',
            destination_address='mayor@example.com',
            active=True,
          ),
          APP.EmailAliasRecord(
            alias_address='deb.dillon@townofwiley.gov',
            destination_address='clerk@example.com',
            active=True,
          ),
        ],
      ),
      object_store=StaticObjectStore(
        {
          ('bucket', 'inbox/msg-1.eml'): raw_message_1,
          ('bucket', 'inbox/msg-2.eml'): raw_message_2,
        },
      ),
      mail_forwarder=forwarder,
    )

    response = router.handle(
      {
        'Records': [
          {
            'eventSource': 'aws:s3',
            's3': {'bucket': {'name': 'bucket'}, 'object': {'key': 'inbox/msg-1.eml'}},
          },
          {
            'eventSource': 'aws:s3',
            's3': {'bucket': {'name': 'bucket'}, 'object': {'key': 'inbox/msg-2.eml'}},
          },
        ],
      },
    )

    self.assertEqual(response['processed'], 2)
    self.assertEqual(response['forwarded'], 2)
    self.assertEqual(len(forwarder.calls), 2)
    destinations = {call['destination_address'] for call in forwarder.calls}
    self.assertEqual(destinations, {'mayor@example.com', 'clerk@example.com'})

  def test_build_forward_email_falls_back_to_from_when_reply_to_absent(self) -> None:
    raw_message = (
      b'From: Resident <resident@example.com>\n'
      b'To: Clerk <deb.dillon@townofwiley.gov>\n'
      b'Subject: No reply-to header\n\n'
      b'Body text.'
    )
    parsed_message = APP.BytesParser(policy=APP.policy.default).parsebytes(raw_message)
    alias = APP.EmailAliasRecord(
      alias_address='deb.dillon@townofwiley.gov',
      destination_address='clerk@example.com',
      active=True,
    )

    forward_message = APP.build_forward_email(alias, raw_message, parsed_message, 'mailer@townofwiley.gov')

    # With no Reply-To header the sender (From) address becomes the reply target
    self.assertEqual(forward_message['Reply-To'], 'resident@example.com')


if __name__ == '__main__':
  unittest.main()
