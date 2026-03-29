from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass
from email import policy
from email.message import EmailMessage
from email.parser import BytesParser
from email.utils import formataddr, getaddresses, parseaddr
from typing import Any, Iterable, Protocol
from urllib.parse import unquote_plus


@dataclass(frozen=True)
class AppConfig:
  alias_table: str
  alias_table_region: str
  forwarder_from: str
  alias_domain: str
  ses_send_region: str


@dataclass(frozen=True)
class EmailAliasRecord:
  alias_address: str
  destination_address: str
  active: bool
  display_name: str = ''
  role_label: str = ''


@dataclass(frozen=True)
class RouteResult:
  forwarded: bool
  alias_address: str | None
  destination_address: str | None
  reason: str


class AliasDirectory(Protocol):
  def find_first_active_alias(self, candidate_addresses: Iterable[str]) -> EmailAliasRecord | None:
    ...


class MailObjectStore(Protocol):
  def get_object_bytes(self, bucket_name: str, object_key: str) -> bytes:
    ...


class MailForwarder(Protocol):
  def forward(self, alias: EmailAliasRecord, raw_message: bytes, parsed_message: EmailMessage) -> None:
    ...


def json_response(status_code: int, body: dict[str, Any]) -> dict[str, Any]:
  return {
    'statusCode': status_code,
    'headers': {'content-type': 'application/json; charset=utf-8'},
    'body': json.dumps(body),
  }


def normalize_email_address(value: str | None) -> str:
  if not value:
    return ''

  return parseaddr(value)[1].strip().lower()


def unique_addresses(values: Iterable[str]) -> list[str]:
  seen: set[str] = set()
  ordered: list[str] = []

  for value in values:
    if not value or value in seen:
      continue

    seen.add(value)
    ordered.append(value)

  return ordered


def extract_candidate_recipients(message: EmailMessage, alias_domain: str) -> list[str]:
  candidate_headers = [
    'X-Original-To',
    'Delivered-To',
    'Envelope-To',
    'To',
    'Cc',
    'Resent-To',
    'Resent-Cc',
  ]
  addresses: list[str] = []
  normalized_domain = alias_domain.lower().lstrip('@')

  for header_name in candidate_headers:
    header_values = message.get_all(header_name, [])
    for _, address in getaddresses(header_values):
      normalized_address = normalize_email_address(address)
      if normalized_address.endswith(f'@{normalized_domain}'):
        addresses.append(normalized_address)

  return unique_addresses(addresses)


def build_forward_email(
  alias: EmailAliasRecord,
  raw_message: bytes,
  parsed_message: EmailMessage,
  forwarder_from: str,
) -> EmailMessage:
  forward_message = EmailMessage()
  original_subject = parsed_message.get('Subject', '').strip() or alias.alias_address
  original_sender = parsed_message.get('From', '').strip() or 'unknown sender'
  reply_to_address = normalize_email_address(parsed_message.get('Reply-To')) or normalize_email_address(
    original_sender,
  )

  forward_message['Subject'] = f'Fwd: {original_subject}'
  forward_message['From'] = formataddr((alias.display_name or 'Town of Wiley Mail', forwarder_from))
  forward_message['To'] = alias.destination_address
  forward_message['X-Town-Alias'] = alias.alias_address

  if alias.role_label:
    forward_message['X-Town-Role'] = alias.role_label

  if reply_to_address:
    forward_message['Reply-To'] = reply_to_address

  forward_message.set_content(
    '\n'.join(
      [
        'Town of Wiley alias forward',
        f'Alias address: {alias.alias_address}',
        f'Forward destination: {alias.destination_address}',
        f'Original from: {original_sender}',
        f'Original subject: {original_subject}',
        '',
        'The original message is attached as original-message.eml.',
      ],
    ),
  )
  forward_message.add_attachment(
    raw_message,
    maintype='message',
    subtype='rfc822',
    filename='original-message.eml',
  )

  return forward_message


class DynamoDbAliasDirectory:
  def __init__(self, table_name: str, dynamodb_client: Any) -> None:
    self._table_name = table_name
    self._dynamodb_client = dynamodb_client

  def find_first_active_alias(self, candidate_addresses: Iterable[str]) -> EmailAliasRecord | None:
    for candidate_address in candidate_addresses:
      response = self._dynamodb_client.scan(
        TableName=self._table_name,
        FilterExpression='aliasAddress = :aliasAddress',
        ExpressionAttributeValues={':aliasAddress': {'S': candidate_address}},
      )
      items = response.get('Items') or []

      for item in items:
        record = self._map_item(item)
        if record.active:
          return record

    return None

  def _map_item(self, item: dict[str, Any]) -> EmailAliasRecord:
    return EmailAliasRecord(
      alias_address=item.get('aliasAddress', {}).get('S', '').strip().lower(),
      destination_address=item.get('destinationAddress', {}).get('S', '').strip().lower(),
      active=bool(item.get('active', {}).get('BOOL', False)),
      display_name=item.get('displayName', {}).get('S', '').strip(),
      role_label=item.get('roleLabel', {}).get('S', '').strip(),
    )


