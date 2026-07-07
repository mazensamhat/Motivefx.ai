"""JWT auth, password hashing, and TOTP two-factor verification."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
import pyotp
from config import settings
from db import (
    create_auth_user,
    delete_password_reset_token,
    delete_user_account,
    export_user_data,
    get_password_reset_token,
    get_refresh_token,
    get_user_by_email,
    get_user_record,
    merge_user_accounts,
    revoke_all_refresh_tokens,
    revoke_refresh_token,
    store_password_reset_token,
    store_refresh_token,
    touch_user,
    update_auth_credentials,
)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def new_user_id() -> str:
    return "u_" + secrets.token_urlsafe(12)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _encode(payload: dict, expires_delta: timedelta) -> str:
    now = _utc_now()
    data = {**payload, "iat": now, "exp": now + expires_delta}
    return jwt.encode(data, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _decode(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


def create_access_token(user_id: str, email: str) -> str:
    return _encode(
        {"sub": user_id, "email": email, "type": "access"},
        timedelta(minutes=settings.jwt_access_expire_minutes),
    )


def create_refresh_token(user_id: str) -> str:
    token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires = _utc_now() + timedelta(days=settings.jwt_refresh_expire_days)
    store_refresh_token(token_hash, user_id, expires.isoformat())
    return token


def create_pending_2fa_token(user_id: str) -> str:
    return _encode(
        {"sub": user_id, "type": "pending_2fa"},
        timedelta(minutes=settings.jwt_pending_2fa_expire_minutes),
    )


def verify_access_token(token: str) -> dict:
    payload = _decode(token)
    if payload.get("type") != "access":
        raise ValueError("Invalid token type")
    return payload


def verify_pending_2fa_token(token: str) -> str:
    payload = _decode(token)
    if payload.get("type") != "pending_2fa":
        raise ValueError("Invalid token type")
    return payload["sub"]


def refresh_access_token(refresh_token: str) -> tuple[str, str] | None:
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    row = get_refresh_token(token_hash)
    if not row:
        return None
    expires = datetime.fromisoformat(row["expires_at"])
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < _utc_now():
        revoke_refresh_token(token_hash)
        return None
    user = get_user_record(row["user_id"])
    if not user or not user.get("email"):
        return None
    revoke_refresh_token(token_hash)
    access = create_access_token(user["user_id"], user["email"])
    new_refresh = create_refresh_token(user["user_id"])
    return access, new_refresh


def logout(refresh_token: str | None) -> None:
    if not refresh_token:
        return
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    revoke_refresh_token(token_hash)


def register_user(
    email: str,
    password: str,
    *,
    display_name: str | None = None,
    accept_privacy: bool,
    accept_terms: bool,
    accept_risk_ack: bool = False,
    marketing_consent: bool = False,
    anonymous_user_id: str | None = None,
    acquisition_channel: str | None = None,
) -> dict:
    if not accept_privacy or not accept_terms or not accept_risk_ack:
        raise ValueError("Privacy policy, terms, and risk acknowledgement must be accepted")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    if get_user_by_email(email):
        raise ValueError("An account with this email already exists")

    user_id = new_user_id()
    now = _utc_now().isoformat()
    create_auth_user(
        user_id,
        email,
        hash_password(password),
        display_name=display_name or email.split("@")[0],
        privacy_accepted_at=now,
        terms_accepted_at=now,
        risk_acknowledged_at=now,
        marketing_consent=marketing_consent,
        acquisition_channel=acquisition_channel,
    )
    if anonymous_user_id:
        merge_user_accounts(anonymous_user_id, user_id)

    from services.simulation import start_sim_trial

    start_sim_trial(user_id)

    access = create_access_token(user_id, email.strip().lower())
    refresh = create_refresh_token(user_id)
    touch_user(user_id)
    return _session_payload(user_id, access, refresh)


def login_user(email: str, password: str) -> dict:
    user = get_user_by_email(email)
    if not user or not verify_password(password, user.get("password_hash")):
        raise ValueError("Invalid email or password")

    user_id = user["user_id"]
    if user.get("totp_enabled") and user.get("totp_secret"):
        return {
            "requires2fa": True,
            "pendingToken": create_pending_2fa_token(user_id),
            "userId": user_id,
        }

    access = create_access_token(user_id, user["email"])
    refresh = create_refresh_token(user_id)
    touch_user(user_id)
    return _session_payload(user_id, access, refresh)


def verify_2fa_login(pending_token: str, code: str) -> dict:
    user_id = verify_pending_2fa_token(pending_token)
    user = get_user_record(user_id)
    if not user or not user.get("totp_enabled") or not user.get("totp_secret"):
        raise ValueError("Two-factor authentication is not enabled")
    if not verify_totp(user["totp_secret"], code):
        raise ValueError("Invalid authentication code")

    access = create_access_token(user_id, user["email"])
    refresh = create_refresh_token(user_id)
    touch_user(user_id)
    return _session_payload(user_id, access, refresh)


def setup_totp(user_id: str) -> dict:
    user = get_user_record(user_id)
    if not user:
        raise ValueError("User not found")
    secret = pyotp.random_base32()
    update_auth_credentials(user_id, totp_secret=secret, totp_enabled=False)
    email = user.get("email") or user_id
    totp = pyotp.TOTP(secret)
    return {
        "secret": secret,
        "otpauthUrl": totp.provisioning_uri(name=email, issuer_name="MotiveFX.AI"),
    }


def confirm_totp(user_id: str, code: str) -> None:
    user = get_user_record(user_id)
    if not user or not user.get("totp_secret"):
        raise ValueError("Two-factor setup not started")
    if not verify_totp(user["totp_secret"], code):
        raise ValueError("Invalid authentication code")
    update_auth_credentials(user_id, totp_enabled=True)


def disable_totp(user_id: str, code: str, password: str) -> None:
    user = get_user_record(user_id)
    if not user or not verify_password(password, user.get("password_hash")):
        raise ValueError("Invalid password")
    if not user.get("totp_secret") or not verify_totp(user["totp_secret"], code):
        raise ValueError("Invalid authentication code")
    update_auth_credentials(user_id, totp_secret=None, totp_enabled=False)
    revoke_all_refresh_tokens(user_id)


def verify_totp(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def user_public_profile(user_id: str) -> dict | None:
    user = get_user_record(user_id)
    if not user:
        return None
    return {
        "userId": user["user_id"],
        "email": user["email"],
        "displayName": user.get("display_name"),
        "totpEnabled": bool(user.get("totp_enabled")),
        "privacyAcceptedAt": user.get("privacy_accepted_at"),
        "termsAcceptedAt": user.get("terms_accepted_at"),
        "marketingConsent": bool(user.get("marketing_consent")),
        "createdAt": user.get("created_at"),
    }


def _session_payload(user_id: str, access: str, refresh: str) -> dict:
    user = get_user_record(user_id)
    return {
        "requires2fa": False,
        "accessToken": access,
        "refreshToken": refresh,
        "expiresIn": settings.jwt_access_expire_minutes * 60,
        "user": user_public_profile(user_id),
    }


def request_password_reset(email: str) -> dict:
    """Always returns ok to avoid email enumeration."""
    user = get_user_by_email(email)
    result: dict = {"ok": True, "message": "If that email exists, a reset link was sent."}
    if not user or not user.get("password_hash"):
        return result

    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires = _utc_now() + timedelta(minutes=settings.password_reset_expire_minutes)
    store_password_reset_token(token_hash, user["user_id"], expires.isoformat())

    reset_url = f"{settings.app_public_url.rstrip('/')}/?page=reset-password&token={token}"
    from services.email_delivery import send_password_reset_email

    send_password_reset_email(user["email"], reset_url)
    if settings.expose_reset_links:
        result["resetUrl"] = reset_url
    return result


def reset_password(token: str, new_password: str) -> None:
    if len(new_password) < 8:
        raise ValueError("Password must be at least 8 characters")
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    row = get_password_reset_token(token_hash)
    if not row:
        raise ValueError("Invalid or expired reset link")
    expires = datetime.fromisoformat(row["expires_at"])
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < _utc_now():
        delete_password_reset_token(token_hash)
        raise ValueError("Invalid or expired reset link")
    user_id = row["user_id"]
    update_auth_credentials(user_id, password_hash=hash_password(new_password))
    delete_password_reset_token(token_hash)
    revoke_all_refresh_tokens(user_id)


def export_account(user_id: str) -> dict:
    data = export_user_data(user_id)
    if not data:
        raise ValueError("User not found")
    return {"exportedAt": _utc_now().isoformat(), **data}


def delete_account(user_id: str, password: str, confirmation: str) -> None:
    if confirmation != "DELETE":
        raise ValueError('Type DELETE to confirm account removal')
    user = get_user_record(user_id)
    if not user or not verify_password(password, user.get("password_hash")):
        raise ValueError("Invalid password")
    revoke_all_refresh_tokens(user_id)
    delete_user_account(user_id)


def provision_site_user(email: str, *, display_name: str | None = None) -> dict:
    """Create or load a backend user for the Next.js site (no password login on FastAPI)."""
    normalized = email.strip().lower()
    user = get_user_by_email(normalized)
    if not user:
        user_id = new_user_id()
        now = _utc_now().isoformat()
        create_auth_user(
            user_id,
            normalized,
            hash_password(secrets.token_urlsafe(24)),
            display_name=display_name or normalized.split("@")[0],
            privacy_accepted_at=now,
            terms_accepted_at=now,
            acquisition_channel="motivefx_site",
        )
        user = get_user_record(user_id)
    if not user:
        raise ValueError("Could not provision user")
    access = create_access_token(user["user_id"], normalized)
    refresh = create_refresh_token(user["user_id"])
    return {
        "user_id": user["user_id"],
        "email": normalized,
        "access_token": access,
        "refresh_token": refresh,
    }
