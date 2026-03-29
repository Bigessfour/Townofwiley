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
BACKEND_DIR = REPO_ROOT / 'infrastructure' / 'email-alias-router'


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(
    description='Deploy the Town of Wiley SES/S3/Lambda email alias router.',
  )
  parser.add_argument('--function-name', default='')
  parser.add_argument('--role-name', default='')
  parser.add_argument('--bucket-name', default='')
  parser.add_argument('--alias-table', default='')
  parser.add_argument('--alias-table-region', default='')
  parser.add_argument('--forwarder-from', default='')
  parser.add_argument('--send-region', default='')
  parser.add_argument('--alias-domain', default='townofwiley.gov')
  parser.add_argument('--ingress-region', default='')
  parser.add_argument('--receipt-rule-set', default='')
  parser.add_argument('--receipt-rule-name', default='')
  parser.add_argument('--receipt-recipients', default='')
  parser.add_argument('--receipt-prefix', default='')
  parser.add_argument('--runtime', default='python3.13')
  parser.add_argument('--skip-receipt-rule-setup', action='store_true')
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


def run_aws(command: list[str], expect_json: bool = True, region: str = '') -> Any:
  process = subprocess.run(
    ['aws', *( ['--region', region] if region else [] ), *command],
    cwd=REPO_ROOT,
    check=False,
    capture_output=True,
    text=True,
  )

  if process.returncode != 0:
    raise RuntimeError(process.stderr.strip() or process.stdout.strip() or 'AWS CLI command failed.')

  output = process.stdout.strip()

  if not expect_json:
    return output

  return json.loads(output) if output else {}


def resolve_value(cli_value: str, secret_value: Any, fallback: str = '') -> str:
  if isinstance(cli_value, str) and cli_value.strip():
    return cli_value.strip()

  if isinstance(secret_value, str) and secret_value.strip():
    return secret_value.strip()

  return fallback.strip()


def get_account_id(default_account_id: str, region: str) -> str:
  if default_account_id.strip():
    return default_account_id.strip()

  identity = run_aws(['sts', 'get-caller-identity'], region=region)
  return str(identity['Account'])


def package_backend() -> Path:
  temp_dir = Path(tempfile.mkdtemp(prefix='townofwiley-email-alias-'))
  archive_path = temp_dir / 'email-alias-router.zip'

  with ZipFile(archive_path, 'w', ZIP_DEFLATED) as archive:
    for path in BACKEND_DIR.rglob('*.py'):
      archive.write(path, path.relative_to(BACKEND_DIR))

  return archive_path


def ensure_bucket(bucket_name: str, region: str) -> str:
  try:
    run_aws(['s3api', 'head-bucket', '--bucket', bucket_name], expect_json=False, region=region)
  except RuntimeError:
    create_command = ['s3api', 'create-bucket', '--bucket', bucket_name]

    if region != 'us-east-1':
      create_command.extend(
        [
          '--create-bucket-configuration',
          json.dumps({'LocationConstraint': region}),
        ],
      )

    run_aws(create_command, region=region)
    run_aws(['s3api', 'wait', 'bucket-exists', '--bucket', bucket_name], expect_json=False, region=region)

  try:
    run_aws(
      [
        's3api',
        'put-public-access-block',
        '--bucket',
        bucket_name,
        '--public-access-block-configuration',
        json.dumps(
          {
            'BlockPublicAcls': True,
            'IgnorePublicAcls': True,
            'BlockPublicPolicy': True,
            'RestrictPublicBuckets': True,
          },
        ),
      ],
      expect_json=False,
      region=region,
    )
  except RuntimeError as error:
    print(
      f'Warning: could not apply bucket public-access block for {bucket_name}: {error}',
      file=sys.stderr,
    )

  run_aws(
    [
      's3api',
      'put-bucket-encryption',
      '--bucket',
      bucket_name,
      '--server-side-encryption-configuration',
      json.dumps(
        {
          'Rules': [
            {
              'ApplyServerSideEncryptionByDefault': {'SSEAlgorithm': 'AES256'},
            },
          ],
        },
      ),
    ],
    expect_json=False,
    region=region,
  )

  return f'arn:aws:s3:::{bucket_name}'


def ensure_bucket_policy(bucket_name: str, account_id: str, region: str) -> None:
  policy = {
    'Version': '2012-10-17',
    'Statement': [
      {
        'Sid': 'AllowSesPutObject',
        'Effect': 'Allow',
        'Principal': {'Service': 'ses.amazonaws.com'},
        'Action': ['s3:PutObject'],
        'Resource': [f'arn:aws:s3:::{bucket_name}/*'],
        'Condition': {'StringEquals': {'AWS:Referer': account_id}},
      },
    ],
  }

  run_aws(
    ['s3api', 'put-bucket-policy', '--bucket', bucket_name, '--policy', json.dumps(policy)],
    expect_json=False,
    region=region,
  )


