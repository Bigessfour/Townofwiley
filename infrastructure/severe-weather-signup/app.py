from __future__ import annotations

import base64
import json
import logging
import os
import re
import time
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parseaddr
from html import escape
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

EMAIL_CHANNEL = 'email'
SMS_CHANNEL = 'sms'
LANGUAGE_EN = 'en'
LANGUAGE_ES = 'es'
PENDING_STATUS = 'pending'
ACTIVE_STATUS = 'active'
UNSUBSCRIBED_STATUS = 'unsubscribed'
DEFAULT_ALLOWED_ZIP_CODE = '81092'
DEFAULT_ALERT_ZONE_CODE = 'COZ098'
DEFAULT_NOTIFICATION_NAME = 'Town of Wiley Alerts'
SUPPORTED_ALERT_LANGUAGES = {LANGUAGE_EN, LANGUAGE_ES}
DEFAULT_CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
}

LOGGER = logging.getLogger(__name__)
LOGGER.setLevel(logging.INFO)
PHONE_DIGIT_PATTERN = re.compile(r'\D+')
TRANSLATION_URL_PATTERN = re.compile(r'https?://\S+')


@dataclass(frozen=True)
class AppConfig:
  subscriptions_table: str
  deliveries_table: str
  sender_email: str
  notification_sender_name: str
  allowed_zip_code: str
  alert_zone_code: str
  public_api_base_url: str
  nws_user_agent: str
  nws_api_key: str
  developer_test_token_secret_name: str = ''
  developer_test_token: str = ''
  cloudwatch_namespace: str = 'TownOfWiley/SevereWeather'


class SubscriptionStore(Protocol):
  def find_existing_subscription(self, channel: str, subscriber_key: str) -> dict[str, Any] | None: ...

  def save_subscription(self, item: dict[str, Any]) -> None: ...

  def find_by_token(self, token_field: str, token_value: str) -> dict[str, Any] | None: ...

  def update_subscription_status(self, subscription_id: str, status: str) -> dict[str, Any] | None: ...

  def list_active_subscriptions(self, zip_code: str) -> list[dict[str, Any]]: ...


class DeliveryStore(Protocol):
  def has_delivery(self, delivery_id: str) -> bool: ...

  def mark_delivered(self, delivery_id: str, subscription_id: str, alert_id: str) -> None: ...


class NotificationGateway(Protocol):
  def send_confirmation(self, channel: str, destination: str, subject: str, message: str) -> None: ...

  def send_alert(self, channel: str, destination: str, subject: str, message: str) -> None: ...


class CloudwatchGateway(Protocol):
  def put_metric_data(self, namespace: str, metric_name: str, value: float) -> None: ...


class TranslationGateway(Protocol):
  def translate_text(self, text: str, source_language: str, target_language: str) -> str: ...


class NwsClient(Protocol):
  def fetch_active_alerts(self, zone_code: str, user_agent: str, api_key: str) -> list[dict[str, Any]]: ...


class MemorySubscriptionStore:
  def __init__(self) -> None:
    self._items: dict[str, dict[str, Any]] = {}

  def find_existing_subscription(self, channel: str, subscriber_key: str) -> dict[str, Any] | None:
    for item in self._items.values():
      if (
        item['channel'] == channel
        and item['subscriberKey'] == subscriber_key
        and item['status'] in {PENDING_STATUS, ACTIVE_STATUS}
      ):
        return dict(item)
    return None

  def save_subscription(self, item: dict[str, Any]) -> None:
    self._items[item['subscriptionId']] = dict(item)

  def find_by_token(self, token_field: str, token_value: str) -> dict[str, Any] | None:
    for item in self._items.values():
      if item.get(token_field) == token_value:
        return dict(item)
    return None

  def update_subscription_status(self, subscription_id: str, status: str) -> dict[str, Any] | None:
    item = self._items.get(subscription_id)

    if not item:
      return None

    item['status'] = status
    item['updatedAt'] = utc_now_iso()

    if status == ACTIVE_STATUS:
      item['confirmedAt'] = utc_now_iso()

    return dict(item)

  def list_active_subscriptions(self, zip_code: str) -> list[dict[str, Any]]:
    return [
      dict(item)
      for item in self._items.values()
      if item['status'] == ACTIVE_STATUS and item['zipCode'] == zip_code
    ]


class MemoryDeliveryStore:
  def __init__(self) -> None:
    self._delivery_ids: set[str] = set()

  def has_delivery(self, delivery_id: str) -> bool:
    return delivery_id in self._delivery_ids

  def mark_delivered(self, delivery_id: str, subscription_id: str, alert_id: str) -> None:
    self._delivery_ids.add(delivery_id)


class MemoryNotificationGateway:
  def __init__(self) -> None:
    self.confirmation_messages: list[dict[str, str]] = []
    self.alert_messages: list[dict[str, str]] = []

  def send_confirmation(self, channel: str, destination: str, subject: str, message: str) -> None:
    self.confirmation_messages.append(
      {
        'channel': channel,
        'destination': destination,
        'subject': subject,
        'message': message,
      },
    )

  def send_alert(self, channel: str, destination: str, subject: str, message: str) -> None:
    self.alert_messages.append(
      {
        'channel': channel,
        'destination': destination,
        'subject': subject,
        'message': message,
      },
    )


class MemoryCloudwatchGateway:
  def __init__(self) -> None:
    self.metrics: list[dict[str, Any]] = []

  def put_metric_data(self, namespace: str, metric_name: str, value: float) -> None:
    self.metrics.append(
      {
        'namespace': namespace,
        'metric_name': metric_name,
        'value': value,
      },
    )


