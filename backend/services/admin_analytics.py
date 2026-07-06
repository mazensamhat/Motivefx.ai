"""Admin analytics aggregates, heatmaps, and demo seed data."""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from typing import Any

from config import settings
from db import (
    get_conn,
    record_payment_event,
    record_usage_event,
    set_module_access,
    upsert_user_profile,
)

MODULES = ("trades", "crypto", "betting", "penny", "predictions")
CHANNELS = ("instagram", "tiktok", "facebook", "website", "youtube", "x", "referral", "other")
COHORTS = ("genz", "millennial", "genx", "boomer")
SEXES = ("female", "male", "non-binary", "prefer_not_to_say")
GENDERS = ("woman", "man", "non-binary", "prefer_not_to_say")
PAYMENT_METHODS = ("card", "apple_pay", "google_pay", "paypal", "bank_transfer")
PLAN_TIERS = ("monthly", "annual", "bundle", "trial")
CITIES = [
    ("US", "NY", "New York"),
    ("US", "CA", "Los Angeles"),
    ("US", "TX", "Austin"),
    ("US", "FL", "Miami"),
    ("US", "IL", "Chicago"),
    ("GB", "England", "London"),
    ("CA", "ON", "Toronto"),
    ("DE", "BY", "Munich"),
    ("AU", "NSW", "Sydney"),
    ("SG", "SG", "Singapore"),
]

ACTIONS = ("view_activity", "analyze", "portfolio_save", "subscribe", "deep_dive", "news_read")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _days_ago(n: int) -> str:
    return (_utc_now() - timedelta(days=n)).isoformat()


