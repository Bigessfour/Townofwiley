from __future__ import annotations

import importlib.util
import json
import sys
import unittest
from pathlib import Path
from typing import Any
from urllib.request import Request

MODULE_PATH = Path(__file__).resolve().parents[1] / 'app.py'
SPEC = importlib.util.spec_from_file_location('site_monitor_app', MODULE_PATH)
APP = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = APP
SPEC.loader.exec_module(APP)


class FakeResponse:
  def __init__(self, body: str, status: int = 200) -> None:
    self._body = body.encode('utf-8')
    self.status = status

  def __enter__(self) -> 'FakeResponse':
    return self

  def __exit__(self, exc_type, exc, tb) -> bool:
    del exc_type, exc, tb
    return False

  def getcode(self) -> int:
    return self.status

  def read(self) -> bytes:
    return self._body


class RecordingMailer:
  def __init__(self) -> None:
    self.messages: list[dict[str, str]] = []

  def send_message(self, subject: str, body: str) -> None:
    self.messages.append({'subject': subject, 'body': body})


class MemoryStateStore:
  def __init__(self) -> None:
    self.state: dict[str, dict[str, object]] = {}

  def load_state(self, monitor_name: str) -> dict[str, object] | None:
    item = self.state.get(monitor_name)
    return dict(item) if item else None

  def save_state(self, item: dict[str, object]) -> None:
    self.state[str(item['monitorName'])] = dict(item)