class S3MailObjectStore:
  def __init__(self, s3_client: Any) -> None:
    self._s3_client = s3_client

  def get_object_bytes(self, bucket_name: str, object_key: str) -> bytes:
    response = self._s3_client.get_object(Bucket=bucket_name, Key=object_key)
    return response['Body'].read()


class SesMailForwarder:
  def __init__(self, forwarder_from: str, ses_client: Any) -> None:
    self._forwarder_from = forwarder_from
    self._ses_client = ses_client

  def forward(self, alias: EmailAliasRecord, raw_message: bytes, parsed_message: EmailMessage) -> None:
    forward_message = build_forward_email(alias, raw_message, parsed_message, self._forwarder_from)
    self._ses_client.send_raw_email(
      Source=self._forwarder_from,
      Destinations=[alias.destination_address],
      RawMessage={'Data': forward_message.as_bytes()},
    )


class EmailAliasRouter:
  def __init__(
    self,
    config: AppConfig,
    alias_directory: AliasDirectory,
    object_store: MailObjectStore,
    mail_forwarder: MailForwarder,
  ) -> None:
    self._config = config
    self._alias_directory = alias_directory
    self._object_store = object_store
    self._mail_forwarder = mail_forwarder

  def handle(self, event: dict[str, Any]) -> dict[str, Any]:
    if event.get('requestContext', {}).get('http', {}).get('method') == 'GET':
      return json_response(
        200,
        {
          'ok': True,
          'service': 'town-email-alias-router',
          'aliasDomain': self._config.alias_domain,
        },
      )

    results: list[RouteResult] = []

    for record in event.get('Records', []):
      if record.get('eventSource') != 'aws:s3':
        continue

      bucket_name = record['s3']['bucket']['name']
      object_key = unquote_plus(record['s3']['object']['key'])
      raw_message = self._object_store.get_object_bytes(bucket_name, object_key)
      results.append(self.route_raw_message(raw_message))

    return {
      'processed': len(results),
      'forwarded': sum(1 for result in results if result.forwarded),
      'results': [asdict(result) for result in results],
    }

  def route_raw_message(self, raw_message: bytes) -> RouteResult:
    parsed_message = BytesParser(policy=policy.default).parsebytes(raw_message)
    candidate_recipients = extract_candidate_recipients(parsed_message, self._config.alias_domain)
    alias_record = self._alias_directory.find_first_active_alias(candidate_recipients)

    if not alias_record:
      return RouteResult(
        forwarded=False,
        alias_address=None,
        destination_address=None,
        reason='no_active_alias_match',
      )

    self._mail_forwarder.forward(alias_record, raw_message, parsed_message)

    return RouteResult(
      forwarded=True,
      alias_address=alias_record.alias_address,
      destination_address=alias_record.destination_address,
      reason='forwarded',
    )


def build_runtime_router() -> EmailAliasRouter:
  config = AppConfig(
    alias_table=read_required_env('EMAIL_ALIAS_TABLE'),
    alias_table_region=os.environ.get('EMAIL_ALIAS_TABLE_REGION', '').strip(),
    forwarder_from=read_required_env('FORWARDER_FROM'),
    alias_domain=os.environ.get('ALIAS_DOMAIN', 'townofwiley.gov').strip().lower() or 'townofwiley.gov',
    ses_send_region=os.environ.get('SES_SEND_REGION', '').strip(),
  )

  boto3 = __import__('boto3')

  dynamodb_kwargs: dict[str, str] = {}
  ses_kwargs: dict[str, str] = {}

  if config.alias_table_region:
    dynamodb_kwargs['region_name'] = config.alias_table_region

  if config.ses_send_region:
    ses_kwargs['region_name'] = config.ses_send_region

  return EmailAliasRouter(
    config=config,
    alias_directory=DynamoDbAliasDirectory(
      table_name=config.alias_table,
      dynamodb_client=boto3.client('dynamodb', **dynamodb_kwargs),
    ),
    object_store=S3MailObjectStore(boto3.client('s3')),
    mail_forwarder=SesMailForwarder(config.forwarder_from, boto3.client('ses', **ses_kwargs)),
  )


def read_required_env(name: str) -> str:
  value = os.environ.get(name, '').strip()
  if value:
    return value

  raise RuntimeError(f'Missing required environment variable: {name}')


def handler(event: dict[str, Any], _context: Any = None) -> dict[str, Any]:
  return build_runtime_router().handle(event)