class StaticNwsClient:
  def __init__(self, alerts: list[dict[str, Any]]) -> None:
    self._alerts = alerts

  def fetch_active_alerts(self, zone_code: str, user_agent: str, api_key: str) -> list[dict[str, Any]]:
    del zone_code, user_agent, api_key
    return [dict(alert) for alert in self._alerts]


class MemoryTranslationGateway:
  def translate_text(self, text: str, source_language: str, target_language: str) -> str:
    del source_language, target_language
    return text


class DynamoSubscriptionStore:
  def __init__(self, table: Any) -> None:
    self._table = table

  def find_existing_subscription(self, channel: str, subscriber_key: str) -> dict[str, Any] | None:
    items = self._scan_items(
      {'channel': channel, 'subscriberKey': subscriber_key},
      status_filter={PENDING_STATUS, ACTIVE_STATUS},
    )
    return items[0] if items else None

  def save_subscription(self, item: dict[str, Any]) -> None:
    self._table.put_item(Item=item)

  def find_by_token(self, token_field: str, token_value: str) -> dict[str, Any] | None:
    items = self._scan_items({token_field: token_value})
    return items[0] if items else None

  def update_subscription_status(self, subscription_id: str, status: str) -> dict[str, Any] | None:
    response = self._table.update_item(
      Key={'subscriptionId': subscription_id},
      UpdateExpression=(
        'SET #status = :status, updatedAt = :updatedAt, confirmedAt = if_not_exists(confirmedAt, :confirmedAt)'
      ),
      ExpressionAttributeNames={'#status': 'status'},
      ExpressionAttributeValues={
        ':status': status,
        ':updatedAt': utc_now_iso(),
        ':confirmedAt': utc_now_iso(),
      },
      ReturnValues='ALL_NEW',
    )
    return response.get('Attributes')

  def list_active_subscriptions(self, zip_code: str) -> list[dict[str, Any]]:
    return self._scan_items({'zipCode': zip_code, 'status': ACTIVE_STATUS})

  def _scan_items(
    self,
    equals_filters: dict[str, Any],
    status_filter: set[str] | None = None,
  ) -> list[dict[str, Any]]:
    from boto3.dynamodb.conditions import Attr

    filter_expression = None

    for key, value in equals_filters.items():
      clause = Attr(key).eq(value)
      filter_expression = clause if filter_expression is None else filter_expression & clause

    if status_filter:
      clause = Attr('status').is_in(sorted(status_filter))
      filter_expression = clause if filter_expression is None else filter_expression & clause

    items: list[dict[str, Any]] = []
    scan_kwargs: dict[str, Any] = {}

    if filter_expression is not None:
      scan_kwargs['FilterExpression'] = filter_expression

    while True:
      response = self._table.scan(**scan_kwargs)
      items.extend(response.get('Items', []))

      if 'LastEvaluatedKey' not in response:
        return items

      scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']


class DynamoDeliveryStore:
  def __init__(self, table: Any) -> None:
    self._table = table

  def has_delivery(self, delivery_id: str) -> bool:
    response = self._table.get_item(Key={'deliveryId': delivery_id})
    return 'Item' in response

  def mark_delivered(self, delivery_id: str, subscription_id: str, alert_id: str) -> None:
    self._table.put_item(
      Item={
        'deliveryId': delivery_id,
        'subscriptionId': subscription_id,
        'alertId': alert_id,
        'sentAt': utc_now_iso(),
        'expiresAtEpoch': int(time.time()) + 60 * 60 * 24 * 30,
      },
    )


class AwsNotificationGateway:
  def __init__(self, sender_email: str, sender_name: str, ses_client: Any, sns_client: Any) -> None:
    self._sender_email = sender_email
    self._sender_name = sender_name
    self._ses_client = ses_client
    self._sns_client = sns_client

  def send_confirmation(self, channel: str, destination: str, subject: str, message: str) -> None:
    self._send(channel, destination, subject, message)

  def send_alert(self, channel: str, destination: str, subject: str, message: str) -> None:
    self._send(channel, destination, subject, message)

  def _send(self, channel: str, destination: str, subject: str, message: str) -> None:
    if channel == EMAIL_CHANNEL:
      if not self._sender_email:
        raise RuntimeError('SENDER_EMAIL must be configured before email subscriptions can be used.')

      self._ses_client.send_email(
        FromEmailAddress=f'{self._sender_name} <{self._sender_email}>',
        Destination={'ToAddresses': [destination]},
        Content={
          'Simple': {
            'Subject': {'Data': subject},
            'Body': {'Text': {'Data': message}},
          },
        },
      )
      return

    if channel == SMS_CHANNEL:
      self._sns_client.publish(PhoneNumber=destination, Message=message)
      return

    raise ValueError(f'Unsupported notification channel: {channel}')


class AwsTranslationGateway:
  def __init__(self, translate_client: Any) -> None:
    self._translate_client = translate_client

  def translate_text(self, text: str, source_language: str, target_language: str) -> str:
    if not text.strip() or source_language == target_language:
      return text

    response = self._translate_client.translate_text(
      Text=text,
      SourceLanguageCode=source_language,
      TargetLanguageCode=target_language,
      Settings={
        'Formality': 'FORMAL',
      },
    )

    translated_text = str(response.get('TranslatedText', '')).strip()
    return translated_text or text


class AwsCloudwatchGateway:
  def __init__(self) -> None:
    self._client: Any | None = None

  def put_metric_data(self, namespace: str, metric_name: str, value: float) -> None:
    if self._client is None:
      import boto3

      self._client = boto3.client('cloudwatch')

    self._client.put_metric_data(
      Namespace=namespace,
      MetricData=[
        {
          'MetricName': metric_name,
          'Unit': 'Count',
          'Value': value,
        },
      ],
    )