def get_table_arn(table_name: str, region: str) -> str:
  table = run_aws(['dynamodb', 'describe-table', '--table-name', table_name], region=region)
  return table['Table']['TableArn']


def ensure_role(role_name: str, bucket_arn: str, alias_table_arn: str) -> str:
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
        'Action': ['s3:GetObject'],
        'Resource': [f'{bucket_arn}/*'],
      },
      {
        'Effect': 'Allow',
        'Action': ['s3:ListBucket'],
        'Resource': [bucket_arn],
      },
      {
        'Effect': 'Allow',
        'Action': ['dynamodb:Scan'],
        'Resource': [alias_table_arn],
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
      'TownOfWileyEmailAliasRouterPolicy',
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
  region: str,
) -> str:
  try:
    details = run_aws(['lambda', 'get-function', '--function-name', function_name], region=region)
    run_aws(
      ['lambda', 'update-function-code', '--function-name', function_name, '--zip-file', f'fileb://{archive_path}'],
      region=region,
    )
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
      region=region,
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
      region=region,
    )
    return details['FunctionArn']


def ensure_lambda_s3_permission(function_name: str, bucket_arn: str, account_id: str, region: str) -> None:
  try:
    run_aws(
      [
        'lambda',
        'add-permission',
        '--function-name',
        function_name,
        '--statement-id',
        'S3EmailAliasIngressInvoke',
        '--action',
        'lambda:InvokeFunction',
        '--principal',
        's3.amazonaws.com',
        '--source-arn',
        bucket_arn,
        '--source-account',
        account_id,
      ],
      region=region,
    )
  except RuntimeError as error:
    if 'already exists' not in str(error):
      raise


def ensure_bucket_notification(bucket_name: str, function_arn: str, prefix: str, region: str) -> None:
  configuration: dict[str, Any] = {
    'LambdaFunctionConfigurations': [
      {
        'Id': 'TownOfWileyEmailAliasRouterTrigger',
        'LambdaFunctionArn': function_arn,
        'Events': ['s3:ObjectCreated:*'],
      },
    ],
  }

  if prefix:
    configuration['LambdaFunctionConfigurations'][0]['Filter'] = {
      'Key': {'FilterRules': [{'Name': 'prefix', 'Value': prefix}]},
    }

  run_aws(
    [
      's3api',
      'put-bucket-notification-configuration',
      '--bucket',
      bucket_name,
      '--notification-configuration',
      json.dumps(configuration),
    ],
    expect_json=False,
    region=region,
  )


def ensure_receipt_rule_set(rule_set_name: str, region: str) -> None:
  try:
    run_aws(['ses', 'describe-receipt-rule-set', '--rule-set-name', rule_set_name], region=region)
  except RuntimeError:
    run_aws(['ses', 'create-receipt-rule-set', '--rule-set-name', rule_set_name], region=region)


def ensure_receipt_rule(
  rule_set_name: str,
  rule_name: str,
  recipients: list[str],
  bucket_name: str,
  prefix: str,
  region: str,
) -> None:
  rule = {
    'Name': rule_name,
    'Enabled': True,
    'TlsPolicy': 'Optional',
    'Recipients': recipients,
    'ScanEnabled': True,
    'Actions': [
      {
        'S3Action': {
          'BucketName': bucket_name,
          'ObjectKeyPrefix': prefix,
        },
      },
    ],
  }

  try:
    run_aws(
      ['ses', 'create-receipt-rule', '--rule-set-name', rule_set_name, '--rule', json.dumps(rule)],
      region=region,
    )
  except RuntimeError as error:
    if 'already exists' not in str(error).lower():
      raise

    run_aws(
      ['ses', 'update-receipt-rule', '--rule-set-name', rule_set_name, '--rule', json.dumps(rule)],
      region=region,
    )


def ensure_active_receipt_rule_set(rule_set_name: str, region: str) -> None:
  run_aws(['ses', 'set-active-receipt-rule-set', '--rule-set-name', rule_set_name], expect_json=False, region=region)


def require_value(value: str, label: str) -> str:
  if value.strip():
    return value.strip()

  raise SystemExit(f'Missing required value for {label}. Provide it via the CLI flag or secrets/local/user-secrets.json.')


