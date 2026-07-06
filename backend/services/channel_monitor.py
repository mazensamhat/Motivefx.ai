"""Marketing channel performance aggregates."""

from __future__ import annotations

from db import get_conn, list_marketing_channels
from services.admin_analytics import _days_ago


def get_channel_performance(days: int = 90) -> dict:
    channels = list_marketing_channels()
    since = _days_ago(days)
    with get_conn() as conn:
        signup_rows = conn.execute(
            """
            SELECT acquisition_channel AS channel_id, COUNT(*) AS signups
            FROM users
            WHERE acquisition_channel IS NOT NULL AND created_at >= ?
            GROUP BY acquisition_channel
            """,
            (since,),
        ).fetchall()
        touch_rows = conn.execute(
            """
            SELECT channel_id, event_type, COUNT(*) AS cnt, SUM(amount_usd) AS revenue
            FROM channel_touchpoints
            WHERE created_at >= ?
            GROUP BY channel_id, event_type
            """,
            (since,),
        ).fetchall()

    signup_map = {r["channel_id"]: r["signups"] for r in signup_rows}
    touch_map: dict[str, dict] = {}
    for r in touch_rows:
        cid = r["channel_id"]
        touch_map.setdefault(cid, {"payments": 0, "churns": 0, "revenue": 0.0, "subscriptions": 0, "visits": 0})
        if r["event_type"] == "payment":
            touch_map[cid]["payments"] = r["cnt"]
            touch_map[cid]["revenue"] = r["revenue"] or 0
        elif r["event_type"] == "subscription":
            touch_map[cid]["subscriptions"] = r["cnt"]
        elif r["event_type"] == "churn":
            touch_map[cid]["churns"] = r["cnt"]
        elif r["event_type"] == "visit":
            touch_map.setdefault(cid, {"payments": 0, "churns": 0, "revenue": 0.0, "subscriptions": 0, "visits": 0})
            touch_map[cid]["visits"] = r["cnt"]

    ranked = []
    for ch in channels:
        cid = ch["id"]
        stats = touch_map.get(cid, {})
        signups = signup_map.get(cid, 0)
        revenue = stats.get("revenue", 0) or 0
        visits = stats.get("visits", 0)
        from db import get_latest_social_metrics

        social = get_latest_social_metrics(cid) if cid in (
            "instagram", "tiktok", "facebook", "youtube", "x", "website"
        ) else None
        ranked.append(
            {
                **ch,
                "visits": visits,
                "signups": signups,
                "subscriptions": stats.get("subscriptions", 0),
                "payments": stats.get("payments", 0),
                "churns": stats.get("churns", 0),
                "revenueUsd": round(revenue, 2),
                "conversionRate": round((stats.get("payments", 0) / max(signups, 1) * 100) if signups else 0, 1),
                "visitToSignupRate": round((signups / max(visits, 1) * 100) if visits else 0, 1),
                "socialFollowers": (social or {}).get("followers"),
                "socialImpressions": (social or {}).get("impressions"),
                "socialLinkClicks": (social or {}).get("link_clicks"),
                "lastSocialSync": (social or {}).get("synced_at"),
            }
        )

    ranked.sort(key=lambda x: x["revenueUsd"], reverse=True)
    top = ranked[0]["id"] if ranked and ranked[0]["revenueUsd"] > 0 else None

    return {
        "days": days,
        "topRevenueChannel": top,
        "channels": ranked,
    }