class WeatherGovNwsClient:
  def fetch_active_alerts(self, zone_code: str, user_agent: str, api_key: str) -> list[dict[str, Any]]:
    headers = {
      'accept': 'application/geo+json',
      'user-agent': user_agent,
    }

    if api_key:
      headers['api-key'] = api_key

    request = Request(
      f'https://api.weather.gov/alerts/active?zone={zone_code}',
      headers=headers,
    )

    try:
      with urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode('utf-8'))
    except HTTPError as error:
      raise RuntimeError(f'NWS alert request failed with status {error.code}.') from error
    except URLError as error:
      raise RuntimeError('Unable to reach weather.gov for active alerts.') from error

    alerts: list[dict[str, Any]] = []

    for feature in payload.get('features', []):
      properties = feature.get('properties', {})
      alerts.append(
        {
          'id': feature.get('id') or str(uuid.uuid4()),
          'event': properties.get('event') or 'Severe weather alert',
          'headline': normalize_whitespace(
            properties.get('headline')
            or first_nonempty_line(properties.get('description', ''))
            or properties.get('event')
            or 'Severe weather alert'
          ),
          'severity': properties.get('severity') or 'Unknown severity',
          'urgency': properties.get('urgency') or 'Unknown urgency',
          'expires': properties.get('expires') or '',
          'instruction': normalize_whitespace(properties.get('instruction') or ''),
          'areaDesc': normalize_whitespace(properties.get('areaDesc') or ''),
        },
      )

    return alerts


