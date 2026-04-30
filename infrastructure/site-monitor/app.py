from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

DEFAULT_SITE_URL = 'https://townofwiley.gov'
DEFAULT_ADMIN_PATH = '/admin'
DEFAULT_PUBLIC_PAGE_MARKERS = {
  'homepage': ('Town of Wiley',),
  'weather': ('National Weather Service forecast for', 'Active watches, warnings, and advisories'),
  'notices': ('Town notices', 'News & Announcements'),
  'meetings': ('Meetings and calendar', 'Public calendar'),
  'services': ('Resident services', 'Pay utility bill'),
  'records': ('Records and documents', 'Public Document Hub'),
  'businesses': ('Wiley Community Business Directory', 'Search local businesses'),
  'news': ('Town News and Announcements', 'Regional coverage'),
  'contact': ('Contact Town Hall', 'Residents should always know where to go next'),
  'accessibility': ('Accessibility statement', 'Report an accessibility barrier'),
  'documents': ('Public Document Hub', 'Stable public destinations for meetings, finance records, and code references'),
  'admin': ('Open Amplify Studio Data Manager', 'CMS Connection Status'),
}
DEFAULT_PUBLIC_PAGE_PATHS = {
  'homepage': '/',
  'weather': '/weather',
  'notices': '/notices',
  'meetings': '/meetings',
  'services': '/services',
  'records': '/records',
  'businesses': '/businesses',
  'news': '/news',
  'contact': '/contact',
  'accessibility': '/accessibility',
  'documents': '/documents',
  'admin': DEFAULT_ADMIN_PATH,
}
DEFAULT_CMS_QUERY = 'query TownWebsiteHealth { listSiteSettings(limit: 1) { items { id } } }'
DEFAULT_RECIPIENT_EMAIL = 'bigessfour@gmail.com'
DEFAULT_SENDER_EMAIL = 'alerts@townofwiley.gov'
DEFAULT_SENDER_NAME = 'Town of Wiley Alerts'
DEFAULT_MONITOR_NAME = 'TownOfWileySiteMonitor'
DEFAULT_STATE_TABLE_NAME = 'TownOfWileyDeveloperMonitorState'
DEFAULT_USER_AGENT = 'TownOfWileySiteMonitor/1.0 (contact: bigessfour@gmail.com)'


def _serialize_dynamo_value(value: Any) -> dict[str, Any]:
  if value is None:
    return {'NULL': True}
  if isinstance(value, bool):
    return {'BOOL': value}
  if isinstance(value, (int, float)):
    return {'N': str(value)}
  if isinstance(value, str):
    return {'S': value}
  if isinstance(value, dict):
    return {'M': {key: _serialize_dynamo_value(subvalue) for key, subvalue in value.items()}}
  if isinstance(value, list):
    return {'L': [_serialize_dynamo_value(item) for item in value]}
  raise TypeError(f'Unsupported DynamoDB value type: {type(value)!r}')


def _deserialize_dynamo_value(value: dict[str, Any]) -> Any:
  if 'S' in value:
    return value['S']
  if 'N' in value:
    number = value['N']
    return float(number) if '.' in number or 'e' in number.lower() else int(number)
  if 'BOOL' in value:
    return bool(value['BOOL'])
  if 'NULL' in value:
    return None
  if 'M' in value:
    return {key: _deserialize_dynamo_value(subvalue) for key, subvalue in value['M'].items()}
  if 'L' in value:
    return [_deserialize_dynamo_value(item) for item in value['L']]
  raise TypeError(f'Unsupported DynamoDB attribute value: {value!r}')
@dataclass(frozen=True)
class AppConfig:
  site_url: str
  admin_url: str
  cms_endpoint: str
  cms_api_key: str
  notification_recipient: str
  notification_sender: str
  notification_sender_name: str
  monitor_name: str
  user_agent: str


@dataclass(frozen=True)
class ProbeResult:
  name: str
  url: str
  ok: bool
  status_code: int | None
  detail: str
  response_excerpt: str = ''


