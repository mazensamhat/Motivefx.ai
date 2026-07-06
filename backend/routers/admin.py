"""Admin analytics API — subscription monitoring, module health, demographics."""

from pydantic import BaseModel

from fastapi import APIRouter, Depends, Header, HTTPException, Query

from config import settings
from services import admin_analytics, admin_ai
from services.channel_monitor import get_channel_performance

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(x_admin_key: str = Header(default="", alias="X-Admin-Key")) -> None:
    if not settings.admin_api_key:
        raise HTTPException(503, "Admin API not configured")
    if x_admin_key != settings.admin_api_key:
        raise HTTPException(401, "Invalid admin key")


@router.get("/dashboard")
async def admin_dashboard(_: None = Depends(require_admin)):
    return admin_analytics.get_dashboard_snapshot()


@router.get("/ai-analysis")
async def admin_ai_analysis(_: None = Depends(require_admin)):
    snapshot = admin_analytics.get_dashboard_snapshot()
    analysis = await admin_ai.analyze_ops_dashboard(snapshot)
    return {"snapshot": snapshot, "analysis": analysis}


@router.get("/channels")
async def admin_channels(_: None = Depends(require_admin)):
    from db import list_marketing_channels

    return {"channels": list_marketing_channels()}


@router.get("/channels/performance")
async def admin_channel_performance(
    days: int = Query(default=90, ge=1, le=365),
    _: None = Depends(require_admin),
):
    return get_channel_performance(days=days)


class ChannelUpdateRequest(BaseModel):
    handle: str | None = None
    url: str | None = None
    active: bool | None = None


@router.patch("/channels/{channel_id}")
async def update_channel(
    channel_id: str,
    body: ChannelUpdateRequest,
    _: None = Depends(require_admin),
):
    from db import get_conn, _utc_now

    fields = []
    params: list = []
    if body.handle is not None:
        fields.append("handle = ?")
        params.append(body.handle)
    if body.url is not None:
        fields.append("url = ?")
        params.append(body.url)
    if body.active is not None:
        fields.append("active = ?")
        params.append(1 if body.active else 0)
    if not fields:
        raise HTTPException(400, "No fields to update")
    params.append(channel_id)
    with get_conn() as conn:
        conn.execute(f"UPDATE marketing_channels SET {', '.join(fields)} WHERE id = ?", params)
    return {"ok": True}


@router.get("/subscriptions")
async def admin_subscriptions(_: None = Depends(require_admin)):
    from db import get_subscription_rows

    return {"subscriptions": get_subscription_rows(active_only=False)}


@router.get("/modules/health")
async def admin_module_health(_: None = Depends(require_admin)):
    return {"modules": admin_analytics.get_module_health()}


@router.get("/modules/activity")
async def admin_module_activity(
    days: int = Query(default=30, ge=1, le=90),
    _: None = Depends(require_admin),
):
    return {
        "ranking": admin_analytics.get_module_activity_ranking(days=days),
        "heatmap": admin_analytics.get_activity_heatmap(days=min(days, 14)),
    }


@router.get("/churn")
async def admin_churn(
    days: int = Query(default=30, ge=1, le=365),
    _: None = Depends(require_admin),
):
    return {"churnByModule": admin_analytics.get_churn_by_module(days=days)}


@router.get("/demographics")
async def admin_demographics(_: None = Depends(require_admin)):
    return admin_analytics.get_demographics_breakdown()


@router.get("/payments")
async def admin_payments(
    days: int = Query(default=90, ge=1, le=365),
    _: None = Depends(require_admin),
):
    return admin_analytics.get_payments_summary(days=days)


@router.get("/users")
async def admin_users(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    _: None = Depends(require_admin),
):
    return {"users": admin_analytics.list_users_paginated(offset=offset, limit=limit)}


@router.post("/seed-demo-analytics")
async def seed_demo_analytics(
    user_count: int = Query(default=48, ge=5, le=200),
    _: None = Depends(require_admin),
):
    result = admin_analytics.seed_demo_analytics(user_count=user_count)
    return {"ok": True, "created": result, "dashboard": admin_analytics.get_dashboard_snapshot()}


class SocialCredentialsRequest(BaseModel):
    channel_id: str
    account_id: str | None = None
    access_token: str | None = None


@router.get("/social/integrations")
async def social_integrations(_: None = Depends(require_admin)):
    from services.social_sync import get_integrations_status

    return {"integrations": get_integrations_status()}


@router.post("/social/credentials")
async def save_social_credentials(body: SocialCredentialsRequest, _: None = Depends(require_admin)):
    from db import save_social_credentials as save_creds

    if body.channel_id not in ("instagram", "tiktok", "facebook", "youtube", "x", "website"):
        raise HTTPException(400, "Invalid social channel")
    save_creds(
        body.channel_id,
        account_id=body.account_id,
        access_token=body.access_token,
        connection_status="configured",
    )
    from services.social_sync import get_integrations_status

    return {"ok": True, "integrations": get_integrations_status()}


@router.post("/social/sync")
async def sync_all_social(_: None = Depends(require_admin)):
    from services.social_sync import sync_all_channels, get_integrations_status

    results = await sync_all_channels()
    return {"ok": True, "results": results, "integrations": get_integrations_status()}


@router.post("/social/sync/{channel_id}")
async def sync_one_social(channel_id: str, _: None = Depends(require_admin)):
    from services.social_sync import sync_channel, get_integrations_status

    result = await sync_channel(channel_id)
    return {"ok": result.get("ok", False), "result": result, "integrations": get_integrations_status()}
