from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from db import (
    add_intel_journal_entry,
    add_watchlist_item,
    delete_intel_journal_entry,
    get_user_plan,
    get_user_record,
    list_intel_alerts,
    list_intel_journal,
    list_watchlist,
    mark_all_intel_alerts_seen,
    mark_intel_alert_seen,
    remove_watchlist_item,
    upsert_intel_alerts,
)
from deps.access import ensure_user_match, get_current_user_strict
from deps.modules import require_module
from deps.tiers import require_feature
from services.home_briefing import build_home_briefing
from services.tier_entitlements import filter_briefing_for_plan

router = APIRouter(prefix="/api/home", tags=["home"])

WATCHLIST_MODULES = {"trades", "crypto", "penny", "betting", "predictions"}


class WatchlistAddRequest(BaseModel):
    user_id: str
    module: str
    symbol: str = Field(min_length=1, max_length=64)


class JournalAddRequest(BaseModel):
    user_id: str
    note: str = Field(min_length=1, max_length=2000)
    module: str | None = None
    symbol: str | None = None
    signal_title: str | None = None


@router.get("/briefing")
async def home_briefing(user_id: str = Query(default="demo")):
    """MotiveFX Home command center — score, opportunities, module pulse, radar intel."""
    display_name = None
    plan = None
    if user_id and user_id != "demo":
        row = get_user_record(user_id)
        if row:
            display_name = row.get("display_name") or row.get("email", "").split("@")[0]
        plan = get_user_plan(user_id)
    briefing = await build_home_briefing(display_name, user_id)
    if plan:
        briefing = filter_briefing_for_plan(briefing, plan)
    if user_id and user_id != "demo" and plan and plan["features"].get("push_notifications"):
        now = datetime.now(timezone.utc).isoformat()
        radar = briefing.get("personalized", {}).get("radarHits") or []
        alerts = [
            {
                "module": h.get("module"),
                "symbol": h.get("symbol"),
                "title": f"Radar hit: {h.get('symbol')}",
                "body": h.get("title"),
                "confidence": h.get("confidence"),
                "alertKey": f"radar-{h.get('id', h.get('symbol'))}",
            }
            for h in radar
        ]
        for o in briefing.get("opportunities", [])[:3]:
            alerts.append(
                {
                    "module": o.get("module"),
                    "symbol": o.get("symbol"),
                    "title": f"Top signal: {o.get('symbol')}",
                    "body": o.get("title"),
                    "confidence": o.get("confidence"),
                    "alertKey": f"signal-{o.get('id')}",
                }
            )
        if alerts:
            upsert_intel_alerts(user_id, alerts, now)
        briefing["alertUnreadCount"] = sum(1 for a in list_intel_alerts(user_id) if not a["seen"])
    elif user_id and user_id != "demo":
        briefing["alertUnreadCount"] = 0
    return briefing


@router.get("/watchlist/{user_id}")
async def get_watchlist(user_id: str, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, user_id)
    return {"items": list_watchlist(user_id)}


@router.post("/watchlist")
async def post_watchlist(body: WatchlistAddRequest, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    mod = body.module.lower()
    if mod not in WATCHLIST_MODULES:
        from fastapi import HTTPException

        raise HTTPException(400, f"Module must be one of: {', '.join(sorted(WATCHLIST_MODULES))}")
    require_module(body.user_id, mod)
    now = datetime.now(timezone.utc).isoformat()
    add_watchlist_item(body.user_id, mod, body.symbol, now)
    return {"saved": True, "items": list_watchlist(body.user_id)}


@router.delete("/watchlist/{user_id}/{module}/{symbol}")
async def delete_watchlist_item(
    user_id: str,
    module: str,
    symbol: str,
    user: dict = Depends(get_current_user_strict),
):
    ensure_user_match(user, user_id)
    remove_watchlist_item(user_id, module.lower(), symbol)
    return {"removed": True, "items": list_watchlist(user_id)}


@router.get("/journal/{user_id}")
async def get_journal(user_id: str, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, user_id)
    require_feature(user_id, "decision_history")
    return {"entries": list_intel_journal(user_id)}


@router.post("/journal")
async def post_journal(body: JournalAddRequest, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    require_feature(body.user_id, "decision_history")
    now = datetime.now(timezone.utc).isoformat()
    entry_id = add_intel_journal_entry(
        body.user_id,
        body.note,
        module=body.module,
        symbol=body.symbol,
        signal_title=body.signal_title,
        now=now,
    )
    return {"saved": True, "id": entry_id, "entries": list_intel_journal(body.user_id)}


@router.delete("/journal/{user_id}/{entry_id}")
async def delete_journal_entry(
    user_id: str,
    entry_id: int,
    user: dict = Depends(get_current_user_strict),
):
    ensure_user_match(user, user_id)
    require_feature(user_id, "decision_history")
    if not delete_intel_journal_entry(user_id, entry_id):
        raise HTTPException(404, "Journal entry not found")
    return {"removed": True, "entries": list_intel_journal(user_id)}


@router.get("/alerts/{user_id}")
async def get_alerts(user_id: str, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, user_id)
    require_feature(user_id, "push_notifications")
    alerts = list_intel_alerts(user_id)
    unread = sum(1 for a in alerts if not a["seen"])
    return {"alerts": alerts, "unreadCount": unread}


@router.post("/alerts/{user_id}/{alert_id}/seen")
async def post_alert_seen(
    user_id: str,
    alert_id: int,
    user: dict = Depends(get_current_user_strict),
):
    ensure_user_match(user, user_id)
    require_feature(user_id, "push_notifications")
    if not mark_intel_alert_seen(user_id, alert_id):
        raise HTTPException(404, "Alert not found")
    alerts = list_intel_alerts(user_id)
    return {"seen": True, "alerts": alerts, "unreadCount": sum(1 for a in alerts if not a["seen"])}


@router.post("/alerts/{user_id}/seen-all")
async def post_alerts_seen_all(user_id: str, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, user_id)
    require_feature(user_id, "push_notifications")
    mark_all_intel_alerts_seen(user_id)
    alerts = list_intel_alerts(user_id)
    return {"seenAll": True, "alerts": alerts, "unreadCount": 0}
