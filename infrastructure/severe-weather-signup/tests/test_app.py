from __future__ import annotations

import importlib.util
import json
import sys
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / 'app.py'
SPEC = importlib.util.spec_from_file_location('severe_weather_app', MODULE_PATH)
APP = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = APP
SPEC.loader.exec_module(APP)


def build_backend(alerts: list[dict] | None = None) -> APP.SevereWeatherBackend:
  return APP.SevereWeatherBackend(
    config=APP.AppConfig(
      subscriptions_table='subscriptions',
      deliveries_table='deliveries',
      sender_email='alerts@townofwiley.gov',
      notification_sender_name='Town of Wiley Alerts',
      allowed_zip_code='81092',
      alert_zone_code='COZ098',
      public_api_base_url='https://alerts.example.com',
      nws_user_agent='TownOfWileyWeather/1.0 (contact: bigessfour@gmail.com)',
      nws_api_key='',
    ),
    subscription_store=APP.MemorySubscriptionStore(),
    delivery_store=APP.MemoryDeliveryStore(),
    notification_gateway=APP.MemoryNotificationGateway(),
    nws_client=APP.StaticNwsClient(alerts or []),
  )


class SevereWeatherBackendTests(unittest.TestCase):
  def test_creates_pending_subscription_and_sends_confirmation(self) -> None:
    backend = build_backend()
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps(
          {
            'channel': 'email',
            'destination': 'Resident@example.com',
            'zipCode': '81092',
          },
        ),
      },
    )

    self.assertEqual(response['statusCode'], 202)
    gateway = backend._notification_gateway
    self.assertEqual(len(gateway.confirmation_messages), 1)
    self.assertIn('Confirm alerts:', gateway.confirmation_messages[0]['message'])

  def test_rejects_non_wiley_zip_code(self) -> None:
    backend = build_backend()
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps(
          {
            'channel': 'email',
            'destination': 'resident@example.com',
            'zipCode': '80202',
          },
        ),
      },
    )

    self.assertEqual(response['statusCode'], 400)
    self.assertIn('81092', response['body'])

  def test_confirms_subscription_and_renders_html(self) -> None:
    backend = build_backend()
    backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps(
          {
            'channel': 'email',
            'destination': 'resident@example.com',
            'zipCode': '81092',
          },
        ),
      },
    )
    token = (
      backend._notification_gateway.confirmation_messages[0]['message']
      .split('Confirm alerts: ')[1]
      .split('\n')[0]
      .split('token=')[1]
    )

    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'GET'}},
        'rawPath': '/confirm',
        'queryStringParameters': {'token': token},
      },
    )

    self.assertEqual(response['statusCode'], 200)
    self.assertIn('Alerts confirmed', response['body'])

  def test_scheduled_event_sends_new_alert_once(self) -> None:
    backend = build_backend(
      alerts=[
        {
          'id': 'alert-1',
          'event': 'High Wind Warning',
          'headline': 'High winds expected in Wiley.',
          'severity': 'Severe',
          'urgency': 'Immediate',
          'expires': '2026-03-22T23:00:00+00:00',
          'instruction': 'Secure loose outdoor items.',
          'areaDesc': 'Wiley and surrounding area',
        },
      ],
    )
    backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps(
          {
            'channel': 'sms',
            'destination': '(719) 555-0102',
            'zipCode': '81092',
          },
        ),
      },
    )
    token = (
      backend._notification_gateway.confirmation_messages[0]['message']
      .split('Confirm alerts: ')[1]
      .split('\n')[0]
      .split('token=')[1]
    )
    backend.handle(
      {
        'requestContext': {'http': {'method': 'GET'}},
        'rawPath': '/confirm',
        'queryStringParameters': {'token': token},
      },
    )

    first = backend.handle({'source': 'aws.events', 'detail-type': 'Scheduled Event'})
    second = backend.handle({'source': 'aws.events', 'detail-type': 'Scheduled Event'})

    self.assertEqual(json.loads(first['body'])['messagesSent'], 1)
    self.assertEqual(json.loads(second['body'])['messagesSent'], 0)
    self.assertEqual(len(backend._notification_gateway.alert_messages), 1)


if __name__ == '__main__':
  unittest.main()