class SevereWeatherBackend:
  def __init__(
    self,
    config: AppConfig,
    subscription_store: SubscriptionStore,
    delivery_store: DeliveryStore,
    notification_gateway: NotificationGateway,
    nws_client: NwsClient,
    translation_gateway: TranslationGateway,
    cloudwatch_gateway: CloudwatchGateway | None = None,
    secrets_manager_client: Any | None = None,
  ) -> None:
    self._config = config
    self._subscription_store = subscription_store
    self._delivery_store = delivery_store
    self._notification_gateway = notification_gateway
    self._nws_client = nws_client
    self._translation_gateway = translation_gateway
    self._cloudwatch_gateway = cloudwatch_gateway or AwsCloudwatchGateway()
    self._secrets_manager_client = secrets_manager_client
    self._developer_test_token_cache: str | None = None

  def handle(self, event: dict[str, Any]) -> dict[str, Any]:
    if is_scheduled_event(event):
      return self._handle_scheduled_event()

    return self._handle_http_event(event)

  def _handle_http_event(self, event: dict[str, Any]) -> dict[str, Any]:
    method = request_method(event)
    path = request_path(event)

    log_http_request(method, path)

    if method == 'OPTIONS':
      return {
        'statusCode': 204,
        'headers': DEFAULT_CORS_HEADERS,
        'body': '',
      }

    if method == 'GET' and path.endswith('/health'):
      return json_response(
        200,
        {
          'service': 'townofwiley-severe-weather-signup',
          'allowedZipCode': self._config.allowed_zip_code,
          'alertZoneCode': self._config.alert_zone_code,
          'signupChannels': [EMAIL_CHANNEL, SMS_CHANNEL],
          'signupLanguages': sorted(SUPPORTED_ALERT_LANGUAGES),
        },
      )

    if method == 'POST' and path.endswith('/subscriptions'):
      return self._create_subscription(event)

    if method == 'POST' and path.endswith('/developer-test'):
      return self._handle_developer_test(event)

    if method == 'GET' and path.endswith('/confirm'):
      return self._confirm_subscription(event)

    if method == 'GET' and path.endswith('/unsubscribe'):
      return self._unsubscribe_subscription(event)

    if method == 'POST' and path.endswith('/log'):
      return self._handle_log(event)

    return json_response(404, {'error': 'Route not found.'})

  def _handle_log(self, event: dict[str, Any]) -> dict[str, Any]:
    try:
      payload = parse_json_body(event)
    except ValueError:
      return json_response(400, {'error': 'Invalid JSON body.'})

    level = str(payload.get('level', 'info')).strip().lower()
    message = str(payload.get('message', '')).strip()[:500]

    if not message:
      return json_response(400, {'error': 'message is required.'})

    LOGGER.info(
      json.dumps(
        {
          'event': 'client_log',
          'level': level,
          'message': message,
          'context': payload.get('context') if isinstance(payload.get('context'), dict) else {},
          'page': str(payload.get('page', '')).strip()[:200],
          'url': str(payload.get('url', '')).strip()[:500],
          'build': payload.get('build') if isinstance(payload.get('build'), dict) else {},
        },
      ),
    )

    return json_response(200, {'ok': True})

  def _handle_developer_test(self, event: dict[str, Any]) -> dict[str, Any]:
    developer_test_token = self._resolve_developer_test_token()

    if not developer_test_token:
      return json_response(404, {'error': 'Developer test route is disabled.'})

    provided_token = request_header(event, 'x-townofwiley-test-token')

    if provided_token != developer_test_token:
      return json_response(403, {'error': 'Invalid developer test token.'})

    try:
      payload = parse_json_body(event)
    except ValueError as error:
      return json_response(400, {'error': str(error)})

    preferred_language = normalize_alert_language(payload.get('preferredLanguage', LANGUAGE_EN))
    zip_code = str(payload.get('zipCode', self._config.allowed_zip_code)).strip() or self._config.allowed_zip_code
    event_name = normalize_whitespace(
      str(payload.get('event', 'Town of Wiley severe weather test alert')).strip(),
    )
    headline = normalize_whitespace(
      str(payload.get('headline', 'Developer-only smoke test for the severe weather alert path')).strip(),
    )
    severity = normalize_whitespace(str(payload.get('severity', 'Moderate')).strip())
    urgency = normalize_whitespace(str(payload.get('urgency', 'Expected')).strip())
    instruction = normalize_whitespace(
      str(payload.get('instruction', 'Confirm delivery on the email address and mobile number provided.')).strip(),
    )
    expires = normalize_whitespace(str(payload.get('expires', '')).strip())
    area_desc = normalize_whitespace(str(payload.get('areaDesc', 'Town of Wiley developer test recipients')).strip())
    alert = {
      'id': str(payload.get('alertId') or f'developer-test-{uuid.uuid4().hex}'),
      'event': event_name,
      'headline': headline,
      'severity': severity,
      'urgency': urgency,
      'expires': expires,
      'instruction': instruction,
      'areaDesc': area_desc,
    }
    subscription_template = {
      'zipCode': zip_code,
      'unsubscribeToken': str(payload.get('unsubscribeToken') or uuid.uuid4().hex),
      'preferredLanguage': preferred_language,
    }

    destinations_sent: list[dict[str, str]] = []

    for channel, destination_key in ((EMAIL_CHANNEL, 'emailDestination'), (SMS_CHANNEL, 'smsDestination')):
      raw_destination = str(payload.get(destination_key, '')).strip()

      if not raw_destination:
        continue

      normalized_destination, _ = normalize_destination(channel, raw_destination)
      subject = self._build_alert_subject(subscription_template, alert)
      message = self._build_alert_message(subscription_template, alert)
      self._notification_gateway.send_alert(channel, normalized_destination, subject, message)
      destinations_sent.append({'channel': channel, 'destination': normalized_destination})

    if not destinations_sent:
      return json_response(400, {'error': 'Provide at least one emailDestination or smsDestination.'})

    return json_response(
      200,
      {
        'message': 'Developer-only test alert sent.',
        'destinationsSent': destinations_sent,
      },
    )

  def _create_subscription(self, event: dict[str, Any]) -> dict[str, Any]:
    method = request_method(event)
    path = request_path(event)

    try:
      payload = parse_json_body(event)
    except ValueError as error:
      log_signup_attempt(
        method=method,
        path=path,
        validation_result='invalid_json',
        delivery_outcome='not_attempted',
        status_code=400,
        error=str(error),
      )
      return json_response(400, {'error': str(error)})

    channel = str(payload.get('channel', '')).strip().lower()
    destination = str(payload.get('destination', '')).strip()
    full_name = normalize_whitespace(str(payload.get('fullName', '')).strip())
    try:
      preferred_language = normalize_alert_language(payload.get('preferredLanguage', LANGUAGE_EN))
    except ValueError as error:
      log_signup_attempt(
        method=method,
        path=path,
        channel=channel,
        destination=destination,
        validation_result='invalid_language',
        delivery_outcome='not_attempted',
        status_code=400,
        error=str(error),
      )
      return json_response(400, {'error': str(error)})
    zip_code = str(payload.get('zipCode', self._config.allowed_zip_code)).strip()

    if zip_code != self._config.allowed_zip_code:
      log_signup_attempt(
        method=method,
        path=path,
        channel=channel,
        destination=destination,
        preferred_language=preferred_language,
        zip_code=zip_code,
        validation_result='invalid_zip_code',
        delivery_outcome='not_attempted',
        status_code=400,
        error=f'This signup is currently limited to ZIP code {self._config.allowed_zip_code}.',
      )
      return json_response(
        400,
        {
          'error': f'This signup is currently limited to ZIP code {self._config.allowed_zip_code}.',
        },
      )

    try:
      normalized_destination, subscriber_key = normalize_destination(channel, destination)
    except ValueError as error:
      log_signup_attempt(
        method=method,
        path=path,
        channel=channel,
        destination=destination,
        preferred_language=preferred_language,
        zip_code=zip_code,
        validation_result='invalid_destination',
        delivery_outcome='not_attempted',
        status_code=400,
        error=str(error),
      )
      return json_response(400, {'error': str(error)})

    existing = self._subscription_store.find_existing_subscription(channel, subscriber_key)
    request_base_url = build_request_base_url(event, self._config.public_api_base_url)

    if existing:
      existing['fullName'] = full_name or existing.get('fullName', '')
      existing['preferredLanguage'] = preferred_language
      existing['updatedAt'] = utc_now_iso()
      self._subscription_store.save_subscription(existing)
      confirm_url = build_token_url(request_base_url, '/confirm', existing['confirmationToken'])
      unsubscribe_url = build_token_url(request_base_url, '/unsubscribe', existing['unsubscribeToken'])

      if existing['status'] == ACTIVE_STATUS:
        log_signup_attempt(
          method=method,
          path=path,
          channel=channel,
          destination=normalized_destination,
          preferred_language=preferred_language,
          zip_code=zip_code,
          validation_result='already_active',
          delivery_outcome='not_attempted',
          status_code=200,
          existing_status=ACTIVE_STATUS,
        )
        return json_response(
          200,
          {
            'message': self._localize_message(
              'This destination is already subscribed to Town of Wiley severe weather alerts.',
              preferred_language,
            ),
            'unsubscribeUrl': unsubscribe_url,
          },
        )

      try:
        self._send_confirmation_message(
          channel,
          normalized_destination,
          confirm_url,
          unsubscribe_url,
          preferred_language,
        )
      except RuntimeError as error:
        log_signup_attempt(
          method=method,
          path=path,
          channel=channel,
          destination=normalized_destination,
          preferred_language=preferred_language,
          zip_code=zip_code,
          validation_result='existing_pending_subscription',
          delivery_outcome='failed',
          status_code=502,
          error=str(error),
          existing_status=PENDING_STATUS,
        )
        return json_response(502, {'error': str(error)})

      log_signup_attempt(
        method=method,
        path=path,
        channel=channel,
        destination=normalized_destination,
        preferred_language=preferred_language,
        zip_code=zip_code,
        validation_result='existing_pending_subscription',
        delivery_outcome='sent',
        status_code=202,
        existing_status=PENDING_STATUS,
      )

      return json_response(
        202,
        {
          'message': 'A fresh confirmation message was sent for the existing pending subscription.',
        },
      )

    subscription_id = str(uuid.uuid4())
    confirmation_token = secrets_token()
    unsubscribe_token = secrets_token()
    created_at = utc_now_iso()
    item = {
      'subscriptionId': subscription_id,
      'channel': channel,
      'destination': normalized_destination,
      'subscriberKey': subscriber_key,
      'fullName': full_name,
      'preferredLanguage': preferred_language,
      'zipCode': zip_code,
      'zoneCode': self._config.alert_zone_code,
      'status': PENDING_STATUS,
      'confirmationToken': confirmation_token,
      'unsubscribeToken': unsubscribe_token,
      'createdAt': created_at,
      'updatedAt': created_at,
    }
    confirm_url = build_token_url(request_base_url, '/confirm', confirmation_token)
    unsubscribe_url = build_token_url(request_base_url, '/unsubscribe', unsubscribe_token)

    try:
      self._send_confirmation_message(
        channel,
        normalized_destination,
        confirm_url,
        unsubscribe_url,
        preferred_language,
      )
    except RuntimeError as error:
      log_signup_attempt(
        method=method,
        path=path,
        channel=channel,
        destination=normalized_destination,
        preferred_language=preferred_language,
        zip_code=zip_code,
        validation_result='new_subscription',
        delivery_outcome='failed',
        status_code=502,
        error=str(error),
      )
      return json_response(502, {'error': str(error)})

    self._subscription_store.save_subscription(item)

    log_signup_attempt(
      method=method,
      path=path,
      channel=channel,
      destination=normalized_destination,
      preferred_language=preferred_language,
      zip_code=zip_code,
      validation_result='new_subscription',
      delivery_outcome='sent',
      status_code=202,
    )

    return json_response(
      202,
      {
        'message': self._localize_message(
          'Subscription created. Confirm the link that was sent before alerts start flowing.',
          preferred_language,
        ),
      },
    )

  def _confirm_subscription(self, event: dict[str, Any]) -> dict[str, Any]:
    token = query_param(event, 'token')

    if not token:
      return html_response(400, render_status_page('Missing token', 'The confirmation link is incomplete.'))

    item = self._subscription_store.find_by_token('confirmationToken', token)

    if not item:
      return html_response(404, render_status_page('Link not found', 'The confirmation token could not be matched.'))

    if item['status'] != ACTIVE_STATUS:
      item = self._subscription_store.update_subscription_status(item['subscriptionId'], ACTIVE_STATUS) or item

    return html_response(
      200,
      render_status_page(
        self._localize_message('Alerts confirmed', item.get('preferredLanguage', LANGUAGE_EN)),
        self._localize_message(
          f"{item['destination']} is now active for Town of Wiley severe weather alerts for ZIP {item['zipCode']}.",
          item.get('preferredLanguage', LANGUAGE_EN),
        ),
      ),
    )

  def _unsubscribe_subscription(self, event: dict[str, Any]) -> dict[str, Any]:
    token = query_param(event, 'token')

    if not token:
      return html_response(400, render_status_page('Missing token', 'The unsubscribe link is incomplete.'))

    item = self._subscription_store.find_by_token('unsubscribeToken', token)

    if not item:
      return html_response(404, render_status_page('Link not found', 'The unsubscribe token could not be matched.'))

    self._subscription_store.update_subscription_status(item['subscriptionId'], UNSUBSCRIBED_STATUS)

    return html_response(
      200,
      render_status_page(
        self._localize_message('Alerts stopped', item.get('preferredLanguage', LANGUAGE_EN)),
        self._localize_message(
          f"{item['destination']} has been unsubscribed from Town of Wiley severe weather alerts.",
          item.get('preferredLanguage', LANGUAGE_EN),
        ),
      ),
    )

  def _handle_scheduled_event(self) -> dict[str, Any]:
    alerts = self._nws_client.fetch_active_alerts(
      self._config.alert_zone_code,
      self._config.nws_user_agent,
      self._config.nws_api_key,
    )
    subscriptions = self._subscription_store.list_active_subscriptions(self._config.allowed_zip_code)
    sent_count = 0
    failed_count = 0

    for subscription in subscriptions:
      for alert in alerts:
        delivery_id = f"{subscription['subscriptionId']}#{alert['id']}"

        if self._delivery_store.has_delivery(delivery_id):
          continue

        try:
          self._notification_gateway.send_alert(
            subscription['channel'],
            subscription['destination'],
            self._build_alert_subject(subscription, alert),
            self._build_alert_message(subscription, alert),
          )
        except Exception as error:
          failed_count += 1
          log_alert_delivery_failure(
            channel=subscription['channel'],
            destination=subscription['destination'],
            alert_id=alert['id'],
            subscription_id=subscription['subscriptionId'],
            error=error,
          )
          continue

        self._delivery_store.mark_delivered(delivery_id, subscription['subscriptionId'], alert['id'])
        sent_count += 1

    if sent_count > 0:
      self._publish_metric('NormalAlertTriggered', 1)

    if failed_count > 0:
      self._publish_metric('AlertDeliveryFailure', failed_count)

    return {
      'statusCode': 200,
      'body': json.dumps(
        {
          'subscriptionsChecked': len(subscriptions),
          'activeAlerts': len(alerts),
          'messagesSent': sent_count,
          'messagesFailed': failed_count,
        },
      ),
    }

  def _build_confirmation_message(self, confirm_url: str, unsubscribe_url: str) -> str:
    return (
      'Town of Wiley severe weather alerts\n\n'
      f'Coverage area: ZIP {self._config.allowed_zip_code} and NWS forecast zone {self._config.alert_zone_code}.\n\n'
      f'Confirm alerts: {confirm_url}\n'
      f'Cancel signup: {unsubscribe_url}\n\n'
      'You will receive notifications only after the confirmation step is completed.'
    )

  def _send_confirmation_message(
    self,
    channel: str,
    destination: str,
    confirm_url: str,
    unsubscribe_url: str,
    preferred_language: str,
  ) -> None:
    try:
      self._notification_gateway.send_confirmation(
        channel,
        destination,
        self._localize_message('Confirm Town of Wiley severe weather alerts', preferred_language),
        self._localize_message(
          self._build_confirmation_message(confirm_url, unsubscribe_url),
          preferred_language,
        ),
      )
    except Exception as error:
      raise RuntimeError(self._build_confirmation_delivery_error(channel, error)) from error

  def _build_confirmation_delivery_error(self, channel: str, error: Exception) -> str:
    error_message = normalize_whitespace(str(error))
    normalized_error = error_message.lower()

    if channel == EMAIL_CHANNEL:
      if 'sandbox' in normalized_error or 'email address is not verified' in normalized_error:
        return (
          'Email confirmations are temporarily unavailable. Try SMS text alerts instead or contact Town Hall.'
        )

      return 'Email confirmations are temporarily unavailable. Please try again or contact Town Hall.'

    if channel == SMS_CHANNEL:
      return 'Text alert confirmations are temporarily unavailable. Please try email alerts or contact Town Hall.'

    return 'Alert confirmations are temporarily unavailable. Please try again or contact Town Hall.'

  def _build_alert_message(self, subscription: dict[str, Any], alert: dict[str, Any]) -> str:
    expires_label = format_expiration(alert.get('expires', ''))
    lines = [
      f"Town of Wiley severe weather alert for ZIP {subscription['zipCode']}",
      '',
      f"Event: {alert['event']}",
      f"Headline: {alert['headline']}",
      f"Severity: {alert['severity']}",
      f"Urgency: {alert['urgency']}",
    ]

    if expires_label:
      lines.append(f'Expires: {expires_label}')

    if alert.get('areaDesc'):
      lines.append(f"Area: {alert['areaDesc']}")

    if alert.get('instruction'):
      lines.extend(['', f"Instructions: {alert['instruction']}"])

    if self._config.public_api_base_url:
      unsubscribe_url = build_token_url(
        self._config.public_api_base_url,
        '/unsubscribe',
        subscription['unsubscribeToken'],
      )
      lines.extend(['', f'Unsubscribe: {unsubscribe_url}'])

    return self._localize_message(
      '\n'.join(lines),
      subscription.get('preferredLanguage', LANGUAGE_EN),
    )

  def _build_alert_subject(self, subscription: dict[str, Any], alert: dict[str, Any]) -> str:
    return self._localize_message(
      f"Town of Wiley alert: {alert['event']}",
      subscription.get('preferredLanguage', LANGUAGE_EN),
    )

  def _localize_message(self, message: str, preferred_language: str) -> str:
    try:
      language = normalize_alert_language(preferred_language)
    except ValueError:
      language = LANGUAGE_EN

    if language == LANGUAGE_EN or not message.strip():
      return message

    masked_message, placeholder_map = mask_urls_for_translation(message)

    try:
      translated = self._translation_gateway.translate_text(masked_message, LANGUAGE_EN, language)
    except Exception:
      return message

    return restore_translated_urls(translated, placeholder_map)

  def _resolve_developer_test_token(self) -> str:
    if self._config.developer_test_token:
      return self._config.developer_test_token

    if self._developer_test_token_cache is not None:
      return self._developer_test_token_cache

    secret_name = self._config.developer_test_token_secret_name.strip()

    if not secret_name:
      self._developer_test_token_cache = ''
      return ''

    try:
      secret_value = self._get_secret_string(secret_name)
    except Exception as error:
      LOGGER.error(
        json.dumps(
          {
            'event': 'developer_test_secret_lookup_failed',
            'secretName': secret_name,
            'error': normalize_whitespace(str(error))[:500],
          },
        ),
      )
      self._developer_test_token_cache = ''
      return ''

    self._developer_test_token_cache = secret_value
    return secret_value

  def _get_secret_string(self, secret_name: str) -> str:
    if self._secrets_manager_client is None:
      import boto3

      region_name = os.environ.get('AWS_REGION') or None
      self._secrets_manager_client = boto3.client('secretsmanager', region_name=region_name)

    response = self._secrets_manager_client.get_secret_value(SecretId=secret_name)
    return str(response.get('SecretString', '')).strip()

  def _publish_metric(self, metric_name: str, value: float) -> None:
    try:
      self._cloudwatch_gateway.put_metric_data(self._config.cloudwatch_namespace, metric_name, value)
    except Exception as error:
      LOGGER.error(
        json.dumps(
          {
            'event': 'cloudwatch_metric_publish_failed',
            'metricName': metric_name,
            'namespace': self._config.cloudwatch_namespace,
            'error': normalize_whitespace(str(error))[:500],
          },
        ),
      )