class StateStore(Protocol):
  def load_state(self, monitor_name: str) -> dict[str, Any] | None:
    ...

  def save_state(self, item: dict[str, Any]) -> None:
    ...


class Mailer(Protocol):
  def send_message(self, subject: str, body: str) -> None:
    ...


class Fetcher(Protocol):
  def __call__(self, request: Request, timeout: int = ...) -> Any:
    ...


class MemoryStateStore:
  def __init__(self) -> None:
    self._items: dict[str, dict[str, Any]] = {}

  def load_state(self, monitor_name: str) -> dict[str, Any] | None:
    item = self._items.get(monitor_name)
    return dict(item) if item else None

  def save_state(self, item: dict[str, Any]) -> None:
    self._items[item['monitorName']] = dict(item)


class MemoryMailer:
  def __init__(self) -> None:
    self.messages: list[dict[str, str]] = []

  def send_message(self, subject: str, body: str) -> None:
    self.messages.append({'subject': subject, 'body': body})


class DynamoStateStore:
  def __init__(self, table_name: str, table: Any) -> None:
    self._table_name = table_name
    self._table = table

  def load_state(self, monitor_name: str) -> dict[str, Any] | None:
    response = self._table.get_item(TableName=self._table_name, Key={'monitorName': _serialize_dynamo_value(monitor_name)})
    item = response.get('Item')
    return {key: _deserialize_dynamo_value(value) for key, value in item.items()} if item else None

  def save_state(self, item: dict[str, Any]) -> None:
    self._table.put_item(TableName=self._table_name, Item={key: _serialize_dynamo_value(value) for key, value in item.items()})


class SesMailer:
  def __init__(self, sender_email: str, sender_name: str, recipient_email: str, ses_client: Any) -> None:
    self._sender_email = sender_email
    self._sender_name = sender_name
    self._recipient_email = recipient_email
    self._ses_client = ses_client

  def send_message(self, subject: str, body: str) -> None:
    if not self._sender_email:
      raise RuntimeError('ALERT_SENDER_EMAIL must be configured before notifications can be sent.')

    self._ses_client.send_email(
      FromEmailAddress=f'{self._sender_name} <{self._sender_email}>',
      Destination={'ToAddresses': [self._recipient_email]},
      Content={
        'Simple': {
          'Subject': {'Data': subject},
          'Body': {'Text': {'Data': body}},
        },
      },
    )


