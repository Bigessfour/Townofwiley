"""Cognito JWT verification for staff admin routes (JWKS)."""

from __future__ import annotations

import json
import os
import time
from typing import Any

import jwt
import requests

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
    url = (
        f"https://cognito-idp.{AWS_REGION}.amazonaws.com/"
        f"{USER_POOL_ID}/.well-known/jwks.json"
    )
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


def assert_staff_token(token: str) -> bool:
    """Return True when token is a valid Cognito access/id token for Staff group."""
    if not USER_POOL_ID or not CLIENT_ID or not token:
        return False
    try:
        payload = jwt.decode(
            token,
            _signing_key(token),
            algorithms=["RS256"],
            options={"verify_exp": True, "verify_aud": False},
        )
    except jwt.PyJWTError:
        return False

    token_use = str(payload.get("token_use") or "")
    if token_use not in {"access", "id"}:
        return False

    client_claim = str(payload.get("client_id") or payload.get("aud") or "")
    if client_claim != CLIENT_ID:
        return False

    groups = payload.get("cognito:groups")
    return isinstance(groups, list) and STAFF_GROUP in groups