def seed_demo_analytics(user_count: int = 48) -> dict[str, int]:
    """Populate synthetic users, subscriptions, usage, payments for admin dashboard demos."""
    random.seed(42)
    created = {"users": 0, "subscriptions": 0, "usage_events": 0, "payments": 0, "cancellations": 0}

    for i in range(user_count):
        uid = f"demo_u_{i:03d}"
        country, region, city = random.choice(CITIES)
        cohort = random.choice(COHORTS)
        age = random.randint(22, 72)
        sex = random.choice(SEXES)
        gender = random.choice(GENDERS)
        pay_method = random.choice(PAYMENT_METHODS)
        channel = random.choices(
            CHANNELS,
            weights=[30, 25, 15, 20, 5, 3, 1, 1],
        )[0]

        upsert_user_profile(
            uid,
            email=f"user{i}@demo.motivefx.ai",
            display_name=f"Demo User {i}",
            age=age,
            sex=sex,
            gender=gender,
            cohort=cohort,
            country=country,
            region=region,
            city=city,
            payment_method=pay_method,
            acquisition_channel=channel,
        )
        created["users"] += 1

        # Subscription mix
        if i % 7 == 0:
            set_module_access(uid, "annual", True, plan_tier="annual", payment_method=pay_method, amount_usd=799)
            for m in MODULES:
                set_module_access(uid, m, True, plan_tier="annual", payment_method=pay_method)
            record_payment_event(uid, 799, payment_method=pay_method, plan_tier="annual", module="annual")
            created["payments"] += 1
            created["subscriptions"] += 6
        elif i % 5 == 0:
            for m in MODULES:
                set_module_access(uid, m, True, plan_tier="bundle", payment_method=pay_method, amount_usd=109)
            record_payment_event(uid, 109, payment_method=pay_method, plan_tier="bundle", module="bundle")
            created["payments"] += 1
            created["subscriptions"] += 5
        else:
            mods = random.sample(MODULES, k=random.randint(1, 3))
            for m in mods:
                set_module_access(uid, m, True, plan_tier="monthly", payment_method=pay_method, amount_usd=29)
                created["subscriptions"] += 1
            record_payment_event(uid, 29 * len(mods), payment_method=pay_method, plan_tier="monthly", module=mods[0])
            created["payments"] += 1

        # Churn ~12%
        if random.random() < 0.12:
            churn_mod = random.choice(MODULES)
            set_module_access(uid, churn_mod, False, plan_tier="monthly", payment_method=pay_method)
            created["cancellations"] += 1

        # Usage events over 14 days — weighted by module popularity
        module_weights = {"trades": 28, "crypto": 22, "betting": 18, "penny": 14, "predictions": 18}
        for day in range(14):
            for _ in range(random.randint(1, 8)):
                mod = random.choices(list(module_weights.keys()), weights=list(module_weights.values()))[0]
                action = random.choice(ACTIONS)
                ts = (_utc_now() - timedelta(days=day, hours=random.randint(0, 23))).isoformat()
                with get_conn() as conn:
                    conn.execute(
                        """
                        INSERT INTO usage_events (user_id, module, action, endpoint, status_code, duration_ms, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        (uid, mod, action, f"/api/{mod}/activity", 200, random.uniform(20, 400), ts),
                    )
                created["usage_events"] += 1

    return created


def get_dashboard_snapshot() -> dict[str, Any]:
    with get_conn() as conn:
        total_users = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
        active_subs = conn.execute(
            "SELECT COUNT(*) AS c FROM module_subscriptions WHERE active = 1 AND module NOT IN ('annual', 'bundle')"
        ).fetchone()["c"]
        annual_count = conn.execute(
            "SELECT COUNT(DISTINCT user_id) AS c FROM module_subscriptions WHERE module = 'annual' AND active = 1"
        ).fetchone()["c"]
        mrr = _estimate_mrr(conn)
        usage_24h = conn.execute(
            "SELECT COUNT(*) AS c FROM usage_events WHERE created_at >= ?",
            (_days_ago(1),),
        ).fetchone()["c"]
        churn_30d = conn.execute(
            """
            SELECT COUNT(*) AS c FROM subscription_events
            WHERE event_type = 'cancel' AND created_at >= ?
            """,
            (_days_ago(30),),
        ).fetchone()["c"]

    return {
        "generatedAt": _utc_now().isoformat(),
        "kpis": {
            "totalUsers": total_users,
            "activeModuleSubscriptions": active_subs,
            "annualSubscribers": annual_count,
            "estimatedMrrUsd": round(mrr, 2),
            "usageEvents24h": usage_24h,
            "churnEvents30d": churn_30d,
            "annualPriceUsd": settings.annual_price_usd,
        },
        "subscriptionsByModule": _subscriptions_by_module(),
        "moduleHealth": get_module_health(),
        "activityHeatmap": get_activity_heatmap(days=14),
        "moduleActivityRanking": get_module_activity_ranking(days=30),
        "churnByModule": get_churn_by_module(days=30),
        "demographics": get_demographics_breakdown(),
        "payments": get_payments_summary(days=90),
        "recentUsers": _recent_users(limit=20),
        "channelPerformance": _channel_performance(),
    }


def _channel_performance() -> dict:
    from services.channel_monitor import get_channel_performance

    return get_channel_performance(days=90)


def _estimate_mrr(conn) -> float:
    rows = conn.execute(
        """
        SELECT module, plan_tier, COUNT(*) AS cnt
        FROM module_subscriptions
        WHERE active = 1 AND module IN ('trades', 'crypto', 'betting', 'penny', 'predictions')
        GROUP BY module, plan_tier
        """
    ).fetchall()
    annual_users = conn.execute(
        "SELECT COUNT(DISTINCT user_id) AS c FROM module_subscriptions WHERE module = 'annual' AND active = 1"
    ).fetchone()["c"]
    mrr = annual_users * (settings.annual_price_usd / 12)
    bundle_users = conn.execute(
        """
        SELECT COUNT(DISTINCT user_id) AS c FROM module_subscriptions
        WHERE active = 1 AND plan_tier = 'bundle'
        """
    ).fetchone()["c"]
    mrr += bundle_users * settings.bundle_price_usd
    monthly_rows = [r for r in rows if r["plan_tier"] in (None, "monthly", "trial")]
    mrr += sum(r["cnt"] for r in monthly_rows) * 29
    return mrr


def _subscriptions_by_module() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT module,
                   SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS active,
                   SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END) AS inactive
            FROM module_subscriptions
            WHERE module IN ('trades', 'crypto', 'betting', 'penny', 'predictions', 'annual', 'bundle')
            GROUP BY module
            ORDER BY active DESC
            """
        ).fetchall()
    return [dict(r) for r in rows]


