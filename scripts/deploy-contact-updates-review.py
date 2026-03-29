"""
Deploy the Town of Wiley contact-updates-review Lambda.

What this script does
---------------------
1. Creates an IAM role with a least-privilege inline policy:
   - dynamodb:Scan on TownOfWileyContactUpdates
   - logs:CreateLogGroup, logs:CreateLogStream, logs:PutLogEvents
2. Packages infrastructure/contact-updates-review/ into a zip archive.
3. Creates or updates the Lambda function.
4. Creates (or returns the existing) Lambda Function URL.
   NOTE: configure the Function URL with AuthType AWS_IAM so that only
   authenticated requests (e.g. through a signed CloudFront origin or admin
   proxy) can read resident data. Do NOT expose it to the public internet.
5. Prints the Function URL to paste into the proxy/runtime config.

Usage
-----
    python scripts/deploy-contact-updates-review.py

Override any value via CLI flag (see --help) or by adding a
``contactUpdatesReview`` block to secrets/local/user-secrets.json:

    {
      "contactUpdatesReview": {
        "functionName": "TownOfWileyContactUpdatesReview",
        "roleName":     "TownOfWileyContactUpdatesReviewRole",
        "tableName":    "TownOfWileyContactUpdates",
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
import time
from pathlib import Path
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

REPO_ROOT = Path(__file__).resolve().parent.parent
SECRETS_PATH = REPO_ROOT / 'secrets' / 'local' / 'user-secrets.json'
BACKEND_DIR = REPO_ROOT / 'infrastructure' / 'contact-updates-review'


# ---------------------------------------------------------------------------
# CLI + secrets helpers
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Deploy the Town of Wiley contact-updates-review Lambda.',
    )
    parser.add_argument('--function-name', default='')
    parser.add_argument('--role-name', default='')
    parser.add_argument('--table-name', default='')
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
    if expect_json and output:
        return json.loads(output)
    return output


# ---------------------------------------------------------------------------
# IAM
# ---------------------------------------------------------------------------

TRUST_POLICY = json.dumps({
    'Version': '2012-10-17',
    'Statement': [{
        'Effect': 'Allow',
        'Principal': {'Service': 'lambda.amazonaws.com'},
        'Action': 'sts:AssumeRole',
    }],
})


def get_or_create_role(role_name: str, table_arn: str) -> str:
    try:
        result = run_aws(['iam', 'get-role', '--role-name', role_name])
        arn: str = result['Role']['Arn']
        print(f'  IAM role already exists: {arn}')
    except RuntimeError:
        print(f'  Creating IAM role {role_name} …')
        result = run_aws([
            'iam', 'create-role',
            '--role-name', role_name,
            '--assume-role-policy-document', TRUST_POLICY,
        ])
        arn = result['Role']['Arn']
        time.sleep(10)  # propagation delay

    inline_policy = json.dumps({
        'Version': '2012-10-17',
        'Statement': [
            {
                'Effect': 'Allow',
                'Action': ['dynamodb:Scan'],
                'Resource': [table_arn, f'{table_arn}/index/*'],
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
    })
    run_aws([
        'iam', 'put-role-policy',
        '--role-name', role_name,
        '--policy-name', 'ContactUpdatesReviewPolicy',
        '--policy-document', inline_policy,
    ], expect_json=False)
    return arn


# ---------------------------------------------------------------------------
# DynamoDB - resolve table ARN
# ---------------------------------------------------------------------------

def get_table_arn(table_name: str, region: str) -> str:
    result = run_aws(['dynamodb', 'describe-table', '--table-name', table_name], region=region)
    return result['Table']['TableArn']


# ---------------------------------------------------------------------------
# Lambda zip
# ---------------------------------------------------------------------------

def build_zip() -> Path:
    zip_path = REPO_ROOT / '__ng_tmp__' / 'contact-updates-review.zip'
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(zip_path, 'w', ZIP_DEFLATED) as zf:
        for source_file in BACKEND_DIR.rglob('*'):
            if source_file.is_file():
                zf.write(source_file, source_file.relative_to(BACKEND_DIR))
    print(f'  Packaged Lambda: {zip_path}')
    return zip_path


# ---------------------------------------------------------------------------
# Lambda create / update
# ---------------------------------------------------------------------------

def upsert_lambda(
    function_name: str,
    role_arn: str,
    zip_path: Path,
    table_name: str,
    region: str,
    runtime: str,
) -> str:
    zip_bytes = zip_path.read_bytes()
    try:
        result = run_aws(
            ['lambda', 'get-function', '--function-name', function_name],
            region=region,
        )
        current_arn: str = result['Configuration']['FunctionArn']
        print(f'  Updating existing Lambda …')
        run_aws(
            [
                'lambda', 'update-function-code',
                '--function-name', function_name,
                '--zip-file', f'fileb://{zip_path}',
            ],
            region=region,
        )
        # Wait for update to complete
        time.sleep(5)
        run_aws(
            [
                'lambda', 'update-function-configuration',
                '--function-name', function_name,
                '--environment',
                f'Variables={{TABLE_NAME={table_name}}}',
            ],
            region=region,
        )
        return current_arn
    except RuntimeError:
        print(f'  Creating Lambda function {function_name} …')
        result = run_aws(
            [
                'lambda', 'create-function',
                '--function-name', function_name,
                '--runtime', runtime,
                '--role', role_arn,
                '--handler', 'index.handler',
                '--zip-file', f'fileb://{zip_path}',
                '--environment', f'Variables={{TABLE_NAME={table_name}}}',
                '--timeout', '10',
                '--memory-size', '128',
            ],
            region=region,
        )
        time.sleep(10)
        return result['FunctionArn']


# ---------------------------------------------------------------------------
# Function URL
# ---------------------------------------------------------------------------

def ensure_function_url(function_name: str, region: str) -> str:
    try:
        result = run_aws(
            ['lambda', 'get-function-url-config', '--function-name', function_name],
            region=region,
        )
        url: str = result['FunctionUrl']
        print(f'  Function URL already exists: {url}')
        return url
    except RuntimeError:
        pass

    result = run_aws(
        [
            'lambda', 'create-function-url-config',
            '--function-name', function_name,
            '--auth-type', 'AWS_IAM',
            '--cors',
            (
                'AllowOrigins=https://www.townofwiley.gov,'
                'AllowMethods=GET,AllowHeaders=Content-Type'
            ),
        ],
        region=region,
    )
    url = result['FunctionUrl']
    print(f'  Created Function URL: {url}')
    return url


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    args = parse_args()
    secrets = load_local_secrets()
    ensure_env_from_secrets(secrets)
    cfg = secrets.get('contactUpdatesReview', {})

    region = resolve_value(args.region, cfg.get('region', ''),
                           os.environ.get('AWS_REGION', 'us-east-2'))
    function_name = resolve_value(args.function_name, cfg.get('functionName', ''),
                                  'TownOfWileyContactUpdatesReview')
    role_name = resolve_value(args.role_name, cfg.get('roleName', ''),
                              'TownOfWileyContactUpdatesReviewRole')
    table_name = resolve_value(args.table_name, cfg.get('tableName', ''),
                               'TownOfWileyContactUpdates')

    print(f'\nDeploying contact-updates-review Lambda to {region} …')

    print('\n[1/5] Resolving DynamoDB table ARN …')
    table_arn = get_table_arn(table_name, region)
    print(f'  Table ARN: {table_arn}')

    print('\n[2/5] Ensuring IAM role …')
    role_arn = get_or_create_role(role_name, table_arn)

    print('\n[3/5] Building zip …')
    zip_path = build_zip()

    print('\n[4/5] Upserting Lambda …')
    fn_arn = upsert_lambda(function_name, role_arn, zip_path, table_name, region, args.runtime)
    print(f'  Function ARN: {fn_arn}')

    print('\n[5/5] Ensuring Function URL …')
    url = ensure_function_url(function_name, region)

    print('\n' + '=' * 60)
    print('Deployment complete.')
    print(f'\nFunction URL:\n  {url}')
    print(
        '\nNext step: add a /api/contact-updates-review proxy in your CloudFront\n'
        'distribution or Angular proxy config pointing to this Function URL.\n'
        'Keep AuthType=AWS_IAM — do NOT grant public unauthenticated access.'
    )


if __name__ == '__main__':
    main()
