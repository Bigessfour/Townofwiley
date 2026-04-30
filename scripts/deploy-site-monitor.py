from __future__ import annotations

import argparse
import json
import os
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

REPO_ROOT = Path(__file__).resolve().parent.parent
RUNTIME_CONFIG_PATH = REPO_ROOT / 'public' / 'runtime-config.js'
BACKEND_DIR = REPO_ROOT / 'infrastructure' / 'site-monitor'


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description='Deploy the Town of Wiley developer site monitor.')
  parser.add_argument('--function-name', default='TownOfWileyDeveloperMonitor')
  parser.add_argument('--role-name', default='TownOfWileyDeveloperMonitorRole')
  parser.add_argument('--state-table', default='TownOfWileyDeveloperMonitorState')
  parser.add_argument('--rule-name', default='TownOfWileyDeveloperMonitorSchedule')
  parser.add_argument('--schedule-expression', default='rate(5 minutes)')
  parser.add_argument('--site-url', default='https://townofwiley.gov')
  parser.add_argument('--admin-url', default='')
  parser.add_argument('--recipient-email', default='bigessfour@gmail.com')
  parser.add_argument('--sender-email', default='alerts@townofwiley.gov')
  parser.add_argument('--sender-name', default='Town of Wiley Alerts')
  parser.add_argument('--monitor-name', default='TownOfWileySiteMonitor')
  parser.add_argument('--appsync-endpoint', default='')
  parser.add_argument('--appsync-api-key', default='')
  parser.add_argument('--state-table-region', default='')
  parser.add_argument('--runtime', default='python3.13')
  return parser.parse_args()


def run_aws(command: list[str], expect_json: bool = True) -> Any:
  process = subprocess.run(
    ['aws', *command],
    cwd=REPO_ROOT,
    check=False,
    capture_output=True,
    text=True,
  )

  if process.returncode != 0:
    raise RuntimeError(process.stderr.strip() or 'AWS CLI command failed.')

  output = process.stdout.strip()
  if not expect_json:
    return output

  return json.loads(output) if output else {}


def load_amplify_config() -> dict[str, str]:
  if not RUNTIME_CONFIG_PATH.exists():
    return {}

  runtime_config_text = RUNTIME_CONFIG_PATH.read_text(encoding='utf-8')
  prefix = 'window.__TOW_RUNTIME_CONFIG__ = '
  if prefix not in runtime_config_text:
    return {}

  payload_text = runtime_config_text.split(prefix, 1)[1].strip()
  if payload_text.endswith(';'):
    payload_text = payload_text[:-1].strip()

  payload = json.loads(payload_text)
  app_sync = payload.get('cms', {}).get('appSync', {})
  return {
    'endpoint': str(app_sync.get('apiEndpoint', '')).strip(),
    'apiKey': str(app_sync.get('apiKey', '')).strip(),
  }


def package_backend() -> Path:
  temp_dir = Path(tempfile.mkdtemp(prefix='townofwiley-site-monitor-'))
  archive_path = temp_dir / 'site-monitor.zip'

  with ZipFile(archive_path, 'w', ZIP_DEFLATED) as archive:
    for path in BACKEND_DIR.rglob('*.py'):
      archive.write(path, path.relative_to(BACKEND_DIR))

  return archive_path


def ensure_table(table_name: str) -> str:
  try:
    table = run_aws(['dynamodb', 'describe-table', '--table-name', table_name])
    return table['Table']['TableArn']
  except RuntimeError:
    run_aws(
      [
        'dynamodb',
        'create-table',
        '--table-name',
        table_name,
        '--attribute-definitions',
        'AttributeName=monitorName,AttributeType=S',
        '--key-schema',
        'AttributeName=monitorName,KeyType=HASH',
        '--billing-mode',
        'PAY_PER_REQUEST',
      ],
    )
    run_aws(['dynamodb', 'wait', 'table-exists', '--table-name', table_name], expect_json=False)
    table = run_aws(['dynamodb', 'describe-table', '--table-name', table_name])
    return table['Table']['TableArn']


def ensure_role(role_name: str, table_arn: str) -> str:
  trust_policy = {
    'Version': '2012-10-17',
    'Statement': [
      {
        'Effect': 'Allow',
        'Principal': {'Service': 'lambda.amazonaws.com'},
        'Action': 'sts:AssumeRole',
      },
    ],
  }
  inline_policy = {
    'Version': '2012-10-17',
    'Statement': [
      {
        'Effect': 'Allow',
        'Action': ['dynamodb:GetItem', 'dynamodb:PutItem'],
        'Resource': [table_arn],
      },
      {
        'Effect': 'Allow',
        'Action': ['ses:SendEmail', 'ses:SendRawEmail', 'sesv2:SendEmail'],
        'Resource': '*',
      },
    ],
  }

  try:
    role = run_aws(['iam', 'get-role', '--role-name', role_name])
    role_arn = role['Role']['Arn']
  except RuntimeError:
    with tempfile.NamedTemporaryFile('w', suffix='-trust.json', delete=False, encoding='utf-8') as file_handle:
      json.dump(trust_policy, file_handle)
      trust_path = file_handle.name

    role = run_aws(
      ['iam', 'create-role', '--role-name', role_name, '--assume-role-policy-document', f'file://{trust_path}'],
    )
    role_arn = role['Role']['Arn']
    run_aws(
      [
        'iam',
        'attach-role-policy',
        '--role-name',
        role_name,
        '--policy-arn',
        'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
      ],
      expect_json=False,
    )
    time.sleep(10)

  with tempfile.NamedTemporaryFile('w', suffix='-policy.json', delete=False, encoding='utf-8') as file_handle:
    json.dump(inline_policy, file_handle)
    policy_path = file_handle.name

  run_aws(
    [
      'iam',
      'put-role-policy',
      '--role-name',
      role_name,
      '--policy-name',
      'TownOfWileyDeveloperMonitorPolicy',
      '--policy-document',
      f'file://{policy_path}',
    ],
    expect_json=False,
  )
  return role_arn