def get_module_health() -> list[dict]:
    from config import settings as cfg

    feeds = {
        "trades": {"label": "Trades / Stocks", "feedKey": "finnhub", "ok": bool(cfg.finnhub_api_key)},
        "crypto": {"label": "Crypto Whales", "feedKey": "coinstats", "ok": bool(cfg.coinstats_api_key)},
        "betting": {"label": "Sports Lines", "feedKey": "the_odds_api", "ok": bool(cfg.the_odds_api_key)},
        "penny": {"label": "Penny Scanner", "feedKey": "yfinance", "ok": True},
        "predictions": {"label": "Prediction Markets", "feedKey": "demo", "ok": True},
    }
    with get_conn() as conn:
        for mod, meta in feeds.items():
            row = conn.execute(
                """
                SELECT COUNT(*) AS c,
                       AVG(duration_ms) AS avg_ms,
                       SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS errors
                FROM usage_events
                WHERE module = ? AND created_at >= ?
                """,
                (mod, _days_ago(7)),
            ).fetchone()
            meta["usage7d"] = row["c"] or 0
            meta["avgLatencyMs"] = round(row["avg_ms"] or 0, 1)
            meta["errors7d"] = row["errors"] or 0
            meta["status"] = "healthy" if meta["ok"] and (row["errors"] or 0) < 10 else "degraded"
    return [{"module": k, **v} for k, v in feeds.items()]


def get_activity_heatmap(days: int = 14) -> dict[str, Any]:
    """Module × day grid for heatmap visualization."""
    start = _days_ago(days)
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT date(created_at) AS day, module, COUNT(*) AS cnt
            FROM usage_events
            WHERE created_at >= ? AND module IS NOT NULL
            GROUP BY day, module
            ORDER BY day ASC
            """,
            (start,),
        ).fetchall()

    day_labels: list[str] = []
    for i in range(days - 1, -1, -1):
        day_labels.append((_utc_now() - timedelta(days=i)).strftime("%Y-%m-%d"))

    grid: dict[str, dict[str, int]] = {m: {d: 0 for d in day_labels} for m in MODULES}
    max_val = 0
    for r in rows:
        mod = r["module"]
        day = r["day"]
        if mod in grid and day in grid[mod]:
            grid[mod][day] = r["cnt"]
            max_val = max(max_val, r["cnt"])

    return {"days": day_labels, "modules": list(MODULES), "cells": grid, "max": max_val}


def get_module_activity_ranking(days: int = 30) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT module, COUNT(*) AS events, COUNT(DISTINCT user_id) AS unique_users
            FROM usage_events
            WHERE created_at >= ? AND module IS NOT NULL
            GROUP BY module
            ORDER BY events DESC
            """,
            (_days_ago(days),),
        ).fetchall()
    return [dict(r) for r in rows]