class SiteMonitorTests(unittest.TestCase):
  def build_monitor(
    self,
    fetch_map: dict[tuple[str, str], object],
  ) -> tuple[Any, RecordingMailer, MemoryStateStore]:
    def fetcher(request: Request, timeout: int = 15):
      del timeout
      key = (request.method or 'GET', request.full_url)
      response = fetch_map[key]
      if isinstance(response, Exception):
        raise response
      return response

    monitor = APP.TownSiteMonitor(
      config=APP.AppConfig(
        site_url='https://townofwiley.gov',
        admin_url='https://townofwiley.gov/admin',
        clerk_setup_url='https://townofwiley.gov/clerk-setup',
        cms_endpoint='https://example.appsync-api.us-east-2.amazonaws.com/graphql',
        cms_api_key='test-key',
        notification_recipient='bigessfour@gmail.com',
        notification_sender='alerts@townofwiley.gov',
        notification_sender_name='Town of Wiley Alerts',
        monitor_name='TownOfWileySiteMonitor',
        user_agent='TownOfWileySiteMonitor/1.0',
      ),
      state_store=MemoryStateStore(),
      mailer=RecordingMailer(),
      fetcher=fetcher,
    )
    return monitor, monitor._mailer, monitor._state_store

  def test_healthy_run_returns_ok_without_email(self) -> None:
    monitor, mailer, state_store = self.build_monitor(
      {
        ('GET', 'https://townofwiley.gov/'): FakeResponse('<html><title>Town of Wiley</title><body>Town of Wiley</body></html>'),
        ('GET', 'https://townofwiley.gov/admin'): FakeResponse(
          '<html><body>Open CMS Data Manager Amplify Studio</body></html>',
        ),
        ('GET', 'https://townofwiley.gov/clerk-setup'): FakeResponse(
          '<html><body>One place to manage Town website content</body></html>',
        ),
        ('POST', 'https://example.appsync-api.us-east-2.amazonaws.com/graphql'): FakeResponse(
          json.dumps({'data': {'listSiteSettings': {'items': []}}}),
        ),
      },
    )

    response = monitor.handle({'source': 'aws.events', 'detail-type': 'Scheduled Event'})

    self.assertTrue(response['ok'])
    self.assertEqual(response['status'], 'healthy')
    self.assertEqual(response['results'][-1]['name'], 'cms-api')
    self.assertEqual(mailer.messages, [])
    self.assertEqual(state_store.state['TownOfWileySiteMonitor']['status'], 'healthy')

  def test_unhealthy_run_sends_email_with_failure_details(self) -> None:
    monitor, mailer, state_store = self.build_monitor(
      {
        ('GET', 'https://townofwiley.gov/'): FakeResponse('<html><body>Town of Wiley</body></html>', status=503),
        ('GET', 'https://townofwiley.gov/admin'): FakeResponse(
          '<html><body>Open CMS Data Manager Amplify Studio</body></html>',
        ),
        ('GET', 'https://townofwiley.gov/clerk-setup'): FakeResponse(
          '<html><body>One place to manage Town website content</body></html>',
        ),
        ('POST', 'https://example.appsync-api.us-east-2.amazonaws.com/graphql'): FakeResponse(
          json.dumps({'data': {'listSiteSettings': {'items': []}}}),
        ),
      },
    )

    response = monitor.handle({'source': 'aws.events', 'detail-type': 'Scheduled Event'})

    self.assertFalse(response['ok'])
    self.assertEqual(response['status'], 'unhealthy')
    self.assertEqual(len(mailer.messages), 1)
    self.assertIn('homepage', mailer.messages[0]['subject'])
    self.assertIn('HTTP 503', mailer.messages[0]['body'])
    self.assertIn('Town of Wiley site monitor detected a problem.', mailer.messages[0]['body'])
    self.assertEqual(state_store.state['TownOfWileySiteMonitor']['status'], 'unhealthy')

  def test_repeated_same_failure_does_not_send_duplicate_email(self) -> None:
    monitor, mailer, _state_store = self.build_monitor(
      {
        ('GET', 'https://townofwiley.gov/'): FakeResponse('<html><body>Town of Wiley</body></html>', status=503),
        ('GET', 'https://townofwiley.gov/admin'): FakeResponse(
          '<html><body>Open CMS Data Manager Amplify Studio</body></html>',
        ),
        ('GET', 'https://townofwiley.gov/clerk-setup'): FakeResponse(
          '<html><body>One place to manage Town website content</body></html>',
        ),
        ('POST', 'https://example.appsync-api.us-east-2.amazonaws.com/graphql'): FakeResponse(
          json.dumps({'data': {'listSiteSettings': {'items': []}}}),
        ),
      },
    )

    monitor.handle({'source': 'aws.events', 'detail-type': 'Scheduled Event'})
    monitor.handle({'source': 'aws.events', 'detail-type': 'Scheduled Event'})

    self.assertEqual(len(mailer.messages), 1)

  def test_recovery_email_is_sent_after_an_outage(self) -> None:
    state_store = MemoryStateStore()
    state_store.state['TownOfWileySiteMonitor'] = {
      'monitorName': 'TownOfWileySiteMonitor',
      'status': 'unhealthy',
      'incidentHash': 'abc123',
      'lastCheckedAt': '2026-03-24T00:00:00+00:00',
    }
    mailer = RecordingMailer()

    def fetcher(request: Request, timeout: int = 15):
      del timeout
      key = (request.method or 'GET', request.full_url)
      responses = {
        ('GET', 'https://townofwiley.gov/'): FakeResponse('<html><title>Town of Wiley</title><body>Town of Wiley</body></html>'),
        ('GET', 'https://townofwiley.gov/admin'): FakeResponse(
          '<html><body>Open CMS Data Manager Amplify Studio</body></html>',
        ),
        ('GET', 'https://townofwiley.gov/clerk-setup'): FakeResponse(
          '<html><body>One place to manage Town website content</body></html>',
        ),
        ('POST', 'https://example.appsync-api.us-east-2.amazonaws.com/graphql'): FakeResponse(
          json.dumps({'data': {'listSiteSettings': {'items': []}}}),
        ),
      }
      return responses[key]

    monitor = APP.TownSiteMonitor(
      config=APP.AppConfig(
        site_url='https://townofwiley.gov',
        admin_url='https://townofwiley.gov/admin',
        clerk_setup_url='https://townofwiley.gov/clerk-setup',
        cms_endpoint='https://example.appsync-api.us-east-2.amazonaws.com/graphql',
        cms_api_key='test-key',
        notification_recipient='bigessfour@gmail.com',
        notification_sender='alerts@townofwiley.gov',
        notification_sender_name='Town of Wiley Alerts',
        monitor_name='TownOfWileySiteMonitor',
        user_agent='TownOfWileySiteMonitor/1.0',
      ),
      state_store=state_store,
      mailer=mailer,
      fetcher=fetcher,
    )

    response = monitor.handle({'source': 'aws.events', 'detail-type': 'Scheduled Event'})

    self.assertTrue(response['ok'])
    self.assertEqual(len(mailer.messages), 1)
    self.assertIn('Recovery', mailer.messages[0]['subject'])
    self.assertEqual(state_store.state['TownOfWileySiteMonitor']['status'], 'healthy')

  def test_http_health_endpoint_reports_current_state(self) -> None:
    monitor, _mailer, _state_store = self.build_monitor(
      {
        ('GET', 'https://townofwiley.gov/'): FakeResponse('<html><title>Town of Wiley</title><body>Town of Wiley</body></html>'),
        ('GET', 'https://townofwiley.gov/admin'): FakeResponse(
          '<html><body>Open CMS Data Manager Amplify Studio</body></html>',
        ),
        ('GET', 'https://townofwiley.gov/clerk-setup'): FakeResponse(
          '<html><body>One place to manage Town website content</body></html>',
        ),
        ('POST', 'https://example.appsync-api.us-east-2.amazonaws.com/graphql'): FakeResponse(
          json.dumps({'data': {'listSiteSettings': {'items': []}}}),
        ),
      },
    )

    response = monitor.handle({'requestContext': {'http': {'method': 'GET'}}})

    self.assertEqual(response['statusCode'], 200)
    body = json.loads(response['body'])
    self.assertTrue(body['ok'])
    self.assertEqual(body['status'], 'healthy')


if __name__ == '__main__':
  unittest.main()
