# Clerk JWT verification for protected API routes.

import json
from functools import lru_cache
from typing import Annotated, Any

import httpx
import jwt
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.algorithms import RSAAlgorithm

from env import clerk_authorized_parties, clerk_secret_key

_bearer = HTTPBearer(auto_error=False)
_jwks_keys: list[dict[str, Any]] | None = None


def _fetch_jwks() -> list[dict[str, Any]]:
  response = httpx.get(
    "https://api.clerk.com/v1/jwks",
    headers={"Authorization": f"Bearer {clerk_secret_key}"},
    timeout=10,
  )
  response.raise_for_status()
  return response.json()["keys"]


def _get_jwks_keys() -> list[dict[str, Any]]:
  global _jwks_keys
  if _jwks_keys is None:
    _jwks_keys = _fetch_jwks()
  return _jwks_keys


def _signing_key_for_token(token: str):
  header = jwt.get_unverified_header(token)
  kid = header.get("kid")
  keys = _get_jwks_keys()

  for key in keys:
    if key.get("kid") == kid:
      return RSAAlgorithm.from_jwk(json.dumps(key))

  # Key rotation: refresh JWKS once and retry.
  global _jwks_keys
  _jwks_keys = _fetch_jwks()
  for key in _jwks_keys:
    if key.get("kid") == kid:
      return RSAAlgorithm.from_jwk(json.dumps(key))

  raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def _decode_clerk_token(token: str, host: str | None) -> dict[str, Any]:
  try:
    signing_key = _signing_key_for_token(token)
    payload = jwt.decode(
      token,
      signing_key,
      algorithms=["RS256"],
      options={"verify_aud": False},

      # Add leeway so that tokens with an iat (issued at) that is just in the future
      # won't be rejected, preventing jwt.exceptions.ImmatureSignatureError.
      # https://github.com/jpadilla/pyjwt/issues/814
      leeway=1,
    )
  except jwt.PyJWTError:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

  azp = payload.get("azp")
  if _unauthorized_party(azp, host):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

  return payload

@lru_cache(maxsize=256)
def get_clerk_user_profile(user_id: str) -> dict[str, Any]:
  response = httpx.get(
    f"https://api.clerk.com/v1/users/{user_id}",
    headers={"Authorization": f"Bearer {clerk_secret_key}"},
    timeout=10,
  )
  response.raise_for_status()
  return response.json()

def _unauthorized_party(azp: Any | None, host: str | None):
  # First check if the token matches an explicitly authorized party.
  # Otherwise check if it matches the host, allowing Vercel preview deployments
  # to be authorized.
  return clerk_authorized_parties and azp not in clerk_authorized_parties and \
    (host is None or "https://" + host != azp)

async def get_current_user_id(
  credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
  host: Annotated[str | None, Header()] = None,
) -> str:
  if credentials is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

  payload = _decode_clerk_token(credentials.credentials, host)
  user_id = payload.get("sub")
  if not user_id:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

  return user_id


CurrentUserId = Annotated[str, Depends(get_current_user_id)]