def get_churn_by_module(days: int = 30) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT module, COUNT(*) AS cancellations
            FROM subscription_events
            WHERE event_type = 'cancel' AND created_at >= ?
            GROUP BY module
            ORDER BY cancellations DESC
            """,
            (_days_ago(days),),
        ).fetchall()
    return [dict(r) for r in rows]


def get_demographics_breakdown() -> dict[str, Any]:
    with get_conn() as conn:
        cohort_rows = conn.execute(
            "SELECT cohort, COUNT(*) AS c FROM users WHERE cohort IS NOT NULL GROUP BY cohort"
        ).fetchall()
        sex_rows = conn.execute(
            "SELECT sex, COUNT(*) AS c FROM users WHERE sex IS NOT NULL GROUP BY sex"
        ).fetchall()
        gender_rows = conn.execute(
            "SELECT gender, COUNT(*) AS c FROM users WHERE gender IS NOT NULL GROUP BY gender"
        ).fetchall()
        age_rows = conn.execute(
            """
            SELECT
              CASE
                WHEN age < 30 THEN '18-29'
                WHEN age < 46 THEN '30-45'
                WHEN age < 62 THEN '46-61'
                ELSE '62+'
              END AS bucket,
              COUNT(*) AS c
            FROM users WHERE age IS NOT NULL
            GROUP BY bucket
            """
        ).fetchall()
        location_rows = conn.execute(
            """
            SELECT country, region, city, COUNT(*) AS c
            FROM users
            WHERE country IS NOT NULL
            GROUP BY country, region, city
            ORDER BY c DESC
            LIMIT 15
            """
        ).fetchall()
        pay_rows = conn.execute(
            "SELECT payment_method, COUNT(*) AS c FROM users WHERE payment_method IS NOT NULL GROUP BY payment_method"
        ).fetchall()

    return {
        "cohorts": [dict(r) for r in cohort_rows],
        "sex": [dict(r) for r in sex_rows],
        "gender": [dict(r) for r in gender_rows],
        "ageBuckets": [dict(r) for r in age_rows],
        "topLocations": [dict(r) for r in location_rows],
        "paymentMethods": [dict(r) for r in pay_rows],
    }


def get_payments_summary(days: int = 90) -> dict[str, Any]:
    with get_conn() as conn:
        totals = conn.execute(
            """
            SELECT
              SUM(amount_usd) AS revenue,
              COUNT(*) AS transactions,
              AVG(amount_usd) AS avg_ticket
            FROM payment_events
            WHERE status = 'succeeded' AND created_at >= ?
            """,
            (_days_ago(days),),
        ).fetchone()
        by_tier = conn.execute(
            """
            SELECT plan_tier, SUM(amount_usd) AS revenue, COUNT(*) AS cnt
            FROM payment_events
            WHERE status = 'succeeded' AND created_at >= ?
            GROUP BY plan_tier
            """,
            (_days_ago(days),),
        ).fetchall()
        by_method = conn.execute(
            """
            SELECT payment_method, SUM(amount_usd) AS revenue, COUNT(*) AS cnt
            FROM payment_events
            WHERE status = 'succeeded' AND created_at >= ?
            GROUP BY payment_method
            """,
            (_days_ago(days),),
        ).fetchall()
        recent = conn.execute(
            """
            SELECT user_id, amount_usd, payment_method, plan_tier, module, status, created_at
            FROM payment_events
            ORDER BY created_at DESC
            LIMIT 25
            """
        ).fetchall()

    return {
        "revenueUsd": round(totals["revenue"] or 0, 2),
        "transactions": totals["transactions"] or 0,
        "avgTicketUsd": round(totals["avg_ticket"] or 0, 2),
        "byPlanTier": [dict(r) for r in by_tier],
        "byPaymentMethod": [dict(r) for r in by_method],
        "recent": [dict(r) for r in recent],
    }


def _recent_users(limit: int = 20) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT u.*,
                   (SELECT GROUP_CONCAT(module) FROM module_subscriptions s
                    WHERE s.user_id = u.user_id AND s.active = 1) AS active_modules
            FROM users u
            ORDER BY u.last_seen_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def list_users_paginated(offset: int = 0, limit: int = 50) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT u.*,
                   (SELECT GROUP_CONCAT(module) FROM module_subscriptions s
                    WHERE s.user_id = u.user_id AND s.active = 1) AS active_modules
            FROM users u
            ORDER BY u.last_seen_at DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        ).fetchall()
    return [dict(r) for r in rows]
