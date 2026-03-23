from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

REPO_ROOT = Path(__file__).resolve().parent.parent
SECRETS_PATH = REPO_ROOT / 'secrets' / 'local' / 'user-secrets.json'
BACKEND_DIR = REPO_ROOT / 'infrastructure' / 'severe-weather-signup'


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description='Deploy the Town of Wiley severe weather signup backend.')
  parser.add_argument('--function-name', default='TownOfWileySevereWeatherBackend')
  parser.add_argument('--role-name', default='TownOfWileySevereWeatherRole')
  parser.add_argument('--subscriptions-table', default='TownOfWileySevereWeatherSubscriptions')
  parser.add_argument('--deliveries-table', default='TownOfWileySevereWeatherDeliveries')
  parser.add_argument('--rule-name', default='TownOfWileySevereWeatherPoller')
  parser.add_argument('--branch-name', default='main')
  parser.add_argument('--allowed-zip-code', default='81092')
  parser.add_argument('--alert-zone-code', default='COZ098')
  parser.add_argument('--schedule-expression', default='rate(5 minutes)')
  parser.add_argument('--sender-email', default='')
  parser.add_argument('--notification-sender-name', default='Town of Wiley Alerts')
  parser.add_argument('--nws-user-agent', default='')
  parser.add_argument('--nws-api-key', default='')
  parser.add_argument('--runtime', default='python3.13')
  parser.add_argument('--app-id', default='')
  parser.add_argument('--skip-amplify-update', action='store_true')
  parser.add_argument('--skip-amplify-release', action='store_true')
  return parser.parse_args()


def load_local_secrets() -> dict[str, Any]:
  if not SECRETS_PATH.exists():
    return {}

  return json.loads(SECRETS_PATH.read_text(encoding='utf-8'))


def ensure_env_from_secrets(secrets: dict[str, Any]) -> None:
  aws_secrets = secrets.get('aws', {})

  if not os.environ.get('AWS_ACCESS_KEY_ID') and aws_secrets.get('accessKeyId'):
    os.environ['AWS_ACCESS_KEY_ID'] = aws_secrets['accessKeyId']

  if not os.environ.get('AWS_SECRET_ACCESS_KEY') and aws_secrets.get('secretAccessKey'):
    os.environ['AWS_SECRET_ACCESS_KEY'] = aws_secrets['secretAccessKey']

  if not os.environ.get('AWS_SESSION_TOKEN') and aws_secrets.get('sessionToken'):
    os.environ['AWS_SESSION_TOKEN'] = aws_secrets['sessionToken']

  if not os.environ.get('AWS_REGION') and aws_secrets.get('region'):
    os.environ['AWS_REGION'] = aws_secrets['region']


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


def package_backend() -> Path:
  temp_dir = Path(tempfile.mkdtemp(prefix='townofwiley-severe-weather-'))
  archive_path = temp_dir / 'severe-weather-signup.zip'

  with ZipFile(archive_path, 'w', ZIP_DEFLATED) as archive:
    for path in BACKEND_DIR.rglob('*.py'):
      archive.write(path, path.relative_to(BACKEND_DIR))

  return archive_path


def ensure_table(table_name: str, key_name: str) -> str:
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
        f'AttributeName={key_name},AttributeType=S',
        '--key-schema',
        f'AttributeName={key_name},KeyType=HASH',
        '--billing-mode',
        'PAY_PER_REQUEST',
      ],
    )
    run_aws(['dynamodb', 'wait', 'table-exists', '--table-name', table_name], expect_json=False)
    table = run_aws(['dynamodb', 'describe-table', '--table-name', table_name])

    if table_name.endswith('Deliveries'):
      try:
        run_aws(
          [
            'dynamodb',
            'update-time-to-live',
            '--table-name',
            table_name,
            '--time-to-live-specification',
            'Enabled=true,AttributeName=expiresAtEpoch',
          ],
        )
      except RuntimeError:
        pass

    return table['Table']['TableArn']