def ensure_lambda_function(
  function_name: str,
  role_arn: str,
  runtime: str,
  archive_path: Path,
  environment: dict[str, str],
) -> str:
  try:
    details = run_aws(['lambda', 'get-function', '--function-name', function_name])
    run_aws(['lambda', 'update-function-code', '--function-name', function_name, '--zip-file', f'fileb://{archive_path}'])
    run_aws(['lambda', 'wait', 'function-updated-v2', '--function-name', function_name], expect_json=False)

    def update_configuration() -> None:
      run_aws(
        [
          'lambda',
          'update-function-configuration',
          '--function-name',
          function_name,
          '--handler',
          'index.handler',
          '--runtime',
          runtime,
          '--timeout',
          '60',
          '--memory-size',
          '256',
          '--role',
          role_arn,
          '--environment',
          json.dumps({'Variables': environment}),
        ],
      )

    run_aws(
      [
        'lambda',
        'wait',
        'function-updated-v2',
        '--function-name',
        function_name,
      ],
      expect_json=False,
    )
    try:
      update_configuration()
    except RuntimeError as error:
      if 'ResourceConflictException' not in str(error):
        raise

      run_aws(['lambda', 'wait', 'function-updated-v2', '--function-name', function_name], expect_json=False)
      update_configuration()
    return details['Configuration']['FunctionArn']
  except RuntimeError:
    details = run_aws(
      [
        'lambda',
        'create-function',
        '--function-name',
        function_name,
        '--runtime',
        runtime,
        '--role',
        role_arn,
        '--handler',
        'index.handler',
        '--timeout',
        '60',
        '--memory-size',
        '256',
        '--zip-file',
        f'fileb://{archive_path}',
        '--environment',
        json.dumps({'Variables': environment}),
      ],
    )
    return details['FunctionArn']


def ensure_schedule(rule_name: str, schedule_expression: str, function_name: str, function_arn: str) -> None:
  rule = run_aws(['events', 'put-rule', '--name', rule_name, '--schedule-expression', schedule_expression, '--state', 'ENABLED'])
  rule_arn = rule['RuleArn']

  try:
    run_aws(
      [
        'lambda',
        'add-permission',
        '--function-name',
        function_name,
        '--statement-id',
        'EventBridgeInvokeTownSiteMonitor',
        '--action',
        'lambda:InvokeFunction',
        '--principal',
        'events.amazonaws.com',
        '--source-arn',
        rule_arn,
      ],
    )
  except RuntimeError as error:
    if 'already exists' not in str(error):
      raise

  run_aws(['events', 'put-targets', '--rule', rule_name, '--targets', json.dumps([{'Id': 'TownSiteMonitor', 'Arn': function_arn}])])


def main() -> int:
  args = parse_args()
  amplify_config = load_amplify_config()
  appsync_endpoint = args.appsync_endpoint.strip() or amplify_config.get('endpoint', '')
  appsync_api_key = args.appsync_api_key.strip() or amplify_config.get('apiKey', '')

  if not appsync_endpoint or not appsync_api_key:
    raise RuntimeError('The AppSync CMS endpoint and API key are required before deployment can continue.')

  site_url = args.site_url.strip() or 'https://townofwiley.gov'
  admin_url = args.admin_url.strip() or f'{site_url.rstrip("/")}/admin'
  state_table_region = args.state_table_region.strip() or os.environ.get('AWS_REGION', '').strip()
  archive_path = package_backend()
  table_arn = ensure_table(args.state_table)
  role_arn = ensure_role(args.role_name, table_arn)
  function_arn = ensure_lambda_function(
    function_name=args.function_name,
    role_arn=role_arn,
    runtime=args.runtime,
    archive_path=archive_path,
    environment={
      'SITE_URL': site_url,
      'ADMIN_URL': admin_url,
      'APPSYNC_CMS_ENDPOINT': appsync_endpoint,
      'APPSYNC_CMS_API_KEY': appsync_api_key,
      'ALERT_RECIPIENT_EMAIL': args.recipient_email,
      'ALERT_SENDER_EMAIL': args.sender_email,
      'ALERT_SENDER_NAME': args.sender_name,
      'MONITOR_NAME': args.monitor_name,
      'SITE_MONITOR_STATE_TABLE_NAME': args.state_table,
      'SITE_MONITOR_STATE_TABLE_REGION': state_table_region,
    },
  )
  ensure_schedule(args.rule_name, args.schedule_expression, args.function_name, function_arn)

  print(
    json.dumps(
      {
        'functionArn': function_arn,
        'roleArn': role_arn,
        'stateTableArn': table_arn,
        'siteUrl': site_url,
        'adminUrl': admin_url,
        'recipientEmail': args.recipient_email,
        'monitorName': args.monitor_name,
      },
      indent=2,
    ),
  )
  return 0


if __name__ == '__main__':
  raise SystemExit(main())
