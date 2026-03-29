"""
Deploy the Town of Wiley contact-update Lambda + DynamoDB table.

What this script does
---------------------
1. Creates (or verifies) the DynamoDB table ``TownOfWileyContactUpdates``.
2. Creates an IAM role with least-privilege inline policy:
   - dynamodb:PutItem on the table
   - ses:SendEmail / sesv2:SendEmail
   - logs:CreateLogGroup, logs:CreateLogStream, logs:PutLogEvents
3. Packages ``infrastructure/contact-update-lambda/`` into a zip archive.
4. Creates or updates the Lambda function.
5. Creates (or returns the existing) Lambda Function URL with CORS configured
   for the town's public origin.
6. Prints the Function URL so you can paste it into secrets/local/user-secrets.json
   under ``contactUpdate.apiEndpoint``.

Usage
-----
    python scripts/deploy-contact-update-backend.py

Override any value via CLI flag (see --help) or by adding a ``contactUpdate``
block to ``secrets/local/user-secrets.json``:

    {
      "contactUpdate": {
        "functionName": "TownOfWileyContactUpdate",
        "roleName": "TownOfWileyContactUpdateRole",
        "tableName": "TownOfWileyContactUpdates",
        "fromAddress": "noreply@townofwiley.gov",
        "toAddress": "clerk@townofwiley.gov",
        "allowedOrigin": "https://www.townofwiley.gov"
      }
    }
"""

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
BACKEND_DIR = REPO_ROOT / 'infrastructure' / 'contact-update-lambda'


# ---------------------------------------------------------------------------
# CLI + secrets helpers
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Deploy the Town of Wiley contact-update Lambda + DynamoDB.',
    )
    parser.add_argument('--function-name', default='')
    parser.add_argument('--role-name', default='')
    parser.add_argument('--table-name', default='')
    parser.add_argument('--from-address', default='')
    parser.add_argument('--to-address', default='')
    parser.add_argument('--allowed-origin', default='')
    parser.add_argument('--region', default='')
    parser.add_argument('--runtime', default='nodejs20.x')
    return parser.parse_args()


def load_local_secrets() -> dict[str, Any]:
    if not SECRETS_PATH.exists():
        return {}
    try:
        return json.loads(SECRETS_PATH.read_text(encoding='utf-8'))
    except Exception as exc:
        print(f'Warning: could not parse local secrets: {exc}', file=sys.stderr)
        return {}


def ensure_env_from_secrets(secrets: dict[str, Any]) -> None:
    aws = secrets.get('aws', {})
    for env_key, secret_key in [
        ('AWS_ACCESS_KEY_ID', 'accessKeyId'),
        ('AWS_SECRET_ACCESS_KEY', 'secretAccessKey'),
        ('AWS_SESSION_TOKEN', 'sessionToken'),
        ('AWS_REGION', 'region'),
    ]:
        if not os.environ.get(env_key) and aws.get(secret_key):
            os.environ[env_key] = aws[secret_key]


def resolve_value(cli_value: str, secret_value: Any, fallback: str = '') -> str:
    if isinstance(cli_value, str) and cli_value.strip():
        return cli_value.strip()
    if isinstance(secret_value, str) and secret_value.strip():
        return secret_value.strip()
    return fallback.strip()


# ---------------------------------------------------------------------------
# AWS CLI wrapper
# ---------------------------------------------------------------------------