class TownSiteMonitor:
  def __init__(
    self,
    config: AppConfig,
    state_store: StateStore,
    mailer: Mailer,
    fetcher: Fetcher = urlopen,
  ) -> None:
    self._config = config
    self._state_store = state_store
    self._mailer = mailer
    self._fetcher = fetcher

  def handle(self, event: dict[str, Any]) -> dict[str, Any]:
    if is_http_event(event):
      return self._handle_http_event(event)

    return self._handle_monitor_run()

  def _handle_http_event(self, event: dict[str, Any]) -> dict[str, Any]:
    method = request_method(event)

    if method != 'GET':
      return json_response(405, {'ok': False, 'message': 'Method not allowed.'})

    result = self._handle_monitor_run(send_email=False)
    status_code = 200 if result['status'] == 'healthy' else 503
    return json_response(status_code, result)

  def _handle_monitor_run(self, send_email: bool = True) -> dict[str, Any]:
    checked_at = utc_now_iso()
    results = self.run_checks()
    healthy = all(result.ok for result in results)
    incident_hash = build_incident_hash(results)
    previous_state = self._state_store.load_state(self._config.monitor_name) or {}
    previous_status = str(previous_state.get('status', '')).strip().lower()
    previous_hash = str(previous_state.get('incidentHash', '')).strip()

    current_state = {
      'monitorName': self._config.monitor_name,
      'status': 'healthy' if healthy else 'unhealthy',
      'incidentHash': incident_hash if not healthy else '',
      'lastCheckedAt': checked_at,
      'lastResultSummary': summarize_results(results),
    }

    if healthy:
      current_state['lastHealthyAt'] = checked_at
      if send_email and previous_status == 'unhealthy':
        self._mailer.send_message(
          subject=f'[Town of Wiley] Recovery: {self._config.site_url} is healthy again',
          body=build_recovery_message(self._config, checked_at, results, previous_state),
        )
    else:
      current_state['lastUnhealthyAt'] = checked_at
      if send_email and (previous_status != 'unhealthy' or previous_hash != incident_hash):
        self._mailer.send_message(
          subject=build_alert_subject(results),
          body=build_alert_message(self._config, checked_at, results, previous_state),
        )

    self._state_store.save_state(current_state)

    return {
      'ok': healthy,
      'status': 'healthy' if healthy else 'unhealthy',
      'checkedAt': checked_at,
      'siteUrl': self._config.site_url,
      'results': [probe_result_to_dict(result) for result in results],
    }

  def run_checks(self) -> list[ProbeResult]:
    site_url = self._config.site_url.rstrip('/')
    checks = [
      self._probe_html(name, site_url + path, ())
      for name, path in DEFAULT_PUBLIC_PAGE_PATHS.items()
    ]

    if self._config.cms_endpoint and self._config.cms_api_key:
      checks.append(self._probe_cms())

    return checks

  def _probe_html(self, name: str, url: str, required_markers: tuple[str, ...]) -> ProbeResult:
    request = Request(
      url,
      headers={
        'user-agent': self._config.user_agent,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      method='GET',
    )

    try:
      with self._fetcher(request, timeout=15) as response:
        status_code = getattr(response, 'status', None) or response.getcode()
        body = response.read().decode('utf-8', errors='replace')
    except HTTPError as error:
      body = _read_error_body(error)
      return ProbeResult(
        name=name,
        url=url,
        ok=False,
        status_code=error.code,
        detail=f'HTTP {error.code}',
        response_excerpt=excerpt_text(body),
      )
    except URLError as error:
      return ProbeResult(
        name=name,
        url=url,
        ok=False,
        status_code=None,
        detail=str(error.reason or error),
      )

    missing_markers = [marker for marker in required_markers if marker not in body]
    if status_code != 200:
      return ProbeResult(
        name=name,
        url=url,
        ok=False,
        status_code=status_code,
        detail=f'HTTP {status_code}',
        response_excerpt=excerpt_text(body),
      )

    if missing_markers:
      return ProbeResult(
        name=name,
        url=url,
        ok=False,
        status_code=status_code,
        detail=f'missing expected markers: {", ".join(missing_markers)}',
        response_excerpt=excerpt_text(body),
      )

    return ProbeResult(
      name=name,
      url=url,
      ok=True,
      status_code=status_code,
      detail='ok',
      response_excerpt=excerpt_text(body),
    )

  def _probe_cms(self) -> ProbeResult:
    payload = json.dumps({'query': DEFAULT_CMS_QUERY}).encode('utf-8')
    request = Request(
      self._config.cms_endpoint,
      data=payload,
      headers={
        'content-type': 'application/json; charset=utf-8',
        'x-api-key': self._config.cms_api_key,
        'user-agent': self._config.user_agent,
      },
      method='POST',
    )

    try:
      with self._fetcher(request, timeout=15) as response:
        status_code = getattr(response, 'status', None) or response.getcode()
        body = response.read().decode('utf-8', errors='replace')
    except HTTPError as error:
      body = _read_error_body(error)
      return ProbeResult(
        name='cms-api',
        url=self._config.cms_endpoint,
        ok=False,
        status_code=error.code,
        detail=f'HTTP {error.code}',
        response_excerpt=excerpt_text(body),
      )
    except URLError as error:
      return ProbeResult(
        name='cms-api',
        url=self._config.cms_endpoint,
        ok=False,
        status_code=None,
        detail=str(error.reason or error),
      )

    if status_code != 200:
      return ProbeResult(
        name='cms-api',
        url=self._config.cms_endpoint,
        ok=False,
        status_code=status_code,
        detail=f'HTTP {status_code}',
        response_excerpt=excerpt_text(body),
      )

    try:
      payload_json = json.loads(body or '{}')
    except json.JSONDecodeError:
      return ProbeResult(
        name='cms-api',
        url=self._config.cms_endpoint,
        ok=False,
        status_code=status_code,
        detail='invalid JSON response',
        response_excerpt=excerpt_text(body),
      )

    errors = payload_json.get('errors') or []
    if errors:
      return ProbeResult(
        name='cms-api',
        url=self._config.cms_endpoint,
        ok=False,
        status_code=status_code,
        detail='GraphQL returned errors',
        response_excerpt=excerpt_text(json.dumps(errors, indent=2)),
      )

    return ProbeResult(
      name='cms-api',
      url=self._config.cms_endpoint,
      ok=True,
      status_code=status_code,
      detail='ok',
      response_excerpt=excerpt_text(body),
    )


def build_alert_subject(results: list[ProbeResult]) -> str:
  failing_names = ', '.join(result.name for result in results if not result.ok)
  return f'[Town of Wiley] Alert: {failing_names} needs attention'


def build_alert_message(
  config: AppConfig,
  checked_at: str,
  results: list[ProbeResult],
  previous_state: dict[str, Any],
) -> str:
  lines = [
    'Town of Wiley site monitor detected a problem.',
    '',
    f'Checked at: {checked_at}',
    f'Site: {config.site_url}',
    f'Public route coverage: {", ".join(DEFAULT_PUBLIC_PAGE_PATHS.keys())}',
    f'CMS endpoint: {config.cms_endpoint or "not configured"}',
    '',
    'Failures:',
  ]

  for result in results:
    if result.ok:
      continue

    status_label = f'HTTP {result.status_code}' if result.status_code is not None else 'no HTTP status'
    lines.append(f'- {result.name}: {status_label} ({result.detail})')
    if result.response_excerpt:
      lines.append(f'  Response excerpt: {result.response_excerpt}')

  lines.extend(
    [
      '',
      'Passing checks:',
    ],
  )

  for result in results:
    if result.ok:
      lines.append(f'- {result.name}: OK ({result.status_code})')

  if previous_state:
    lines.extend(
      [
        '',
        'Previous state:',
        f'- status: {previous_state.get("status", "unknown")}',
        f'- last checked: {previous_state.get("lastCheckedAt", "unknown")}',
      ],
    )

  return '\n'.join(lines)


def build_recovery_message(
  config: AppConfig,
  checked_at: str,
  results: list[ProbeResult],
  previous_state: dict[str, Any],
) -> str:
  lines = [
    'Town of Wiley site monitor recovered.',
    '',
    f'Checked at: {checked_at}',
    f'Site: {config.site_url}',
    f'Public route coverage: {", ".join(DEFAULT_PUBLIC_PAGE_PATHS.keys())}',
    '',
    'Healthy checks:',
  ]

  for result in results:
    if result.ok:
      lines.append(f'- {result.name}: OK ({result.status_code})')

  if previous_state:
    lines.extend(
      [
        '',
        'Previous incident:',
        f'- status: {previous_state.get("status", "unknown")}',
        f'- last checked: {previous_state.get("lastCheckedAt", "unknown")}',
      ],
    )

  return '\n'.join(lines)


def build_incident_hash(results: list[ProbeResult]) -> str:
  payload = [
    {
      'name': result.name,
      'ok': result.ok,
      'statusCode': result.status_code,
      'detail': result.detail,
      'responseExcerpt': result.response_excerpt,
    }
    for result in results
  ]
  encoded = json.dumps(payload, sort_keys=True).encode('utf-8')
  return hashlib.sha256(encoded).hexdigest()


def summarize_results(results: list[ProbeResult]) -> str:
  failing = [result.name for result in results if not result.ok]
  if failing:
    return f'{len(failing)} checks failed: {", ".join(failing)}'

  return f'{len(results)} checks passed'


def probe_result_to_dict(result: ProbeResult) -> dict[str, Any]:
  return {
    'name': result.name,
    'url': result.url,
    'ok': result.ok,
    'statusCode': result.status_code,
    'detail': result.detail,
    'responseExcerpt': result.response_excerpt,
  }


def json_response(status_code: int, body: dict[str, Any]) -> dict[str, Any]:
  return {
    'statusCode': status_code,
    'headers': {'content-type': 'application/json; charset=utf-8'},
    'body': json.dumps(body),
  }


def is_http_event(event: dict[str, Any]) -> bool:
  return bool(event.get('requestContext', {}).get('http', {}).get('method'))


def request_method(event: dict[str, Any]) -> str:
  return str(event.get('requestContext', {}).get('http', {}).get('method', '')).upper()


def utc_now_iso() -> str:
  return datetime.now(UTC).isoformat()


def excerpt_text(value: str, limit: int = 300) -> str:
  compact = ' '.join(value.split())
  return compact[:limit]


def _read_error_body(error: HTTPError) -> str:
  try:
    if error.fp is None:
      return ''
    return error.fp.read().decode('utf-8', errors='replace')
  except Exception:
    return ''


def build_runtime_monitor() -> TownSiteMonitor:
  aws_region = os.environ.get('AWS_REGION', '').strip()
  state_table_region = os.environ.get('SITE_MONITOR_STATE_TABLE_REGION', '').strip() or aws_region
  state_table_name = os.environ.get('SITE_MONITOR_STATE_TABLE_NAME', DEFAULT_STATE_TABLE_NAME).strip() or DEFAULT_STATE_TABLE_NAME

  config = AppConfig(
    site_url=os.environ.get('SITE_URL', DEFAULT_SITE_URL).strip() or DEFAULT_SITE_URL,
    admin_url=os.environ.get('ADMIN_URL', '').strip() or urljoin(
      os.environ.get('SITE_URL', DEFAULT_SITE_URL).strip().rstrip('/') + '/',
      DEFAULT_ADMIN_PATH.lstrip('/'),
    ),
    cms_endpoint=os.environ.get('APPSYNC_CMS_ENDPOINT', '').strip(),
    cms_api_key=os.environ.get('APPSYNC_CMS_API_KEY', '').strip(),
    notification_recipient=os.environ.get('ALERT_RECIPIENT_EMAIL', DEFAULT_RECIPIENT_EMAIL).strip()
    or DEFAULT_RECIPIENT_EMAIL,
    notification_sender=os.environ.get('ALERT_SENDER_EMAIL', DEFAULT_SENDER_EMAIL).strip()
    or DEFAULT_SENDER_EMAIL,
    notification_sender_name=os.environ.get('ALERT_SENDER_NAME', DEFAULT_SENDER_NAME).strip()
    or DEFAULT_SENDER_NAME,
    monitor_name=os.environ.get('MONITOR_NAME', DEFAULT_MONITOR_NAME).strip() or DEFAULT_MONITOR_NAME,
    user_agent=os.environ.get('SITE_MONITOR_USER_AGENT', DEFAULT_USER_AGENT).strip() or DEFAULT_USER_AGENT,
  )

  boto3 = __import__('boto3')
  dynamodb_kwargs: dict[str, str] = {}
  ses_kwargs: dict[str, str] = {}

  if state_table_region:
    dynamodb_kwargs['region_name'] = state_table_region

  if aws_region:
    ses_kwargs['region_name'] = aws_region

  return TownSiteMonitor(
    config=config,
    state_store=DynamoStateStore(state_table_name, boto3.client('dynamodb', **dynamodb_kwargs)),
    mailer=SesMailer(
      sender_email=config.notification_sender,
      sender_name=config.notification_sender_name,
      recipient_email=config.notification_recipient,
      ses_client=boto3.client('sesv2', **ses_kwargs),
    ),
  )


def handler(event: dict[str, Any], _context: Any = None) -> dict[str, Any]:
  return build_runtime_monitor().handle(event)
