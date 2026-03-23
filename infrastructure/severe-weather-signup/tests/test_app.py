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
    translation_gateway=APP.MemoryTranslationGateway(),
  )


class RecordingTranslationGateway:
  def __init__(self) -> None:
    self.requests: list[tuple[str, str, str]] = []

  def translate_text(self, text: str, source_language: str, target_language: str) -> str:
    self.requests.append((text, source_language, target_language))
    return f'[{target_language}] {text}'


class FailingNotificationGateway:
  def __init__(self, message: str) -> None:
    self._message = message

  def send_confirmation(self, channel: str, destination: str, subject: str, message: str) -> None:
    del channel, destination, subject, message
    raise RuntimeError(self._message)

  def send_alert(self, channel: str, destination: str, subject: str, message: str) -> None:
    del channel, destination, subject, message
    raise RuntimeError(self._message)


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

  def test_returns_actionable_error_when_email_confirmation_delivery_fails(self) -> None:
    subscription_store = APP.MemorySubscriptionStore()
    backend = APP.SevereWeatherBackend(
      config=APP.AppConfig(
        subscriptions_table='subscriptions',
        deliveries_table='deliveries',
        sender_email='bigessfour@gmail.com',
        notification_sender_name='Town of Wiley Alerts',
        allowed_zip_code='81092',
        alert_zone_code='COZ098',
        public_api_base_url='https://alerts.example.com',
        nws_user_agent='TownOfWileyWeather/1.0 (contact: bigessfour@gmail.com)',
        nws_api_key='',
      ),
      subscription_store=subscription_store,
      delivery_store=APP.MemoryDeliveryStore(),
      notification_gateway=FailingNotificationGateway(
        'Email address is not verified. The following identities failed the check in region US-EAST-2: resident@example.com'
      ),
      nws_client=APP.StaticNwsClient([]),
      translation_gateway=APP.MemoryTranslationGateway(),
    )

    response = backend.handle(
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

    self.assertEqual(response['statusCode'], 502)
    self.assertIn('Email confirmations are temporarily unavailable', response['body'])
    self.assertIsNone(
      subscription_store.find_existing_subscription('email', 'resident@example.com'),
    )

  def test_creates_spanish_subscription_and_translates_confirmation(self) -> None:
    translation_gateway = RecordingTranslationGateway()
    backend = APP.SevereWeatherBackend(
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
      nws_client=APP.StaticNwsClient([]),
      translation_gateway=translation_gateway,
    )

    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps(
          {
            'channel': 'email',
            'destination': 'resident@example.com',
            'preferredLanguage': 'es',
            'zipCode': '81092',
          },
        ),
      },
    )

    self.assertEqual(response['statusCode'], 202)
    self.assertIn('[es]', backend._notification_gateway.confirmation_messages[0]['message'])
    self.assertEqual(translation_gateway.requests[0][1:], ('en', 'es'))

  def test_scheduled_event_translates_spanish_alert_messages_once(self) -> None:
    translation_gateway = RecordingTranslationGateway()
    backend = APP.SevereWeatherBackend(
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
      nws_client=APP.StaticNwsClient(
        [
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
      ),
      translation_gateway=translation_gateway,
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
            'preferredLanguage': 'es',
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

    response = backend.handle({'source': 'aws.events', 'detail-type': 'Scheduled Event'})

    self.assertEqual(json.loads(response['body'])['messagesSent'], 1)
    self.assertIn('[es]', backend._notification_gateway.alert_messages[0]['subject'])
    self.assertIn('[es]', backend._notification_gateway.alert_messages[0]['message'])
    self.assertGreaterEqual(len(translation_gateway.requests), 3)

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
