"""Internal routes for Next.js site ↔ FastAPI sync (not for public browsers)."""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, EmailStr

from config import settings
from db import get_user_by_email, record_usage_event
from services import auth_service
from services.site_entitlements import sync_site_user_entitlements

router = APIRouter(prefix="/api/internal", tags=["internal"])

SITE_MARKET_TO_BACKEND = {
    "stocks": "trades",
    "crypto": "crypto",
    "pink_slips": "penny",
    "sports_betting": "betting",
    "prediction_markets": "predictions",
}


class SyncSiteUserRequest(BaseModel):
    email: EmailStr
    display_name: str | None = None
    intelligence_tier: str = "lite"
    selected_markets: list[str] = []
    subscription_active: bool = False


class FeedbackRequest(BaseModel):
    email: EmailStr
    kind: str
    message: str
    page_path: str | None = None


def _verify_sync_secret(x_backend_sync_secret: str | None) -> None:
    expected = (settings.backend_sync_secret or "").strip()
    if not expected or x_backend_sync_secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/sync-site-user")
async def sync_site_user(
    body: SyncSiteUserRequest,
    x_backend_sync_secret: str | None = Header(default=None),
):
    """Provision or refresh SQLite user from Supabase site session."""
    _verify_sync_secret(x_backend_sync_secret)
    result = auth_service.provision_site_user(body.email, display_name=body.display_name)
    try:
        sync_site_user_entitlements(
            result["user_id"],
            intelligence_tier=body.intelligence_tier or "lite",
            selected_markets=body.selected_markets,
            subscription_active=body.subscription_active,
        )
    except Exception:
        import logging

        logging.getLogger(__name__).exception(
            "entitlements sync failed for %s — tokens still issued", body.email
        )
    return result


@router.post("/feedback")
async def site_feedback(
    body: FeedbackRequest,
    x_backend_sync_secret: str | None = Header(default=None),
):
    _verify_sync_secret(x_backend_sync_secret)
    row = get_user_by_email(body.email)
    user_id = row["user_id"] if row else None
    record_usage_event(
        user_id,
        "feedback",
        body.kind,
        body.page_path or "/feedback",
        200,
        0.0,
    )
    return {"ok": True}
