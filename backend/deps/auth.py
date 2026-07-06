"""FastAPI auth dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException

from db import get_user_record, touch_user
from services.auth_service import verify_access_token


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return authorization.split(" ", 1)[1].strip()


def get_optional_user(
    authorization: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
) -> dict | None:
    token = _bearer_token(authorization)
    if token:
        try:
            payload = verify_access_token(token)
            user = get_user_record(payload["sub"])
            if user:
                touch_user(user["user_id"])
                return user
        except Exception:
            pass
    if x_user_id:
        touch_user(x_user_id)
        return get_user_record(x_user_id) or {"user_id": x_user_id}
    return None


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    token = _bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = verify_access_token(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
    user = get_user_record(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    touch_user(user["user_id"])
    return user


def resolve_user_id(
    user: Annotated[dict | None, Depends(get_optional_user)],
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
) -> str | None:
    if user:
        return user["user_id"]
    return x_user_id