def ensure_role(role_name: str, subscriptions_arn: str, deliveries_arn: str) -> str:
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
        'Action': ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:Scan', 'dynamodb:UpdateItem'],
        'Resource': [subscriptions_arn, deliveries_arn],
      },
      {
        'Effect': 'Allow',
        'Action': ['ses:SendEmail', 'ses:SendRawEmail', 'sesv2:SendEmail'],
        'Resource': '*',
      },
      {
        'Effect': 'Allow',
        'Action': ['sns:Publish'],
        'Resource': '*',
      },
      {
        'Effect': 'Allow',
        'Action': ['translate:TranslateText'],
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
      ['iam', 'attach-role-policy', '--role-name', role_name, '--policy-arn', 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
      expect_json=False,
    )
    time.sleep(10)

  with tempfile.NamedTemporaryFile('w', suffix='-policy.json', delete=False, encoding='utf-8') as file_handle:
    json.dump(inline_policy, file_handle)
    policy_path = file_handle.name

  run_aws(
    ['iam', 'put-role-policy', '--role-name', role_name, '--policy-name', 'TownOfWileySevereWeatherPolicy', '--policy-document', f'file://{policy_path}'],
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


def ensure_function_url(function_name: str) -> str:
  cors = json.dumps(
    {
      'AllowOrigins': ['*'],
      'AllowMethods': ['GET', 'POST'],
      'AllowHeaders': ['content-type'],
    },
  )

  try:
    details = run_aws(['lambda', 'get-function-url-config', '--function-name', function_name])
    function_url = details['FunctionUrl']
    run_aws(['lambda', 'update-function-url-config', '--function-name', function_name, '--auth-type', 'NONE', '--cors', cors])
  except RuntimeError:
    details = run_aws(['lambda', 'create-function-url-config', '--function-name', function_name, '--auth-type', 'NONE', '--cors', cors])
    function_url = details['FunctionUrl']

  try:
    run_aws(
      [
        'lambda',
        'add-permission',
        '--function-name',
        function_name,
        '--statement-id',
        'FunctionUrlPublicInvoke',
        '--action',
        'lambda:InvokeFunctionUrl',
        '--principal',
        '*',
        '--function-url-auth-type',
        'NONE',
      ],
    )
  except RuntimeError as error:
    if 'already exists' not in str(error):
      raise

  try:
    run_aws(
      [
        'lambda',
        'add-permission',
        '--function-name',
        function_name,
        '--statement-id',
        'FunctionUrlPublicInvokeFunction',
        '--action',
        'lambda:InvokeFunction',
        '--principal',
        '*',
        '--invoked-via-function-url',
      ],
    )
  except RuntimeError as error:
    if 'already exists' not in str(error):
      raise

  return function_url


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
        'EventBridgeInvoke',
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

  run_aws(['events', 'put-targets', '--rule', rule_name, '--targets', json.dumps([{'Id': 'SevereWeatherBackend', 'Arn': function_arn}])])


def update_function_public_base_url(function_name: str, environment: dict[str, str], function_url: str) -> None:
  environment = dict(environment)
  environment['PUBLIC_API_BASE_URL'] = function_url.rstrip('/')
  run_aws(['lambda', 'update-function-configuration', '--function-name', function_name, '--environment', json.dumps({'Variables': environment})])


def merge_amplify_environment(app_id: str, branch_name: str, function_url: str) -> None:
  branch = run_aws(['amplify', 'get-branch', '--app-id', app_id, '--branch-name', branch_name])
  environment_variables = branch['branch'].get('environmentVariables', {})
  environment_variables['SEVERE_WEATHER_SIGNUP_API_ENDPOINT'] = function_url.rstrip('/')
  environment_variables['SEVERE_WEATHER_SIGNUP_ENABLED'] = 'true'

  run_aws(
    [
      'amplify',
      'update-branch',
      '--app-id',
      app_id,
      '--branch-name',
      branch_name,
      '--environment-variables',
      json.dumps(environment_variables),
    ],
  )


def start_amplify_release(app_id: str, branch_name: str) -> None:
  run_aws(['amplify', 'start-job', '--app-id', app_id, '--branch-name', branch_name, '--job-type', 'RELEASE'])


def check_ses_sender(sender_email: str) -> str:
  if not sender_email:
    return 'Email sender not configured; email confirmations will stay disabled until SENDER_EMAIL is set.'

  try:
    identity = run_aws(['sesv2', 'get-email-identity', '--email-identity', sender_email])
  except RuntimeError:
    domain = sender_email.split('@', 1)[1] if '@' in sender_email else ''

    if domain:
      try:
        domain_identity = run_aws(['sesv2', 'get-email-identity', '--email-identity', domain])
      except RuntimeError:
        return f'SES sender {sender_email} is not verified in this region yet.'

      if domain_identity.get('VerifiedForSendingStatus'):
        return f'SES sender {sender_email} can send through verified domain identity {domain}.'

      return f'SES sender {sender_email} exists under domain {domain}, but that domain is not verified for sending yet.'

    return f'SES sender {sender_email} is not verified in this region yet.'

  if identity.get('VerifiedForSendingStatus'):
    return f'SES sender {sender_email} is verified for sending.'

  return f'SES sender {sender_email} exists but is not verified for sending yet.'


def main() -> int:
  args = parse_args()
  secrets = load_local_secrets()
  ensure_env_from_secrets(secrets)

  if not os.environ.get('AWS_REGION'):
    raise RuntimeError('AWS_REGION is required before deployment can continue.')

  weather_secrets = secrets.get('weather', {})
  alert_signup_secrets = weather_secrets.get('alertSignup', {})
  nws_secrets = weather_secrets.get('nws', {})
  app_id = args.app_id or secrets.get('aws', {}).get('amplifyAppId', '')
  sender_email = args.sender_email or alert_signup_secrets.get('senderEmail', '')
  nws_user_agent = args.nws_user_agent or nws_secrets.get('userAgent', '')
  nws_api_key = args.nws_api_key or nws_secrets.get('apiKey', '')

  if not nws_user_agent:
    raise RuntimeError('NWS_USER_AGENT is required to deploy the scheduled alert poller.')

  archive_path = package_backend()
  subscriptions_arn = ensure_table(args.subscriptions_table, 'subscriptionId')
  deliveries_arn = ensure_table(args.deliveries_table, 'deliveryId')
  role_arn = ensure_role(args.role_name, subscriptions_arn, deliveries_arn)
  environment = {
    'SUBSCRIPTIONS_TABLE': args.subscriptions_table,
    'DELIVERIES_TABLE': args.deliveries_table,
    'SENDER_EMAIL': sender_email,
    'NOTIFICATION_SENDER_NAME': args.notification_sender_name,
    'ALLOWED_ZIP_CODE': args.allowed_zip_code,
    'ALERT_ZONE_CODE': args.alert_zone_code,
    'PUBLIC_API_BASE_URL': '',
    'NWS_USER_AGENT': nws_user_agent,
    'NWS_API_KEY': nws_api_key,
  }
  function_arn = ensure_lambda_function(args.function_name, role_arn, args.runtime, archive_path, environment)
  function_url = ensure_function_url(args.function_name)
  update_function_public_base_url(args.function_name, environment, function_url)
  ensure_schedule(args.rule_name, args.schedule_expression, args.function_name, function_arn)

  if not args.skip_amplify_update and app_id:
    merge_amplify_environment(app_id, args.branch_name, function_url)

  if not args.skip_amplify_release and app_id:
    start_amplify_release(app_id, args.branch_name)

  sender_status = check_ses_sender(sender_email)
  print(
    json.dumps(
      {
        'functionUrl': function_url,
        'functionName': args.function_name,
        'amplifyAppId': app_id,
        'branchName': args.branch_name,
        'senderStatus': sender_status,
      },
      indent=2,
    ),
  )
  return 0


if __name__ == '__main__':
  sys.exit(main())
