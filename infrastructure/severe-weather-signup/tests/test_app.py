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

  # ---------------------------------------------------------------------------
  # Input validation: channel / destination / language / body
  # ---------------------------------------------------------------------------

  def test_creates_pending_sms_subscription_and_sends_confirmation(self) -> None:
    backend = build_backend()
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps(
          {
            'channel': 'sms',
            'destination': '(719) 555-0101',
            'zipCode': '81092',
          },
        ),
      },
    )

    self.assertEqual(response['statusCode'], 202)
    gateway = backend._notification_gateway
    self.assertEqual(len(gateway.confirmation_messages), 1)
    self.assertEqual(gateway.confirmation_messages[0]['channel'], 'sms')
    self.assertEqual(gateway.confirmation_messages[0]['destination'], '+17195550101')

  def test_rejects_invalid_email_address(self) -> None:
    backend = build_backend()
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps({'channel': 'email', 'destination': 'not-an-email', 'zipCode': '81092'}),
      },
    )

    self.assertEqual(response['statusCode'], 400)
    self.assertIn('valid email', response['body'])

  def test_rejects_invalid_phone_number(self) -> None:
    backend = build_backend()
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps({'channel': 'sms', 'destination': '123', 'zipCode': '81092'}),
      },
    )

    self.assertEqual(response['statusCode'], 400)
    self.assertIn('valid US phone number', response['body'])

  def test_rejects_unknown_channel(self) -> None:
    backend = build_backend()
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps({'channel': 'push', 'destination': 'token123', 'zipCode': '81092'}),
      },
    )

    self.assertEqual(response['statusCode'], 400)
    self.assertIn('email', response['body'])
    self.assertIn('sms', response['body'])

  def test_rejects_unsupported_language(self) -> None:
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
            'zipCode': '81092',
            'preferredLanguage': 'fr',
          },
        ),
      },
    )

    self.assertEqual(response['statusCode'], 400)
    self.assertIn('Preferred language', response['body'])

  def test_rejects_missing_body(self) -> None:
    backend = build_backend()
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
      },
    )

    self.assertEqual(response['statusCode'], 400)
    self.assertIn('Missing', response['body'])

  def test_rejects_malformed_json_body(self) -> None:
    backend = build_backend()
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': '[not valid json',
      },
    )

    self.assertEqual(response['statusCode'], 400)
    self.assertIn('valid JSON', response['body'])

  # ---------------------------------------------------------------------------
  # HTTP routing: OPTIONS, /health, unknown path
  # ---------------------------------------------------------------------------

  def test_options_returns_204_with_cors_headers(self) -> None:
    backend = build_backend()
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'OPTIONS'}},
        'rawPath': '/subscriptions',
      },
    )

    self.assertEqual(response['statusCode'], 204)
    self.assertIn('access-control-allow-origin', response['headers'])
    self.assertEqual(response['headers']['access-control-allow-origin'], '*')

  def test_health_endpoint_returns_service_info(self) -> None:
    backend = build_backend()
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'GET'}},
        'rawPath': '/health',
      },
    )

    self.assertEqual(response['statusCode'], 200)
    body = json.loads(response['body'])
    self.assertEqual(body['service'], 'townofwiley-severe-weather-signup')
    self.assertEqual(body['allowedZipCode'], '81092')
    self.assertIn('email', body['signupChannels'])
    self.assertIn('sms', body['signupChannels'])

  def test_unknown_route_returns_404(self) -> None:
    backend = build_backend()
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'GET'}},
        'rawPath': '/does-not-exist',
      },
    )

    self.assertEqual(response['statusCode'], 404)

  # ---------------------------------------------------------------------------
  # Confirm / unsubscribe flows
  # ---------------------------------------------------------------------------

  def test_confirm_missing_token_returns_400(self) -> None:
    backend = build_backend()
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'GET'}},
        'rawPath': '/confirm',
        'queryStringParameters': {},
      },
    )

    self.assertEqual(response['statusCode'], 400)

  def test_confirm_invalid_token_returns_404(self) -> None:
    backend = build_backend()
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'GET'}},
        'rawPath': '/confirm',
        'queryStringParameters': {'token': 'no-such-token'},
      },
    )

    self.assertEqual(response['statusCode'], 404)

  def test_confirm_already_active_subscription_returns_200(self) -> None:
    backend = build_backend()
    # Sign up and confirm once
    backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps({'channel': 'email', 'destination': 'resident@example.com', 'zipCode': '81092'}),
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
    # Confirm again with the same token — should not blow up
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'GET'}},
        'rawPath': '/confirm',
        'queryStringParameters': {'token': token},
      },
    )

    self.assertEqual(response['statusCode'], 200)
    self.assertIn('Alerts confirmed', response['body'])

  def test_unsubscribe_valid_token_removes_subscription(self) -> None:
    backend = build_backend()
    backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps({'channel': 'email', 'destination': 'resident@example.com', 'zipCode': '81092'}),
      },
    )
    token = (
      backend._notification_gateway.confirmation_messages[0]['message']
      .split('Cancel signup: ')[1]
      .split('\n')[0]
      .split('token=')[1]
    )

    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'GET'}},
        'rawPath': '/unsubscribe',
        'queryStringParameters': {'token': token},
      },
    )

    self.assertEqual(response['statusCode'], 200)
    self.assertIn('Alerts stopped', response['body'])

  def test_unsubscribe_missing_token_returns_400(self) -> None:
    backend = build_backend()
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'GET'}},
        'rawPath': '/unsubscribe',
        'queryStringParameters': {},
      },
    )

    self.assertEqual(response['statusCode'], 400)

  def test_unsubscribe_invalid_token_returns_404(self) -> None:
    backend = build_backend()
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'GET'}},
        'rawPath': '/unsubscribe',
        'queryStringParameters': {'token': 'no-such-token'},
      },
    )

    self.assertEqual(response['statusCode'], 404)

  # ---------------------------------------------------------------------------
  # Duplicate subscription handling
  # ---------------------------------------------------------------------------

  def test_duplicate_active_subscription_returns_200_with_unsubscribe_url(self) -> None:
    backend = build_backend()
    # Sign up and confirm
    backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps({'channel': 'email', 'destination': 'resident@example.com', 'zipCode': '81092'}),
      },
    )
    confirm_token = (
      backend._notification_gateway.confirmation_messages[0]['message']
      .split('Confirm alerts: ')[1]
      .split('\n')[0]
      .split('token=')[1]
    )
    backend.handle(
      {
        'requestContext': {'http': {'method': 'GET'}},
        'rawPath': '/confirm',
        'queryStringParameters': {'token': confirm_token},
      },
    )
    # Try to sign up again with same address
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps({'channel': 'email', 'destination': 'resident@example.com', 'zipCode': '81092'}),
      },
    )

    self.assertEqual(response['statusCode'], 200)
    self.assertIn('already subscribed', response['body'])
    self.assertIn('unsubscribeUrl', response['body'])

  def test_duplicate_pending_subscription_resends_confirmation(self) -> None:
    backend = build_backend()
    # First signup
    backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps({'channel': 'email', 'destination': 'resident@example.com', 'zipCode': '81092'}),
      },
    )
    gateway = backend._notification_gateway
    self.assertEqual(len(gateway.confirmation_messages), 1)

    # Second signup before confirming
    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps({'channel': 'email', 'destination': 'resident@example.com', 'zipCode': '81092'}),
      },
    )

    self.assertEqual(response['statusCode'], 202)
    self.assertIn('fresh confirmation', response['body'])
    self.assertEqual(len(gateway.confirmation_messages), 2)

  # ---------------------------------------------------------------------------
  # SMS confirmation delivery failure
  # ---------------------------------------------------------------------------

  def test_returns_actionable_error_when_sms_confirmation_delivery_fails(self) -> None:
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
      notification_gateway=FailingNotificationGateway('SNS publish failed: Invalid phone number'),
      nws_client=APP.StaticNwsClient([]),
      translation_gateway=APP.MemoryTranslationGateway(),
    )

    response = backend.handle(
      {
        'requestContext': {'http': {'method': 'POST'}},
        'rawPath': '/subscriptions',
        'headers': {'host': 'alerts.example.com', 'x-forwarded-proto': 'https'},
        'body': json.dumps({'channel': 'sms', 'destination': '(719) 555-0101', 'zipCode': '81092'}),
      },
    )

    self.assertEqual(response['statusCode'], 502)
    self.assertIn('Text alert confirmations', response['body'])

  # ---------------------------------------------------------------------------
  # Scheduled event: no alerts, no subscribers
  # ---------------------------------------------------------------------------

  def test_scheduled_event_with_no_alerts_sends_zero_messages(self) -> None:
    backend = build_backend(alerts=[])
    response = backend.handle({'source': 'aws.events', 'detail-type': 'Scheduled Event'})

    body = json.loads(response['body'])
    self.assertEqual(body['messagesSent'], 0)
    self.assertEqual(body['activeAlerts'], 0)


if __name__ == '__main__':
  unittest.main()
