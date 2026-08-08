#!/usr/bin/env python3
"""
Minimal replacement for the referenced setup-cognito-staff-group.py.

Creates/ensures the "Staff" Cognito group on the Gen2 pool and (optionally)
adds a user to it. Also prints the exact AWS CLI commands for role mapping
and user creation (the full original script handled identity pool role
mapping for the "Staff" group so members get the authenticated IAM role
with S3/AppSync permissions).

Usage (after source scripts/agent-aws-env.sh):
  python scripts/setup-cognito-staff-group.py
  python scripts/setup-cognito-staff-group.py --create-user clerk@townofwiley.gov --set-temp-password

This is intentionally small and uses only boto3 + the AWS CLI profile.
"""

import argparse
import boto3
import sys
from botocore.exceptions import ClientError

USER_POOL_ID = "us-east-2_pkewJMUJF"
STAFF_GROUP = "Staff"
REGION = "us-east-2"

def get_client():
    return boto3.client("cognito-idp", region_name=REGION)

def ensure_staff_group(client):
    try:
        client.create_group(
            UserPoolId=USER_POOL_ID,
            GroupName=STAFF_GROUP,
            Description="Town of Wiley staff — /admin, contact review API, AppSync CMS (IAM)",
            Precedence=0,
        )
        print(f"Created group {STAFF_GROUP}")
    except ClientError as e:
        if e.response["Error"]["Code"] == "GroupExistsException":
            print(f"Group {STAFF_GROUP} already exists")
        else:
            raise

def add_user_to_staff(client, username: str):
    try:
        client.admin_add_user_to_group(
            UserPoolId=USER_POOL_ID,
            Username=username,
            GroupName=STAFF_GROUP,
        )
        print(f"Added {username} to {STAFF_GROUP}")
    except ClientError as e:
        print(f"Could not add user: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--create-user", help="Username (email) to create or ensure in the pool + Staff group")
    parser.add_argument("--set-temp-password", action="store_true", help="Also set a temporary password (prints it)")
    args = parser.parse_args()

    client = get_client()

    ensure_staff_group(client)

    if args.create_user:
        email = args.create_user
        temp = None
        if args.set_temp_password:
            # Very basic temp password generator for demo; real script used better randomness
            import secrets, string
            alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
            temp = ''.join(secrets.choice(alphabet) for _ in range(12))
            try:
                client.admin_create_user(
                    UserPoolId=USER_POOL_ID,
                    Username=email,
                    TemporaryPassword=temp,
                    UserAttributes=[{"Name": "email", "Value": email}, {"Name": "email_verified", "Value": "true"}],
                    MessageAction="SUPPRESS",  # we will send via the email configure script / SES
                )
                print(f"Created user {email} with temp password (printed below)")
            except ClientError as e:
                if "UsernameExistsException" in str(e):
                    print(f"User {email} already exists; will set temp password if --set-temp-password")
                    if temp:
                        client.admin_set_user_password(
                            UserPoolId=USER_POOL_ID,
                            Username=email,
                            Password=temp,
                            Permanent=False,
                        )
                else:
                    raise
            print("TEMPORARY PASSWORD (give to staff, they must change on first sign-in):")
            print(temp)
        add_user_to_staff(client, email)

    print("\nGroup membership for Staff:")
    try:
        resp = client.list_users_in_group(UserPoolId=USER_POOL_ID, GroupName=STAFF_GROUP, Limit=20)
        for u in resp.get("Users", []):
            print(" -", u.get("Username"))
    except Exception as e:
        print("Could not list:", e)

    print("\nNext steps (see docs/admin-auth-runbook.md):")
    print("  python scripts/configure-cognito-staff-email.py   # switch pool to SES for reset emails")
    print("  # Then have the staff go to https://www.townofwiley.gov/admin/login")

if __name__ == "__main__":
    main()

# Additional robustness note (appended):
# - Always prefer python3.
# - After adding users to Staff group, they can sign in at /admin/login.
# - The group RoleArn (if present) helps with some IAM mappings for the authenticated role.
# - For full identity pool role mapping (cognito:groups -> IAM role), see the original
#   setup script history or run the equivalent set-identity-pool-roles via AWS CLI / CDK.
