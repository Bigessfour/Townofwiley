from __future__ import annotations

import json
import os
import time
from typing import Any

import jwt
import requests

DEFAULT_ALLOWED_ORIGIN = "https://www.townofwiley.gov"
STAFF_GROUP = os.environ.get("STAFF_GROUP", "Staff")
USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "")
CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID", "")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-2")

_jwks_cache: dict[str, Any] | None = None
_jwks_loaded_at = 0.0


def _load_jwks() -> dict[str, Any]:
    global _jwks_cache, _jwks_loaded_at
    if _jwks_cache and (time.time() - _jwks_loaded_at) < 3600:
        return _jwks_cache
    if not USER_POOL_ID:
        return {"keys": []}
    url = f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"
    response = requests.get(url, timeout=5)
    response.raise_for_status()
    _jwks_cache = response.json()
    _jwks_loaded_at = time.time()
    return _jwks_cache


def _signing_key(token: str) -> Any:
    headers = jwt.get_unverified_header(token)
    kid = headers.get("kid")
    for key in _load_jwks().get("keys", []):
        if key.get("kid") == kid:
            return jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
    raise jwt.InvalidTokenError("Signing key not found.")


def header_map(headers: dict[str, Any] | None) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in (headers or {}).items():
        out[key.lower()] = str(value)
    return out


def cors_headers(origin: str, methods: str = "GET, OPTIONS") -> dict[str, str]:
    allow_origin = (
        origin
        if origin in {DEFAULT_ALLOWED_ORIGIN, "https://townofwiley.gov"}
        or origin.endswith(".townofwiley.gov")
        else DEFAULT_ALLOWED_ORIGIN
    )
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allow_origin,
        "Access-Control-Allow-Methods": methods,
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Vary": "Origin",
    }


def json_response(
    status_code: int, body: dict[str, Any], origin: str
) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": cors_headers(origin),
        "body": json.dumps(body),
    }


def assert_staff_from_event(event: dict[str, Any]) -> bool:
    if not USER_POOL_ID or not CLIENT_ID:
        return False
    headers = header_map(event.get("headers"))
    auth = headers.get("authorization", "")
    token = auth[7:].strip() if auth.startswith("Bearer ") else ""
    if not token:
        return False
    try:
        payload = jwt.decode(
            token,
            _signing_key(token),
            algorithms=["RS256"],
            audience=CLIENT_ID,
            options={"verify_exp": True},
        )
    except jwt.PyJWTError:
        return False
    groups = payload.get("cognito:groups")
    return isinstance(groups, list) and STAFF_GROUP in groups


def deserialize_dynamo_item(raw: dict[str, Any] | None) -> dict[str, Any]:
    if not raw:
        return {}

    def decode(value: dict[str, Any]) -> Any:
        if "S" in value:
            return value["S"]
        if "N" in value:
            number = value["N"]
            return int(number) if "." not in number else float(number)
        if "BOOL" in value:
            return value["BOOL"]
        if "NULL" in value:
            return None
        if "M" in value:
            return {key: decode(nested) for key, nested in value["M"].items()}
        if "L" in value:
            return [decode(nested) for nested in value["L"]]
        return None

    return {key: decode(value) for key, value in raw.items()}
