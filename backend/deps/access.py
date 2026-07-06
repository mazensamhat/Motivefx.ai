"""User access control for beta launch."""

from __future__ import annotations

from fastapi import Depends, HTTPException

from config import settings
from db import get_user_record
from deps.auth import get_current_user, get_optional_user


def ensure_user_match(current: dict, requested_user_id: str) -> None:
    if current["user_id"] != requested_user_id:
        raise HTTPException(status_code=403, detail="Access denied")


def get_current_user_strict(user: dict = Depends(get_current_user)) -> dict:
    """Authenticated user with a registered account (password set)."""
    if settings.auth_enforce and not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Registered account required")
    return user


def allow_profile_or_anonymous(body_user_id: str, user: dict | None) -> str:
    """Profile bootstrap: JWT must match; anonymous allowed only before registration."""
    if user and user.get("password_hash"):
        ensure_user_match(user, body_user_id)
        return body_user_id
    if user and user["user_id"] == body_user_id:
        return body_user_id
    if settings.auth_enforce:
        row = get_user_record(body_user_id)
        if row and row.get("password_hash"):
            raise HTTPException(status_code=401, detail="Authentication required")
    return body_user_id
