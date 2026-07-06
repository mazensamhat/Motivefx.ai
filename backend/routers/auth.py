"""Registration, login, refresh, and TOTP two-factor authentication."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from config import settings
from deps.auth import get_current_user
from services import auth_service
from services.rate_limit import rate_limit

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str | None = None
    accept_privacy: bool
    accept_terms: bool
    accept_risk_ack: bool = False
    marketing_consent: bool = False
    anonymous_user_id: str | None = None
    acquisition_channel: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TwoFactorVerifyRequest(BaseModel):
    pending_token: str
    code: str = Field(min_length=6, max_length=8)


class TwoFactorConfirmRequest(BaseModel):
    code: str = Field(min_length=6, max_length=8)


class TwoFactorDisableRequest(BaseModel):
    code: str = Field(min_length=6, max_length=8)
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)


class DeleteAccountRequest(BaseModel):
    password: str
    confirmation: str


@router.post("/register")
async def register(body: RegisterRequest, request: Request):
    rate_limit(request, key="auth-register", limit=8)
    try:
        return auth_service.register_user(
            body.email,
            body.password,
            display_name=body.display_name,
            accept_privacy=body.accept_privacy,
            accept_terms=body.accept_terms,
            accept_risk_ack=body.accept_risk_ack,
            marketing_consent=body.marketing_consent,
            anonymous_user_id=body.anonymous_user_id,
            acquisition_channel=body.acquisition_channel,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/login")
async def login(body: LoginRequest, request: Request):
    rate_limit(request, key="auth-login", limit=12)
    try:
        return auth_service.login_user(body.email, body.password)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.post("/login/2fa")
async def login_2fa(body: TwoFactorVerifyRequest):
    try:
        return auth_service.verify_2fa_login(body.pending_token, body.code)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.post("/refresh")
async def refresh(body: RefreshRequest):
    result = auth_service.refresh_access_token(body.refresh_token)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    access, refresh_token = result
    return {
        "accessToken": access,
        "refreshToken": refresh_token,
        "expiresIn": settings.jwt_access_expire_minutes * 60,
    }


@router.post("/logout")
async def logout(body: LogoutRequest):
    auth_service.logout(body.refresh_token)
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    profile = auth_service.user_public_profile(user["user_id"])
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile


@router.post("/2fa/setup")
async def setup_2fa(user: dict = Depends(get_current_user)):
    try:
        return auth_service.setup_totp(user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/2fa/confirm")
async def confirm_2fa(body: TwoFactorConfirmRequest, user: dict = Depends(get_current_user)):
    try:
        auth_service.confirm_totp(user["user_id"], body.code)
        return {"ok": True, "totpEnabled": True}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/2fa/disable")
async def disable_2fa(body: TwoFactorDisableRequest, user: dict = Depends(get_current_user)):
    try:
        auth_service.disable_totp(user["user_id"], body.code, body.password)
        return {"ok": True, "totpEnabled": False}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, request: Request):
    rate_limit(request, key="auth-forgot", limit=6)
    return auth_service.request_password_reset(body.email)


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, request: Request):
    rate_limit(request, key="auth-reset", limit=8)
    try:
        auth_service.reset_password(body.token, body.password)
        return {"ok": True, "message": "Password updated. You can sign in now."}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/export")
async def export_account(user: dict = Depends(get_current_user)):
    try:
        return auth_service.export_account(user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/delete-account")
async def delete_account(body: DeleteAccountRequest, user: dict = Depends(get_current_user)):
    try:
        auth_service.delete_account(user["user_id"], body.password, body.confirmation)
        return {"ok": True, "message": "Account deleted"}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