def run_aws(command: list[str], expect_json: bool = True, region: str = '') -> Any:
    process = subprocess.run(
        ['aws', *(['--region', region] if region else []), *command],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if process.returncode != 0:
        raise RuntimeError(
            process.stderr.strip() or process.stdout.strip() or 'AWS CLI command failed.'
        )
    output = process.stdout.strip()
    if not expect_json:
        return output
    return json.loads(output) if output else {}


# ---------------------------------------------------------------------------
# DynamoDB
# ---------------------------------------------------------------------------

def ensure_dynamo_table(table_name: str, region: str) -> str:
    try:
        result = run_aws(
            ['dynamodb', 'describe-table', '--table-name', table_name], region=region
        )
        arn: str = result['Table']['TableArn']
        print(f'DynamoDB table already exists: {table_name}')
        return arn
    except RuntimeError:
        pass

    print(f'Creating DynamoDB table: {table_name}')
    run_aws(
        [
            'dynamodb', 'create-table',
            '--table-name', table_name,
            '--attribute-definitions', 'AttributeName=id,AttributeType=S',
            '--key-schema', 'AttributeName=id,KeyType=HASH',
            '--billing-mode', 'PAY_PER_REQUEST',
        ],
        expect_json=False,
        region=region,
    )
    run_aws(
        ['dynamodb', 'wait', 'table-exists', '--table-name', table_name],
        expect_json=False,
        region=region,
    )
    result = run_aws(
        ['dynamodb', 'describe-table', '--table-name', table_name], region=region
    )
    arn = result['Table']['TableArn']
    print(f'Table created: {arn}')
    return arn


# ---------------------------------------------------------------------------
# IAM
# ---------------------------------------------------------------------------

def ensure_role(role_name: str, table_arn: str, region: str) -> str:
    trust_policy = {
        'Version': '2012-10-17',
        'Statement': [
            {
                'Effect': 'Allow',
                'Principal': {'Service': 'lambda.amazonaws.com'},
                'Action': 'sts:AssumeRole',
            }
        ],
    }
    inline_policy = {
        'Version': '2012-10-17',
        'Statement': [
            {
                'Effect': 'Allow',
                'Action': ['dynamodb:PutItem'],
                'Resource': [table_arn],
            },
            {
                'Effect': 'Allow',
                'Action': ['ses:SendEmail', 'sesv2:SendEmail'],
                'Resource': '*',
            },
            {
                'Effect': 'Allow',
                'Action': [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                ],
                'Resource': 'arn:aws:logs:*:*:*',
            },
        ],
    }

    try:
        role = run_aws(['iam', 'get-role', '--role-name', role_name])
        role_arn: str = role['Role']['Arn']
        print(f'IAM role already exists: {role_arn}')
    except RuntimeError:
        with tempfile.NamedTemporaryFile(
            'w', suffix='-trust.json', delete=False, encoding='utf-8'
        ) as fh:
            json.dump(trust_policy, fh)
            trust_path = fh.name

        print(f'Creating IAM role: {role_name}')
        role = run_aws(
            ['iam', 'create-role', '--role-name', role_name,
             '--assume-role-policy-document', f'file://{trust_path}']
        )
        role_arn = role['Role']['Arn']
        print(f'Role created: {role_arn}')
        # Wait for IAM propagation
        time.sleep(10)

    with tempfile.NamedTemporaryFile(
        'w', suffix='-policy.json', delete=False, encoding='utf-8'
    ) as fh:
        json.dump(inline_policy, fh)
        policy_path = fh.name

    run_aws(
        [
            'iam', 'put-role-policy',
            '--role-name', role_name,
            '--policy-name', 'TownOfWileyContactUpdatePolicy',
            '--policy-document', f'file://{policy_path}',
        ],
        expect_json=False,
    )
    return role_arn


# ---------------------------------------------------------------------------
# Lambda packaging
# ---------------------------------------------------------------------------

def package_lambda() -> Path:
    temp_dir = Path(tempfile.mkdtemp(prefix='townofwiley-contact-update-'))
    archive_path = temp_dir / 'contact-update-lambda.zip'
    with ZipFile(archive_path, 'w', ZIP_DEFLATED) as archive:
        for path in sorted(BACKEND_DIR.rglob('*.mjs')):
            archive.write(path, path.relative_to(BACKEND_DIR))
    return archive_path


# ---------------------------------------------------------------------------
# Lambda function
# ---------------------------------------------------------------------------

def ensure_lambda_function(
    function_name: str,
    role_arn: str,
    runtime: str,
    archive_path: Path,
    environment: dict[str, str],
    region: str,
) -> str:
    env_json = json.dumps({'Variables': environment})
    try:
        details = run_aws(
            ['lambda', 'get-function', '--function-name', function_name], region=region
        )
        print(f'Updating Lambda code: {function_name}')
        run_aws(
            ['lambda', 'update-function-code',
             '--function-name', function_name,
             '--zip-file', f'fileb://{archive_path}'],
            region=region,
        )
        run_aws(
            ['lambda', 'wait', 'function-updated', '--function-name', function_name],
            expect_json=False,
            region=region,
        )
        run_aws(
            [
                'lambda', 'update-function-configuration',
                '--function-name', function_name,
                '--handler', 'index.handler',
                '--runtime', runtime,
                '--timeout', '10',
                '--memory-size', '128',
                '--role', role_arn,
                '--environment', env_json,
            ],
            region=region,
        )
        return details['Configuration']['FunctionArn']
    except RuntimeError:
        print(f'Creating Lambda function: {function_name}')
        details = run_aws(
            [
                'lambda', 'create-function',
                '--function-name', function_name,
                '--runtime', runtime,
                '--role', role_arn,
                '--handler', 'index.handler',
                '--timeout', '10',
                '--memory-size', '128',
                '--zip-file', f'fileb://{archive_path}',
                '--environment', env_json,
            ],
            region=region,
        )
        return details['FunctionArn']


# ---------------------------------------------------------------------------
# Lambda Function URL
# ---------------------------------------------------------------------------

def ensure_function_url(function_name: str, allowed_origin: str, region: str) -> str:
    cors = {
        'AllowOrigins': [allowed_origin],
        'AllowMethods': ['POST', 'OPTIONS'],
        'AllowHeaders': ['content-type'],
        'MaxAge': 300,
    }
    try:
        result = run_aws(
            ['lambda', 'get-function-url-config', '--function-name', function_name],
            region=region,
        )
        print('Updating Function URL CORS config')
        run_aws(
            [
                'lambda', 'update-function-url-config',
                '--function-name', function_name,
                '--cors', json.dumps(cors),
            ],
            region=region,
        )
        url: str = result['FunctionUrl']
    except RuntimeError:
        print('Creating Lambda Function URL')
        result = run_aws(
            [
                'lambda', 'create-function-url-config',
                '--function-name', function_name,
                '--auth-type', 'NONE',
                '--cors', json.dumps(cors),
            ],
            region=region,
        )
        url = result['FunctionUrl']
        # Allow public invocation
        try:
            run_aws(
                [
                    'lambda', 'add-permission',
                    '--function-name', function_name,
                    '--statement-id', 'FunctionURLAllowPublicAccess',
                    '--action', 'lambda:InvokeFunctionUrl',
                    '--principal', '*',
                    '--function-url-auth-type', 'NONE',
                ],
                expect_json=False,
                region=region,
            )
        except RuntimeError as exc:
            if 'already exists' not in str(exc):
                raise

    return url


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> int:
    args = parse_args()
    secrets = load_local_secrets()
    ensure_env_from_secrets(secrets)

    cu_secrets = secrets.get('contactUpdate', {})
    aws_secrets = secrets.get('aws', {})

    region = resolve_value(
        args.region,
        aws_secrets.get('region'),
        os.environ.get('AWS_REGION', 'us-east-2'),
    )
    function_name = resolve_value(
        args.function_name,
        cu_secrets.get('functionName'),
        'TownOfWileyContactUpdate',
    )
    role_name = resolve_value(
        args.role_name,
        cu_secrets.get('roleName'),
        'TownOfWileyContactUpdateRole',
    )
    table_name = resolve_value(
        args.table_name,
        cu_secrets.get('tableName'),
        'TownOfWileyContactUpdates',
    )
    from_address = resolve_value(
        args.from_address,
        cu_secrets.get('fromAddress'),
        'noreply@townofwiley.gov',
    )
    to_address = resolve_value(
        args.to_address,
        cu_secrets.get('toAddress'),
        'clerk@townofwiley.gov',
    )
    allowed_origin = resolve_value(
        args.allowed_origin,
        cu_secrets.get('allowedOrigin'),
        'https://www.townofwiley.gov',
    )

    table_arn = ensure_dynamo_table(table_name, region)
    role_arn = ensure_role(role_name, table_arn, region)
    archive_path = package_lambda()

    ensure_lambda_function(
        function_name=function_name,
        role_arn=role_arn,
        runtime=args.runtime,
        archive_path=archive_path,
        environment={
            'TABLE_NAME': table_name,
            'FROM_ADDRESS': from_address,
            'TO_ADDRESS': to_address,
        },
        region=region,
    )

    function_url = ensure_function_url(function_name, allowed_origin, region)

    print()
    print('=' * 60)
    print('Deployment complete.')
    print(f'Function URL: {function_url}')
    print()
    print('Add this to secrets/local/user-secrets.json:')
    print(json.dumps({'contactUpdate': {'apiEndpoint': function_url}}, indent=2))
    print()
    print('Then run:  node scripts/generate-runtime-config.mjs')
    print('=' * 60)
    return 0


if __name__ == '__main__':
    sys.exit(main())
