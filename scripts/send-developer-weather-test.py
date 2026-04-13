from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

REPO_ROOT = Path(__file__).resolve().parent.parent
LOCAL_SECRETS_PATH = REPO_ROOT / 'secrets' / 'local' / 'user-secrets.json'


def read_local_test_token() -> str:
  if not LOCAL_SECRETS_PATH.exists():
    return unlock_local_test_secrets()

  try:
    secrets = json.loads(LOCAL_SECRETS_PATH.read_text(encoding='utf-8'))
  except (OSError, json.JSONDecodeError):
    return unlock_local_test_secrets()

  token = str(secrets.get('weather', {}).get('alertSignup', {}).get('developerTestToken', '')).strip()
  return token or unlock_local_test_secrets()


def unlock_local_test_secrets() -> str:
  process = subprocess.run(
    ['node', 'scripts/user-secrets.mjs', 'unlock'],
    cwd=REPO_ROOT,
    check=False,
    capture_output=True,
    text=True,
  )

  if process.returncode != 0 or not LOCAL_SECRETS_PATH.exists():
    return ''

  try:
    secrets = json.loads(LOCAL_SECRETS_PATH.read_text(encoding='utf-8'))
  except (OSError, json.JSONDecodeError):
    return ''

  return str(secrets.get('weather', {}).get('alertSignup', {}).get('developerTestToken', '')).strip()


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(
    description='Send a developer-only severe weather test alert to explicit email and SMS destinations.',
  )
  parser.add_argument('--function-url', required=True, help='TownOfWileySevereWeatherBackend Function URL.')
  parser.add_argument('--token', default='', help='Developer test token expected by the backend route.')
  parser.add_argument('--email', help='Email destination for the isolated test alert.')
  parser.add_argument('--phone', help='SMS destination for the isolated test alert.')
  parser.add_argument('--language', default='en', choices=['en', 'es'], help='Preferred language for the test alert.')
  parser.add_argument('--event', default='Town of Wiley severe weather test alert')
  parser.add_argument('--headline', default='Developer-only smoke test for the severe weather alert path')
  parser.add_argument('--instruction', default='Confirm delivery on the email address and mobile number provided.')
  parser.add_argument('--severity', default='Moderate')
  parser.add_argument('--urgency', default='Expected')
  parser.add_argument('--zip-code', default='81092')
  parser.add_argument('--expires', default='')
  parser.add_argument('--area-desc', default='Town of Wiley developer test recipients')
  return parser.parse_args()


def main() -> int:
  args = parse_args()
  token = args.token.strip() or read_local_test_token()

  if not args.email and not args.phone:
    raise SystemExit('Provide at least --email or --phone.')

  if not token:
    raise SystemExit('Provide --token or unlock the repo secrets with npm run secrets:unlock.')

  payload = {
    'preferredLanguage': args.language,
    'event': args.event,
    'headline': args.headline,
    'instruction': args.instruction,
    'severity': args.severity,
    'urgency': args.urgency,
    'zipCode': args.zip_code,
    'expires': args.expires,
    'areaDesc': args.area_desc,
  }

  if args.email:
    payload['emailDestination'] = args.email

  if args.phone:
    payload['smsDestination'] = args.phone

  request = Request(
    f"{args.function_url.rstrip('/')}/developer-test",
    data=json.dumps(payload).encode('utf-8'),
    headers={
      'content-type': 'application/json; charset=utf-8',
      'x-townofwiley-test-token': token,
    },
    method='POST',
  )

  try:
    with urlopen(request, timeout=60) as response:
      body = response.read().decode('utf-8')
      print(body)
      return 0
  except HTTPError as error:
    message = error.read().decode('utf-8') if error.fp else error.reason
    print(message, file=sys.stderr)
    return 1
  except URLError as error:
    print(str(error), file=sys.stderr)
    return 1


if __name__ == '__main__':
  raise SystemExit(main())