def request_method(event: dict[str, Any]) -> str:
  return str(event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod') or '').upper()


def request_path(event: dict[str, Any]) -> str:
  return str(event.get('rawPath') or event.get('path') or '/').rstrip('/') or '/'


def is_scheduled_event(event: dict[str, Any]) -> bool:
  return event.get('source') == 'aws.events' or event.get('detail-type') == 'Scheduled Event'


def parse_json_body(event: dict[str, Any]) -> dict[str, Any]:
  body = event.get('body')

  if body is None:
    raise ValueError('Missing JSON request body.')

  if event.get('isBase64Encoded'):
    body = base64.b64decode(body).decode('utf-8')

  try:
    payload = json.loads(body)
  except json.JSONDecodeError as error:
    raise ValueError('Request body must be valid JSON.') from error

  if not isinstance(payload, dict):
    raise ValueError('Request body must be a JSON object.')

  return payload


def query_param(event: dict[str, Any], name: str) -> str:
  query = event.get('queryStringParameters') or {}
  value = query.get(name)
  return str(value).strip() if value else ''


def request_header(event: dict[str, Any], name: str) -> str:
  headers = event.get('headers') or {}
  value = (
    headers.get(name)
    or headers.get(name.lower())
    or headers.get(name.title())
    or headers.get(name.upper())
  )
  return str(value).strip() if value else ''


def normalize_destination(channel: str, destination: str) -> tuple[str, str]:
  if channel == EMAIL_CHANNEL:
    return normalize_email(destination)

  if channel == SMS_CHANNEL:
    return normalize_phone(destination)

  raise ValueError('Channel must be either "email" or "sms".')


def normalize_alert_language(value: Any) -> str:
  normalized = str(value or LANGUAGE_EN).strip().lower()

  if normalized not in SUPPORTED_ALERT_LANGUAGES:
    raise ValueError('Preferred language must be either "en" or "es".')

  return normalized


def normalize_email(destination: str) -> tuple[str, str]:
  _, parsed_address = parseaddr(destination)
  normalized = parsed_address.strip().lower()

  if not normalized or '@' not in normalized:
    raise ValueError('Enter a valid email address.')

  return normalized, normalized


def normalize_phone(destination: str) -> tuple[str, str]:
  digits = PHONE_DIGIT_PATTERN.sub('', destination)

  if len(digits) == 10:
    digits = f'1{digits}'

  if len(digits) != 11 or not digits.startswith('1'):
    raise ValueError('Enter a valid US phone number for SMS alerts.')

  normalized = f'+{digits}'
  return normalized, normalized


def normalize_whitespace(value: str) -> str:
  return ' '.join(value.split())


def log_http_request(method: str, path: str) -> None:
  LOGGER.info(
    json.dumps(
      {
        'event': 'http_request',
        'method': method,
        'path': path,
      },
    ),
  )


def log_signup_attempt(
  *,
  method: str,
  path: str,
  validation_result: str,
  delivery_outcome: str,
  status_code: int,
  channel: str | None = None,
  destination: str | None = None,
  preferred_language: str | None = None,
  zip_code: str | None = None,
  error: str | None = None,
  existing_status: str | None = None,
) -> None:
  payload: dict[str, Any] = {
    'event': 'signup_attempt',
    'method': method,
    'path': path,
    'validationResult': validation_result,
    'deliveryOutcome': delivery_outcome,
    'statusCode': status_code,
  }

  if channel:
    payload['channel'] = channel

  if destination:
    payload['destinationMasked'] = mask_destination(destination)

  if preferred_language:
    payload['preferredLanguage'] = preferred_language

  if zip_code:
    payload['zipCode'] = zip_code

  if existing_status:
    payload['existingStatus'] = existing_status

  if error:
    payload['error'] = error

  LOGGER.info(json.dumps(payload))


def log_alert_delivery_failure(
  *,
  channel: str,
  destination: str,
  alert_id: str,
  subscription_id: str,
  error: Exception,
) -> None:
  LOGGER.error(
    json.dumps(
      {
        'event': 'alert_delivery_failure',
        'channel': channel,
        'destinationMasked': mask_destination(destination),
        'alertId': alert_id,
        'subscriptionId': subscription_id,
        'error': normalize_whitespace(str(error))[:500],
      },
    ),
  )


def mask_destination(destination: str) -> str:
  if '@' in destination:
    local_part, _, domain = destination.partition('@')

    if len(local_part) <= 2:
      masked_local = f'{local_part[:1]}*'
    else:
      masked_local = f'{local_part[:2]}***{local_part[-1:]}'

    return f'{masked_local}@{domain}'

  digits = PHONE_DIGIT_PATTERN.sub('', destination)

  if len(digits) >= 4:
    return f'***-***-{digits[-4:]}'

  return '***'


def mask_urls_for_translation(value: str) -> tuple[str, dict[str, str]]:
  placeholder_map: dict[str, str] = {}

  def replace(match: re.Match[str]) -> str:
    placeholder = f'TOWNWILEYURLTOKEN{len(placeholder_map)}'
    placeholder_map[placeholder] = match.group(0)
    return placeholder

  return TRANSLATION_URL_PATTERN.sub(replace, value), placeholder_map


def restore_translated_urls(value: str, placeholder_map: dict[str, str]) -> str:
  restored = value

  for placeholder, url in placeholder_map.items():
    restored = restored.replace(placeholder, url)

  return restored


def first_nonempty_line(value: str) -> str:
  for line in value.splitlines():
    if line.strip():
      return line.strip()
  return ''


def utc_now_iso() -> str:
  return datetime.now(UTC).replace(microsecond=0).isoformat()


def secrets_token() -> str:
  return uuid.uuid4().hex + uuid.uuid4().hex


def json_response(status_code: int, body: dict[str, Any], extra_headers: dict[str, str] | None = None) -> dict[str, Any]:
  headers = {
    **DEFAULT_CORS_HEADERS,
    'content-type': 'application/json; charset=utf-8',
  }

  if extra_headers:
    headers.update(extra_headers)

  return {
    'statusCode': status_code,
    'headers': headers,
    'body': json.dumps(body),
  }


def html_response(status_code: int, body: str) -> dict[str, Any]:
  return {
    'statusCode': status_code,
    'headers': {
      **DEFAULT_CORS_HEADERS,
      'content-type': 'text/html; charset=utf-8',
    },
    'body': body,
  }


def render_status_page(title: str, message: str) -> str:
  return (
    '<!doctype html>'
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    f'<title>{escape(title)}</title>'
    '<style>body{font-family:Georgia,serif;background:#f4efe4;color:#1f2a2e;margin:0;padding:2rem}.card{max-width:42rem;margin:0 auto;background:#fff;border-radius:18px;padding:2rem;box-shadow:0 20px 50px rgba(31,42,46,.12)}h1{margin-top:0;font-size:2rem}p{line-height:1.6}</style></head><body>'
    f'<main class="card"><p>Town of Wiley Severe Weather Alerts</p><h1>{escape(title)}</h1><p>{escape(message)}</p></main>'
    '</body></html>'
  )


def format_expiration(raw_value: str) -> str:
  if not raw_value:
    return ''

  try:
    parsed = datetime.fromisoformat(raw_value.replace('Z', '+00:00'))
  except ValueError:
    return raw_value

  return parsed.astimezone(UTC).strftime('%Y-%m-%d %H:%M UTC')


def build_request_base_url(event: dict[str, Any], configured_base_url: str) -> str:
  if configured_base_url:
    return configured_base_url.rstrip('/')

  headers = event.get('headers') or {}
  host = headers.get('host') or headers.get('Host')
  protocol = headers.get('x-forwarded-proto') or headers.get('X-Forwarded-Proto') or 'https'

  if host:
    return f'{protocol}://{host}'.rstrip('/')

  return ''


def build_token_url(base_url: str, path: str, token: str) -> str:
  normalized_base = base_url.rstrip('/')
  normalized_path = path if path.startswith('/') else f'/{path}'
  return f'{normalized_base}{normalized_path}?{urlencode({"token": token})}' if normalized_base else ''


def read_config() -> AppConfig:
  return AppConfig(
    subscriptions_table=os.environ['SUBSCRIPTIONS_TABLE'],
    deliveries_table=os.environ['DELIVERIES_TABLE'],
    sender_email=os.environ.get('SENDER_EMAIL', '').strip(),
    notification_sender_name=(os.environ.get('NOTIFICATION_SENDER_NAME', DEFAULT_NOTIFICATION_NAME).strip() or DEFAULT_NOTIFICATION_NAME),
    allowed_zip_code=os.environ.get('ALLOWED_ZIP_CODE', DEFAULT_ALLOWED_ZIP_CODE).strip() or DEFAULT_ALLOWED_ZIP_CODE,
    alert_zone_code=os.environ.get('ALERT_ZONE_CODE', DEFAULT_ALERT_ZONE_CODE).strip() or DEFAULT_ALERT_ZONE_CODE,
    public_api_base_url=os.environ.get('PUBLIC_API_BASE_URL', '').strip(),
    nws_user_agent=os.environ.get('NWS_USER_AGENT', '').strip(),
    nws_api_key=os.environ.get('NWS_API_KEY', '').strip(),
    developer_test_token_secret_name=os.environ.get('DEVELOPER_TEST_TOKEN_SECRET_NAME', '').strip(),
    developer_test_token=os.environ.get('DEVELOPER_TEST_TOKEN', '').strip(),
    cloudwatch_namespace=os.environ.get('CLOUDWATCH_NAMESPACE', 'TownOfWiley/SevereWeather').strip()
    or 'TownOfWiley/SevereWeather',
  )


def build_runtime_backend() -> SevereWeatherBackend:
  config = read_config()
  import boto3

  region_name = os.environ.get('AWS_REGION') or None
  dynamodb = boto3.resource('dynamodb', region_name=region_name)
  ses_client = boto3.client('sesv2', region_name=region_name)
  sns_client = boto3.client('sns', region_name=region_name)
  translate_client = boto3.client('translate', region_name=region_name)

  return SevereWeatherBackend(
    config=config,
    subscription_store=DynamoSubscriptionStore(dynamodb.Table(config.subscriptions_table)),
    delivery_store=DynamoDeliveryStore(dynamodb.Table(config.deliveries_table)),
    notification_gateway=AwsNotificationGateway(config.sender_email, config.notification_sender_name, ses_client, sns_client),
    nws_client=WeatherGovNwsClient(),
    translation_gateway=AwsTranslationGateway(translate_client),
    cloudwatch_gateway=AwsCloudwatchGateway(),
  )


_backend: SevereWeatherBackend | None = None


def handler(event: dict[str, Any], context: Any | None = None) -> dict[str, Any]:
  del context
  global _backend

  if _backend is None:
    _backend = build_runtime_backend()

  return _backend.handle(event)
