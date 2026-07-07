"""Sync intelligence tier + module access from the Next.js site into FastAPI."""

from __future__ import annotations

from services.tier_billing import activate_tier_plan, deactivate_tier_subscription
from services.tier_entitlements import ALL_MARKET_MODULES

SITE_MARKET_TO_BACKEND = {
    "stocks": "trades",
    "crypto": "crypto",
    "pink_slips": "penny",
    "sports_betting": "betting",
    "prediction_markets": "predictions",
}


def map_site_markets_to_backend(selected_markets: list[str]) -> list[str]:
    mapped: list[str] = []
    for market in selected_markets:
        backend = SITE_MARKET_TO_BACKEND.get(market)
        if backend and backend not in mapped:
            mapped.append(backend)
    return mapped


def sync_site_user_entitlements(
    user_id: str,
    *,
    intelligence_tier: str,
    selected_markets: list[str],
    subscription_active: bool,
    is_admin: bool = False,
) -> dict:
    """Apply site plan state to backend module subscriptions."""
    tier = intelligence_tier or "lite"
    backend_markets = map_site_markets_to_backend(selected_markets)

    if is_admin:
        return activate_tier_plan(user_id, "elite", list(ALL_MARKET_MODULES), payment_method="comp")

    if not subscription_active:
        deactivate_tier_subscription(user_id, tier)
        return {"tier": "lite", "selectedMarkets": [], "allowedMarkets": []}

    if tier == "elite":
        return activate_tier_plan(user_id, "elite", list(ALL_MARKET_MODULES), payment_method="comp")

    if tier in ("ultra", "ultra_plus"):
        return activate_tier_plan(user_id, tier, list(ALL_MARKET_MODULES), payment_method="comp")

    if not backend_markets:
        # Comp access without explicit picks — default to the tier minimum.
        pick_count = {"lite": 1, "pro": 2}.get(tier, 1)
        backend_markets = list(ALL_MARKET_MODULES)[:pick_count]

    return activate_tier_plan(user_id, tier, backend_markets, payment_method="comp")