def main() -> int:
  args = parse_args()
  secrets = load_local_secrets()
  ensure_env_from_secrets(secrets)

  aws_secrets = secrets.get('aws', {})
  mail_defaults = secrets.get('mail', {}).get('aliasForwarding', {})

  ingress_region = resolve_value(args.ingress_region, mail_defaults.get('ingressRegion'), 'us-east-1')
  account_id = get_account_id(str(aws_secrets.get('accountId', '')), ingress_region)
  alias_domain = resolve_value(args.alias_domain, mail_defaults.get('aliasDomain'), 'townofwiley.gov')
  alias_table = require_value(
    resolve_value(args.alias_table, mail_defaults.get('aliasTableName')),
    'alias table name',
  )
  alias_table_region = resolve_value(
    args.alias_table_region,
    mail_defaults.get('aliasTableRegion'),
    str(aws_secrets.get('region', 'us-east-2')),
  )
  forwarder_from = require_value(
    resolve_value(args.forwarder_from, mail_defaults.get('forwarderFrom')),
    'forwarder sender email',
  )
  send_region = resolve_value(
    args.send_region,
    mail_defaults.get('sendRegion'),
    str(aws_secrets.get('region', 'us-east-2')),
  )
  function_name = resolve_value(
    args.function_name,
    mail_defaults.get('functionName'),
    'TownOfWileyEmailAliasRouter',
  )
  role_name = resolve_value(
    args.role_name,
    mail_defaults.get('roleName'),
    'TownOfWileyEmailAliasRouterRole',
  )
  bucket_name = resolve_value(
    args.bucket_name,
    mail_defaults.get('ingressBucketName'),
    f'townofwiley-email-alias-{account_id}-{ingress_region}',
  )
  receipt_rule_set = resolve_value(
    args.receipt_rule_set,
    mail_defaults.get('receiptRuleSetName'),
    'TownOfWileyAliasForwarding',
  )
  receipt_rule_name = resolve_value(
    args.receipt_rule_name,
    mail_defaults.get('receiptRuleName'),
    'StoreTownMailInS3',
  )
  receipt_prefix = resolve_value(args.receipt_prefix, mail_defaults.get('receiptPrefix'), 'incoming/')
  receipt_recipients_text = resolve_value(
    args.receipt_recipients,
    mail_defaults.get('receiptRecipients'),
    alias_domain,
  )
  receipt_recipients = [
    recipient.strip() for recipient in receipt_recipients_text.split(',') if recipient.strip()
  ]

  archive_path = package_backend()
  bucket_arn = ensure_bucket(bucket_name, ingress_region)
  ensure_bucket_policy(bucket_name, account_id, ingress_region)
  alias_table_arn = get_table_arn(alias_table, alias_table_region)
  role_arn = ensure_role(role_name, bucket_arn, alias_table_arn)
  function_arn = ensure_lambda_function(
    function_name=function_name,
    role_arn=role_arn,
    runtime=args.runtime,
    archive_path=archive_path,
    environment={
      'EMAIL_ALIAS_TABLE': alias_table,
      'EMAIL_ALIAS_TABLE_REGION': alias_table_region,
      'FORWARDER_FROM': forwarder_from,
      'ALIAS_DOMAIN': alias_domain,
      'SES_SEND_REGION': send_region,
    },
    region=ingress_region,
  )
  ensure_lambda_s3_permission(function_name, bucket_arn, account_id, ingress_region)
  time.sleep(5)
  ensure_bucket_notification(bucket_name, function_arn, receipt_prefix, ingress_region)

  if not args.skip_receipt_rule_setup:
    ensure_receipt_rule_set(receipt_rule_set, ingress_region)
    ensure_receipt_rule(
      rule_set_name=receipt_rule_set,
      rule_name=receipt_rule_name,
      recipients=receipt_recipients,
      bucket_name=bucket_name,
      prefix=receipt_prefix,
      region=ingress_region,
    )
    ensure_active_receipt_rule_set(receipt_rule_set, ingress_region)

  summary = {
    'functionName': function_name,
    'functionRegion': ingress_region,
    'roleName': role_name,
    'bucketName': bucket_name,
    'receiptRuleSet': None if args.skip_receipt_rule_setup else receipt_rule_set,
    'receiptRuleName': None if args.skip_receipt_rule_setup else receipt_rule_name,
    'receiptRecipients': [] if args.skip_receipt_rule_setup else receipt_recipients,
    'aliasTable': alias_table,
    'aliasTableRegion': alias_table_region,
    'forwarderFrom': forwarder_from,
    'sendRegion': send_region,
    'aliasDomain': alias_domain,
  }
  print(json.dumps(summary, indent=2))
  return 0


if __name__ == '__main__':
  sys.exit(main())
